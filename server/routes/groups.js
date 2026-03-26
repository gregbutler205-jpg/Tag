import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { interpretPlate } from '../lib/openai.js'
import { requireAuth, optionalAuth } from '../lib/auth.js'
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
      .select('groups(id, name, code, created_at)')
      .eq('user_id', req.user.id)
    res.json((data || []).map(d => d.groups).filter(Boolean))
  } catch (err) {
    next(err)
  }
})

// POST /groups — Create a group
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })

    const group = { id: uuidv4(), name: name.trim(), code: makeCode(), owner_id: req.user.id }
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

// GET /groups/:id — Get group + challenges
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: group } = await supabase.from('groups').select('*').eq('id', req.params.id).single()
    if (!group) return res.status(404).json({ error: 'Not found' })

    const { data: challenges } = await supabase
      .from('group_challenges')
      .select('*, group_guesses(user_id)')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const mapped = (challenges || []).map(c => ({
      id: c.id,
      plateText: c.plate_text,
      state: c.state,
      submittedBy: c.submitted_by_name || 'Someone',
      isOwn: c.submitted_by === req.user.id,
      hasGuessed: c.group_guesses?.some(g => g.user_id === req.user.id),
      guessCount: c.group_guesses?.length || 0,
      revealed: c.revealed || new Date(c.closes_at) < new Date(),
      aiResult: c.revealed ? c.ai_result : null,
      timeLeft: new Date(c.closes_at) > new Date()
        ? `${Math.ceil((new Date(c.closes_at) - Date.now()) / 3600000)}h left`
        : 'Closed',
    }))

    res.json({ group, challenges: mapped })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/plates — Submit plate to group
router.post('/:id/plates', requireAuth, async (req, res, next) => {
  try {
    const { text, state, windowHours = 12 } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Plate text required' })

    const plateUpper = text.toUpperCase().replace(/[^A-Z0-9 -]/g, '')
    const closesAt = new Date(Date.now() + windowHours * 3600000).toISOString()

    // Run AI interpretation immediately (for after window closes)
    const aiResult = await interpretPlate(plateUpper, state)

    const challenge = {
      id: uuidv4(),
      group_id: req.params.id,
      plate_text: plateUpper,
      state: state || null,
      submitted_by: req.user.id,
      submitted_by_name: req.user.name || 'Anonymous',
      closes_at: closesAt,
      ai_result: aiResult,
      revealed: false,
    }

    await supabase.from('group_challenges').insert(challenge)

    res.json({
      id: challenge.id,
      plateText: plateUpper,
      state,
      submittedBy: challenge.submitted_by_name,
      isOwn: true,
      hasGuessed: false,
      guessCount: 0,
      revealed: false,
      aiResult: null,
      timeLeft: `${windowHours}h left`,
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
    if (challenge.submitted_by === req.user.id) return res.status(403).json({ error: 'You cannot guess on your own plate' })
    if (new Date(challenge.closes_at) < new Date()) return res.status(410).json({ error: 'Window has closed' })

    const submittedAt = new Date().toISOString()
    const windowAge = (Date.now() - new Date(challenge.created_at).getTime()) / 1000 // seconds
    const speedPenalty = windowAge < 3 ? 0.5 : 1 // flag suspicious fast answers

    await supabase.from('group_guesses').insert({
      id: uuidv4(),
      challenge_id: cid,
      user_id: req.user.id,
      guess: guess.trim(),
      submitted_at: submittedAt,
      speed_penalty: speedPenalty,
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
