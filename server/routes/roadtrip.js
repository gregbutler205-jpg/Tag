import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { interpretPlate, scoreGroupGuesses } from '../lib/openai.js'
import { requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

function makeCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function speedMultiplier(elapsed) {
  if (elapsed <= 15) return 3
  if (elapsed <= 30) return 2
  if (elapsed <= 60) return 1
  return 0
}

const RARITY_BASE = { common: 50, uncommon: 75, rare: 100, epic: 150, legendary: 200 }
const RARE_STATES = ['AK', 'HI', 'ND', 'SD', 'VT']

// ── Background: judge a round after timer expires ──────────────────────────────
async function judgeRound(round) {
  try {
    const { data: guesses } = await supabase
      .from('road_trip_guesses')
      .select('*')
      .eq('round_id', round.id)

    // Interpret the plate (may already be stored from when round was created)
    let aiResult = round.ai_result
    if (!aiResult) {
      aiResult = await interpretPlate(round.plate_text, { state: round.plate_state })
    }

    const toScore = (guesses || []).filter(g => g.guess)
    const scored = toScore.length > 0
      ? await scoreGroupGuesses(
          round.plate_text,
          aiResult.primary,
          toScore.map(g => ({ id: g.id, guess: g.guess })),
          { state: round.plate_state }
        )
      : []

    const base = RARITY_BASE[aiResult.rarity] || 50

    for (const s of scored) {
      const g = toScore.find(x => x.id === s.id)
      if (!g) continue

      const mult = speedMultiplier(g.elapsed_seconds ?? 60)
      const pts  = s.verdict === 'agree'    ? base * mult
                 : s.verdict === 'partial'  ? Math.round(base * 0.6 * mult)
                 : 0

      await supabase.from('road_trip_guesses')
        .update({ verdict: s.verdict, score: pts })
        .eq('id', s.id)

      if (pts > 0) {
        const { data: pl } = await supabase.from('road_trip_players')
          .select('score')
          .eq('session_id', round.session_id)
          .eq('user_id', g.player_id)
          .maybeSingle()
        await supabase.from('road_trip_players')
          .update({ score: (pl?.score ?? 0) + pts })
          .eq('session_id', round.session_id)
          .eq('user_id', g.player_id)
      }
    }

    await supabase.from('road_trip_rounds')
      .update({ status: 'judged', ai_result: aiResult })
      .eq('id', round.id)
  } catch (err) {
    console.error('[judgeRound]', err.message)
    await supabase.from('road_trip_rounds').update({ status: 'judged' }).eq('id', round.id).catch(() => {})
  }
}

// POST /road-trip — Create session
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, timerSeconds = 60, gameMode = 'combo' } = req.body

    // Generate unique 4-digit code not already in use for an active session
    let code = makeCode()
    for (let i = 0; i < 10; i++) {
      const { data: existing } = await supabase.from('road_trip_sessions')
        .select('id').eq('code', code).neq('status', 'ended').maybeSingle()
      if (!existing) break
      code = makeCode()
    }

    const session = {
      id:             uuidv4(),
      name:           name?.trim() || 'Road Trip',
      host_id:        req.user.id,
      host_name:      req.user.name || 'Host',
      code,
      timer_seconds:  Number(timerSeconds) || 60,
      game_mode:      gameMode,
      status:         'waiting',
    }

    await supabase.from('road_trip_sessions').insert(session)
    await supabase.from('road_trip_players').insert({
      id:           uuidv4(),
      session_id:   session.id,
      user_id:      req.user.id,
      display_name: req.user.name || 'Host',
      score:        0,
    })

    res.json(session)
  } catch (err) { next(err) }
})

// POST /road-trip/join — Join by 4-digit code
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code required' })

    const { data: session } = await supabase.from('road_trip_sessions')
      .select('*').eq('code', code.trim()).neq('status', 'ended').maybeSingle()
    if (!session) return res.status(404).json({ error: 'Session not found — check the code and try again' })

    await supabase.from('road_trip_players').upsert({
      id:           uuidv4(),
      session_id:   session.id,
      user_id:      req.user.id,
      display_name: req.user.name || 'Player',
      score:        0,
    }, { onConflict: 'session_id,user_id', ignoreDuplicates: true })

    res.json(session)
  } catch (err) { next(err) }
})

