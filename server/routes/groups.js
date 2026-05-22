import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { interpretPlate, scoreGroupGuesses } from '../lib/openai.js'
import { requireAuth, optionalAuth } from '../lib/auth.js'
import { interpretLimiter } from '../lib/limiters.js'
import supabase from '../lib/supabase.js'

const router = Router()

function makeCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

// GET /groups — List user's groups
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('group_members')
      .select('groups(id, name, code, mode, owner_id, created_at)')
      .eq('user_id', req.user.id)
    res.json((data || []).map(d => d.groups).filter(Boolean))
  } catch (err) {
    next(err)
  }
})

// POST /groups — Create a group
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, mode = 'plates' } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })

    const group = { id: uuidv4(), name: name.trim(), code: makeCode(), owner_id: req.user.id, mode }
    await supabase.from('groups').insert(group)
    await supabase.from('group_members').insert({ group_id: group.id, user_id: req.user.id })

    res.json(group)
  } catch (err) {
    next(err)
  }
})

// POST /groups/join — Join by code
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body
    const { data: group } = await supabase.from('groups').select('*').eq('code', code).single()
    if (!group) return res.status(404).json({ error: 'Group not found' })

    await supabase.from('group_members').upsert({ group_id: group.id, user_id: req.user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
    res.json(group)
  } catch (err) {
    next(err)
  }
})

