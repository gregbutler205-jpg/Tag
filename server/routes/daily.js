import { Router } from 'express'
import { optionalAuth, requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// Emergency fallback — used only when DB is completely unavailable
const EMERGENCY_FALLBACK = { plate: 'GR8FUL', meaning: 'Grateful', state: 'CA' }

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getDailyIndex() {
  const start = new Date('2026-01-01').getTime()
  const now = Date.now()
  const days = Math.floor((now - start) / 86400000)
  return Math.max(0, days)
}

// GET /daily — Get today's plate
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const today = getTodayStr()

    // Check for a manually curated daily_challenges override first
    const { data: dbDaily } = await supabase
      .from('daily_challenges')
      .select('*, plates(*)')
      .eq('date', today)
      .single()

    if (dbDaily) {
      return res.json({
        id: dbDaily.id,
        plate: dbDaily.plates.text,
        state: dbDaily.plates.state,
        date: today,
      })
    }

    // Pick from daily_pool using day-index rotation
    const { count } = await supabase
      .from('daily_pool')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    const idx = getDailyIndex() % (count || 1)

    const { data: poolPlates } = await supabase
      .from('daily_pool')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .range(idx, idx)

    const seed = poolPlates?.[0]

    if (!seed) {
      // No approved plates in DB — use emergency fallback
      return res.json({
        id: `fallback-${today}`,
        plate: EMERGENCY_FALLBACK.plate,
        state: EMERGENCY_FALLBACK.state,
        date: today,
        meaning: EMERGENCY_FALLBACK.meaning,
      })
    }

    // Fire-and-forget: increment times_shown
    supabase
      .from('daily_pool')
      .update({ times_shown: (seed.times_shown || 0) + 1, last_shown_at: new Date().toISOString() })
      .eq('id', seed.id)
      .then(() => {})
      .catch(() => {})

    res.json({
      id: `pool-${today}-${seed.id}`,
      plate: seed.plate_text,
      state: seed.state,
      date: today,
      meaning: seed.meaning,
      category: seed.category,
      difficulty: seed.difficulty,
      rarity: seed.rarity,
    })
  } catch (err) {
    // Full DB failure — use emergency fallback
    const today = getTodayStr()
    res.json({
      id: `fallback-${today}`,
      plate: EMERGENCY_FALLBACK.plate,
      state: EMERGENCY_FALLBACK.state,
      date: today,
      meaning: EMERGENCY_FALLBACK.meaning,
    })
  }
})

// POST /daily/:id/submit — Submit a guess for today's plate
router.post('/:id/submit', optionalAuth, async (req, res, next) => {
  try {
    const { guess } = req.body
    if (!guess?.trim()) return res.status(400).json({ error: 'Guess is required' })

    const id = req.params.id
    const today = getTodayStr()

    let plateText = null
    let aiResult = null

    // ── Dedup: authenticated users may only submit once per day ──────────────
    if (req.user?.id) {
      const { data: alreadySubmitted } = await supabase
        .from('daily_submissions')
        .select('id')
        .eq('user_id', req.user.id)
        .like('challenge_id', `%-${today}-%`)
        .limit(1)
        .maybeSingle()

      if (alreadySubmitted) {
        return res.status(409).json({ error: "You've already submitted today's challenge — come back tomorrow!" })
      }
    }

    if (id.startsWith('pool-')) {
      // Extract the pool plate UUID from the id string: pool-<date>-<uuid>
      // The UUID is everything after the second hyphen-separated token (date has dashes too)
      // Format: pool-YYYY-MM-DD-<uuid>
      const parts = id.split('-')
      // parts[0] = 'pool', parts[1..3] = date parts (YYYY, MM, DD), parts[4..] = UUID parts
      const poolId = parts.slice(4).join('-')

      const { data: poolPlate } = await supabase
        .from('daily_pool')
        .select('*')
        .eq('id', poolId)
        .single()

      if (poolPlate) {
        plateText = poolPlate.plate_text
        const difficultyPoints = { easy: 50, medium: 75, hard: 100, legendary: 150 }
        const basePoints = difficultyPoints[poolPlate.difficulty] || 75
        aiResult = {
          primary: poolPlate.meaning || 'Meaning on file',
          alternatives: poolPlate.alternatives || [],
          rarity: poolPlate.rarity || 'common',
          difficulty: poolPlate.difficulty || 'medium',
          category: poolPlate.category || 'General',
          points: basePoints,
        }
      }
    } else if (id.startsWith('fallback-')) {
      plateText = EMERGENCY_FALLBACK.plate
      aiResult = {
        primary: EMERGENCY_FALLBACK.meaning,
        alternatives: [],
        rarity: 'common',
        difficulty: 'easy',
        category: 'Personality',
        points: 50,
      }
    } else {
      // Legacy daily_challenges DB override path
      const { data } = await supabase
        .from('daily_challenges')
        .select('plates(text, state)')
        .eq('id', id)
        .single()
      plateText = data?.plates?.text

      if (plateText) {
        // Look up from daily_pool by plate text for stored meaning
        const { data: poolPlate } = await supabase
          .from('daily_pool')
          .select('*')
          .eq('plate_text', plateText)
          .single()

        if (poolPlate) {
          const difficultyPoints = { easy: 50, medium: 75, hard: 100, legendary: 150 }
          const basePoints = difficultyPoints[poolPlate.difficulty] || 75
          aiResult = {
            primary: poolPlate.meaning || 'Meaning on file',
            alternatives: poolPlate.alternatives || [],
            rarity: poolPlate.rarity || 'common',
            difficulty: poolPlate.difficulty || 'medium',
            category: poolPlate.category || 'General',
            points: basePoints,
          }
        }
      }
    }

    if (!plateText) return res.status(404).json({ error: 'Daily challenge not found' })

    // If we still have no aiResult (legacy plate not in pool), use a neutral default
    if (!aiResult) {
      aiResult = {
        primary: plateText,
        alternatives: [],
        rarity: 'common',
        difficulty: 'medium',
        category: 'General',
        points: 75,
      }
    }

    // Semantic similarity: keyword overlap scoring
    const guessWords = guess.toLowerCase().split(/\s+/)
    const answerWords = aiResult.primary.toLowerCase().split(/\s+/)
    const overlap = guessWords.filter(w => answerWords.some(a => a.includes(w) || w.includes(a))).length
    const similarity = overlap / Math.max(answerWords.length, 1)

    let points = 50 // base participation
    let feedback = "Good try! Here's what the plate means."

    if (similarity > 0.8) {
      points = aiResult.points + 50
      feedback = 'Excellent! You nailed it!'
    } else if (similarity > 0.5) {
      points = Math.round(aiResult.points * 0.6)
      feedback = 'Close! You got the general idea.'
    } else if (similarity > 0.2) {
      points = Math.round(aiResult.points * 0.3)
      feedback = 'Interesting interpretation!'
    }

    // Save submission for all authenticated users (enables dedup + history)
    if (req.user?.id && !id.startsWith('fallback-')) {
      const { error: subErr } = await supabase.from('daily_submissions').insert({
        challenge_id: id,
        user_id: req.user.id,
        guess: guess.trim(),
        points,
        similarity,
      })
      if (subErr) console.warn('[daily_submissions insert]', subErr.message)
    }

    res.json({
      ...aiResult,
      points,
      feedback,
      similarity: Math.round(similarity * 100),
    })
  } catch (err) {
    next(err)
  }
})

export default router