// GET /road-trip/:id — Poll session state (players + current round + leaderboard)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: session } = await supabase.from('road_trip_sessions')
      .select('*').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { data: players } = await supabase.from('road_trip_players')
      .select('*').eq('session_id', req.params.id).order('score', { ascending: false })

    // Most recent round
    const { data: rounds } = await supabase.from('road_trip_rounds')
      .select('*').eq('session_id', req.params.id)
      .order('round_number', { ascending: false }).limit(1)

    let currentRound = rounds?.[0] ?? null

    // Auto-judge when timer has expired
    if (currentRound?.status === 'active') {
      const elapsed = (Date.now() - new Date(currentRound.started_at).getTime()) / 1000
      if (elapsed >= currentRound.timer_seconds) {
        // Atomic claim: only one concurrent request will succeed
        const { data: claimed } = await supabase.from('road_trip_rounds')
          .update({ status: 'judging' })
          .eq('id', currentRound.id)
          .eq('status', 'active')
          .select()

        if (claimed?.length) {
          judgeRound({ ...currentRound, session_id: req.params.id }).catch(console.error)
        }
        currentRound = { ...currentRound, status: 'judging' }
      }
    }

    // Fetch guesses for the current round
    let roundGuesses = []
    let myGuess = null
    if (currentRound) {
      const { data: guesses } = await supabase.from('road_trip_guesses')
        .select('*').eq('round_id', currentRound.id)
      roundGuesses = guesses ?? []
      myGuess = roundGuesses.find(g => g.player_id === req.user.id) ?? null
    }

    res.json({
      session: {
        id:           session.id,
        name:         session.name,
        code:         session.code,
        timerSeconds: session.timer_seconds,
        gameMode:     session.game_mode,
        status:       session.status,
        hostId:       session.host_id,
      },
      players: (players ?? []).map(p => ({
        userId:      p.user_id,
        displayName: p.display_name,
        score:       p.score,
        isYou:       p.user_id === req.user.id,
        isHost:      p.user_id === session.host_id,
      })),
      currentRound: currentRound ? {
        id:           currentRound.id,
        plateText:    currentRound.plate_text,
        state:        currentRound.plate_state,
        startedAt:    currentRound.started_at,
        timerSeconds: currentRound.timer_seconds,
        roundNumber:  currentRound.round_number,
        status:       currentRound.status,
        submittedBy:  currentRound.submitted_by_name,
        aiResult:     currentRound.status === 'judged' ? currentRound.ai_result : null,
        hasSubmitted: !!myGuess,
        myGuess:      myGuess?.guess ?? null,
        guesses: currentRound.status === 'judged'
          ? roundGuesses
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
              .map(g => ({
                playerName: g.player_name,
                guess:      g.guess,
                verdict:    g.verdict,
                score:      g.score ?? 0,
                elapsed:    g.elapsed_seconds,
                isYou:      g.player_id === req.user.id,
              }))
          : [],
      } : null,
    })
  } catch (err) { next(err) }
})

// POST /road-trip/:id/round — Submit a plate to start a new round
router.post('/:id/round', requireAuth, async (req, res, next) => {
  try {
    const { plateText, state } = req.body
    if (!plateText?.trim()) return res.status(400).json({ error: 'Plate text required' })

    const { data: session } = await supabase.from('road_trip_sessions')
      .select('*').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.status === 'ended') return res.status(400).json({ error: 'Session has ended' })

    // Block if a round is already running
    const { data: activeRound } = await supabase.from('road_trip_rounds')
      .select('id').eq('session_id', req.params.id).in('status', ['active', 'judging']).maybeSingle()
    if (activeRound) return res.status(409).json({ error: 'A round is already in progress — wait for it to finish' })

    const { count } = await supabase.from('road_trip_rounds')
      .select('*', { count: 'exact', head: true }).eq('session_id', req.params.id)

    if (session.status === 'waiting') {
      await supabase.from('road_trip_sessions').update({ status: 'active' }).eq('id', req.params.id)
    }

    const plateUpper = plateText.trim().toUpperCase()
    const round = {
      id:                 uuidv4(),
      session_id:         req.params.id,
      plate_text:         plateUpper,
      plate_state:        state || null,
      submitted_by:       req.user.id,
      submitted_by_name:  req.user.name || 'Someone',
      started_at:         new Date().toISOString(),
      timer_seconds:      session.timer_seconds,
      status:             'active',
      ai_result:          null,
      round_number:       (count ?? 0) + 1,
    }

    await supabase.from('road_trip_rounds').insert(round)

    // Pre-interpret in background so it's ready when judging time comes
    interpretPlate(plateUpper, { state }).then(aiResult => {
      supabase.from('road_trip_rounds').update({ ai_result: aiResult }).eq('id', round.id).catch(() => {})
    }).catch(() => {})

    res.json({ ok: true, roundId: round.id, startedAt: round.started_at })
  } catch (err) { next(err) }
})