// POST /groups/daily-sync — Sync daily challenge result to all daily-mode groups
// IMPORTANT: must be before /:id routes so 'daily-sync' isn't treated as an ID
router.post('/daily-sync', requireAuth, async (req, res, next) => {
  try {
    const { score = 0, timeSeconds = 0, date, guess } = req.body
    const speedBonus = Math.max(0, Math.round(100 * Math.max(0, 1 - timeSeconds / 300)))
    const totalScore = score + speedBonus

    // Find all daily groups this user belongs to
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, groups(mode)')
      .eq('user_id', req.user.id)

    const dailyGroups = (memberships || []).filter(m => m.groups?.mode === 'daily').map(m => m.group_id)

    for (const gid of dailyGroups) {
      await supabase.from('group_daily_results').upsert({
        group_id: gid,
        user_id: req.user.id,
        date: date || new Date().toDateString(),
        base_score: score,
        speed_bonus: speedBonus,
        total_score: totalScore,
        time_seconds: timeSeconds,
        guess: guess || '',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'group_id,user_id,date', ignoreDuplicates: true })
    }

    res.json({ ok: true, synced: dailyGroups.length })
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id/members — List members of a group
router.get('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, joined_at, users(display_name)')
      .eq('group_id', req.params.id)
      .order('joined_at', { ascending: true })

    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', req.params.id)
      .single()

    res.json((data || []).map(m => ({
      userId:    m.user_id,
      username:  m.users?.display_name || 'Anonymous',
      joinedAt:  m.joined_at,
      isCreator: m.user_id === group?.owner_id,
    })))
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id/states — Get group state collection data
router.get('/:id/states', requireAuth, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('group_state_collection')
      .select('user_id, state, users(display_name)')
      .eq('group_id', req.params.id)

    const byUser = {}
    const myStates = []

    for (const row of data || []) {
      if (row.user_id === req.user.id) myStates.push(row.state)
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = {
          userId:   row.user_id,
          username: row.users?.display_name || 'Anonymous',
          count:    0,
        }
      }
      byUser[row.user_id].count++
    }

    const leaderboard = Object.values(byUser)
      .sort((a, b) => b.count - a.count)
      .map(u => ({ ...u, isYou: u.userId === req.user.id }))

    res.json({ myStates, leaderboard })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/states — Log a state for the current user in this group
router.post('/:id/states', requireAuth, async (req, res, next) => {
  try {
    const { state } = req.body
    if (!state) return res.status(400).json({ error: 'state required' })

    await supabase.from('group_state_collection').upsert(
      {
        group_id:     req.params.id,
        user_id:      req.user.id,
        state,
        collected_at: new Date().toISOString(),
      },
      { onConflict: 'group_id,user_id,state', ignoreDuplicates: true }
    )

    // Also credit personal collection if this state is new for the user
    await supabase.from('state_collection').upsert(
      {
        user_id:    req.user.id,
        state,
        first_seen: new Date().toISOString(),
      },
      { onConflict: 'user_id,state', ignoreDuplicates: true }
    ).catch(() => {})

    // In 'both' or 'states' mode, award bonus points
    const { data: group } = await supabase
      .from('groups')
      .select('mode')
      .eq('id', req.params.id)
      .single()

    if (group?.mode === 'both' || group?.mode === 'states') {
      await supabase.rpc('add_points', { p_user_id: req.user.id, p_points: 50 }).catch(() => {})
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /groups/:id/states/reset — Reset all states for a group (owner only)
router.delete('/:id/states/reset', requireAuth, async (req, res, next) => {
  try {
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', req.params.id)
      .single()

    if (group?.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can reset states' })
    }

    await supabase.from('group_state_collection').delete().eq('group_id', req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id/daily-leaderboard — Today's daily results for a group
router.get('/:id/daily-leaderboard', requireAuth, async (req, res, next) => {
  try {
    const today = new Date().toDateString()
    const { data } = await supabase
      .from('group_daily_results')
      .select('user_id, base_score, speed_bonus, total_score, time_seconds, guess, users(display_name)')
      .eq('group_id', req.params.id)
      .eq('date', today)
      .order('total_score', { ascending: false })

    res.json((data || []).map(r => ({
      userId:      r.user_id,
      username:    r.users?.display_name || 'Anonymous',
      baseScore:   r.base_score,
      speedBonus:  r.speed_bonus,
      totalScore:  r.total_score,
      timeSeconds: r.time_seconds,
      guess:       r.guess,
      isYou:       r.user_id === req.user.id,
    })))
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id — Get group + challenges
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: group } = await supabase
      .from('groups')
      .select('id, name, code, mode, owner_id, created_at')
      .eq('id', req.params.id)
      .single()
    if (!group) return res.status(404).json({ error: 'Not found' })

    const { data: challenges } = await supabase
      .from('group_challenges')
      .select('*, group_guesses(user_id)')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const mapped = (challenges || []).map(c => ({
      id:          c.id,
      plateText:   c.plate_text,
      state:       c.state,
      submittedBy: c.submitted_by_name || 'Someone',
      photoData:   c.photo_data || null,
      isOwn:       c.submitted_by === req.user.id,
      hasGuessed:  c.group_guesses?.some(g => g.user_id === req.user.id),
      guessCount:  c.group_guesses?.length || 0,
      revealed:    c.revealed || new Date(c.closes_at) < new Date(),
      aiResult:    c.revealed ? c.ai_result : null,
      timeLeft:    new Date(c.closes_at) > new Date()
        ? `${Math.ceil((new Date(c.closes_at) - Date.now()) / 3600000)}h left`
        : 'Closed',
    }))

    res.json({ group, challenges: mapped })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/plates — Submit plate to group
router.post('/:id/plates', requireAuth, interpretLimiter, async (req, res, next) => {
  try {
    const { text, state, windowHours = 4, photoData } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Plate text required' })

    const plateUpper = text.toUpperCase().replace(/[^A-Z0-9 -]/g, '')
    const closesAt = new Date(Date.now() + windowHours * 3600000).toISOString()

    // Run AI interpretation immediately (for after window closes)
    const aiResult = await interpretPlate(plateUpper, state)

    const challenge = {
      id:                uuidv4(),
      group_id:          req.params.id,
      plate_text:        plateUpper,
      state:             state || null,
      submitted_by:      req.user.id,
      submitted_by_name: req.user.name || 'Anonymous',
      closes_at:         closesAt,
      ai_result:         aiResult,
      revealed:          false,
      photo_data:        photoData || null,
    }

    await supabase.from('group_challenges').insert(challenge)

    res.json({
      id:          challenge.id,
      plateText:   plateUpper,
      state,
      submittedBy: challenge.submitted_by_name,
      photoData:   photoData || null,
      isOwn:       true,
      hasGuessed:  false,
      guessCount:  0,
      revealed:    false,
      aiResult:    null,
      timeLeft:    `${windowHours}h left`,
    })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/challenges/:cid/guess — Submit a guess
router.post('/:id/challenges/:cid/guess', requireAuth, async (req, res, next) => {
  try {
    const { guess } = req.body
    const { cid } = req.params

    const { data: challenge } = await supabase.from('group_challenges').select('*').eq('id', cid).single()
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' })
    if (new Date(challenge.closes_at) < new Date()) return res.status(410).json({ error: 'Window has closed' })

    const submittedAt = new Date().toISOString()
    const windowAge = (Date.now() - new Date(challenge.created_at).getTime()) / 1000
    const speedPenalty = windowAge < 3 ? 0.5 : 1

    await supabase.from('group_guesses').insert({
      id:           uuidv4(),
      challenge_id: cid,
      user_id:      req.user.id,
      guess:        guess.trim(),
      submitted_at: submittedAt,
      speed_penalty: speedPenalty,
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/challenges/:cid/close — owner force-closes the guessing window early
router.post('/:id/challenges/:cid/close', requireAuth, async (req, res, next) => {
  try {
    const { data: group } = await supabase
      .from('groups').select('owner_id').eq('id', req.params.id).single()
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (group.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the group owner can close challenges early' })

    await supabase
      .from('group_challenges')
      .update({ closes_at: new Date().toISOString() })
      .eq('id', req.params.cid)

    res.json({ ok: true })
  } catch (err) { next(err) }
})

// POST /groups/:id/challenges/:cid/reveal — score all guesses + award global points
router.post('/:id/challenges/:cid/reveal', requireAuth, async (req, res, next) => {
  try {
    const { cid } = req.params

    const { data: challenge } = await supabase
      .from('group_challenges').select('*').eq('id', cid).single()
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' })

    if (challenge.revealed) {
      // Already revealed — just return the scored guesses
      const { data: existing } = await supabase
        .from('group_guesses')
        .select('id, guess, verdict, score, reasoning, user_id, users(display_name)')
        .eq('challenge_id', cid)
        .order('score', { ascending: false })
      return res.json({
        aiResult: challenge.ai_result,
        guesses: (existing || []).map(g => ({
          id:        g.id,
          username:  g.users?.display_name || 'Anonymous',
          guess:     g.guess,
          verdict:   g.verdict || 'disagree',
          score:     g.score || 0,
          reasoning: g.reasoning || '',
        })),
      })
    }

    // Fetch all guesses for this challenge
    const { data: rawGuesses } = await supabase
      .from('group_guesses')
      .select('id, guess, user_id')
      .eq('challenge_id', cid)

    const guesses = rawGuesses || []
    const aiResult = challenge.ai_result

    // Batch-score all guesses in one API call
    const scored = await scoreGroupGuesses(
      challenge.plate_text,
      aiResult?.primary || 'Meaning unclear',
      guesses.map(g => ({ id: g.id, guess: g.guess })),
      { state: challenge.state }
    )

    // Build a lookup map
    const scoreMap = {}
    for (const s of scored) scoreMap[s.id] = s

    // Update each guess + award global points
    for (const g of guesses) {
      const s = scoreMap[g.id] || { verdict: 'disagree', bonusPoints: 0, reasoning: '' }
      const { error: upErr } = await supabase
        .from('group_guesses')
        .update({ verdict: s.verdict, score: s.bonusPoints, reasoning: s.reasoning, scored_at: new Date().toISOString() })
        .eq('id', g.id)
      if (upErr) console.warn('[group_guesses update]', upErr.message)

      if (s.bonusPoints > 0) {
        const { error: rpcErr } = await supabase.rpc('add_points', {
          p_user_id: g.user_id,
          p_points:  s.bonusPoints,
        })
        if (rpcErr) console.warn('[add_points group]', rpcErr.message)
      }
    }

    // Mark challenge as revealed
    const { error: revErr } = await supabase
      .from('group_challenges').update({ revealed: true }).eq('id', cid)
    if (revErr) console.warn('[reveal update]', revErr.message)

    // Return final results with usernames
    const { data: finalGuesses } = await supabase
      .from('group_guesses')
      .select('id, guess, verdict, score, reasoning, user_id, users(display_name)')
      .eq('challenge_id', cid)
      .order('score', { ascending: false })

    res.json({
      aiResult,
      guesses: (finalGuesses || []).map(g => ({
        id:        g.id,
        username:  g.users?.display_name || 'Anonymous',
        guess:     g.guess,
        verdict:   g.verdict || 'disagree',
        score:     g.score || 0,
        reasoning: g.reasoning || '',
      })),
    })
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id/leaderboard — scores within this group
router.get('/:id/leaderboard', requireAuth, async (req, res, next) => {
  try {
    // All challenge IDs for this group
    const { data: challenges } = await supabase
      .from('group_challenges').select('id').eq('group_id', req.params.id)
    const ids = (challenges || []).map(c => c.id)
    if (!ids.length) return res.json([])

    // All scored guesses for those challenges
    const { data: guesses } = await supabase
      .from('group_guesses')
      .select('user_id, score, verdict, users(display_name)')
      .in('challenge_id', ids)
      .not('verdict', 'is', null)

    // Aggregate by user
    const byUser = {}
    for (const g of guesses || []) {
      if (!byUser[g.user_id]) {
        byUser[g.user_id] = {
          userId:   g.user_id,
          username: g.users?.display_name || 'Anonymous',
          total:    0,
          correct:  0,
          guesses:  0,
        }
      }
      byUser[g.user_id].total   += g.score || 0
      byUser[g.user_id].guesses += 1
      if (g.verdict === 'agree' || g.verdict === 'partial') byUser[g.user_id].correct += 1
    }

    const leaderboard = Object.values(byUser).sort((a, b) => b.total - a.total)
    res.json(leaderboard)
  } catch (err) {
    next(err)
  }
})

// DELETE /groups/:id — Permanently delete a group and all its data (owner only)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: group } = await supabase
      .from('groups').select('owner_id').eq('id', req.params.id).single()
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (group.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the creator can delete this group' })

    // Delete child rows first to avoid FK violations
    const { data: challenges } = await supabase
      .from('group_challenges').select('id').eq('group_id', req.params.id)
    if (challenges?.length) {
      await supabase.from('group_guesses').delete().in('challenge_id', challenges.map(c => c.id))
    }
    await supabase.from('group_challenges').delete().eq('group_id', req.params.id)
    await supabase.from('group_state_collection').delete().eq('group_id', req.params.id)
    await supabase.from('group_daily_results').delete().eq('group_id', req.params.id)
    await supabase.from('group_members').delete().eq('group_id', req.params.id)
    await supabase.from('groups').delete().eq('id', req.params.id)

    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