// POST /road-trip/:id/round/:rid/guess — Submit a guess
router.post('/:id/round/:rid/guess', requireAuth, async (req, res, next) => {
  try {
    const { guess } = req.body
    if (!guess?.trim()) return res.status(400).json({ error: 'Guess required' })

    const { data: round } = await supabase.from('road_trip_rounds')
      .select('*').eq('id', req.params.rid).single()
    if (!round) return res.status(404).json({ error: 'Round not found' })
    if (round.status !== 'active') return res.status(400).json({ error: 'Round is not accepting guesses' })

    const elapsed = (Date.now() - new Date(round.started_at).getTime()) / 1000
    if (elapsed >= round.timer_seconds) return res.status(400).json({ error: "Time's up!" })

    // Only one guess per player
    const { data: existing } = await supabase.from('road_trip_guesses')
      .select('id').eq('round_id', req.params.rid).eq('player_id', req.user.id).maybeSingle()
    if (existing) return res.status(409).json({ error: 'Already submitted a guess for this round' })

    const { data: player } = await supabase.from('road_trip_players')
      .select('display_name').eq('session_id', req.params.id).eq('user_id', req.user.id).maybeSingle()

    await supabase.from('road_trip_guesses').insert({
      id:               uuidv4(),
      round_id:         req.params.rid,
      player_id:        req.user.id,
      player_name:      player?.display_name ?? req.user.name ?? 'Player',
      guess:            guess.trim(),
      elapsed_seconds:  parseFloat(elapsed.toFixed(1)),
      score:            0,
    })

    res.json({ ok: true, elapsedSeconds: elapsed })
  } catch (err) { next(err) }
})

// POST /road-trip/:id/state — Log a state spot (State Hunt / Combo mode)
router.post('/:id/state', requireAuth, async (req, res, next) => {
  try {
    const { state } = req.body
    if (!state) return res.status(400).json({ error: 'State required' })

    const { data: session } = await supabase.from('road_trip_sessions')
      .select('game_mode').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { data: existing } = await supabase.from('road_trip_state_spots')
      .select('id').eq('session_id', req.params.id).eq('player_id', req.user.id).eq('state', state).maybeSingle()

    const { data: player } = await supabase.from('road_trip_players')
      .select('display_name, score').eq('session_id', req.params.id).eq('user_id', req.user.id).maybeSingle()

    let pts = 0
    if (!existing) {
      // Check if new for this session (all players)
      const { data: sessionSpot } = await supabase.from('road_trip_state_spots')
        .select('id').eq('session_id', req.params.id).eq('state', state).limit(1).maybeSingle()

      pts = RARE_STATES.includes(state) ? 300 : 150
      if (sessionSpot) pts = Math.round(pts * 0.5) // already spotted this session

      await supabase.from('road_trip_state_spots').insert({
        id:           uuidv4(),
        session_id:   req.params.id,
        player_id:    req.user.id,
        player_name:  player?.display_name ?? 'Player',
        state,
      })

      if (pts > 0) {
        await supabase.from('road_trip_players')
          .update({ score: (player?.score ?? 0) + pts })
          .eq('session_id', req.params.id).eq('user_id', req.user.id)
      }
    }

    res.json({ ok: true, alreadySpotted: !!existing, points: pts })
  } catch (err) { next(err) }
})

// POST /road-trip/:id/end — End the session (host only)
router.post('/:id/end', requireAuth, async (req, res, next) => {
  try {
    const { data: session } = await supabase.from('road_trip_sessions')
      .select('host_id').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.host_id !== req.user.id) return res.status(403).json({ error: 'Only the host can end the trip' })

    await supabase.from('road_trip_sessions').update({ status: 'ended' }).eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
