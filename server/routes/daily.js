import { Router } from 'express'
import { interpretPlate } from '../lib/openai.js'
import { optionalAuth, requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// Seed plates for when DB is empty / not yet configured
const SEED_PLATES = [
  { text: 'GR8FUL', state: 'CA' },
  { text: 'ILVTOFU', state: 'OR' },
  { text: '10SNE1', state: 'FL' },
  { text: 'RUDBKBY', state: 'TX' },
  { text: 'NVRMND', state: 'WA' },
  { text: '2QT4U', state: 'NY' },
  { text: 'KHAAAN', state: 'NV' },
]

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getDailyIndex() {
  const start = new Date('2026-01-01').getTime()
  const now = Date.now()
  const days = Math.floor((now - start) / 86400000)
  return days % SEED_PLATES.length
}

// GET /daily — Get today's plate
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const today = getTodayStr()

    // Try DB first
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

    // Fallback to seed rotation
    const seed = SEED_PLATES[getDailyIndex()]
    res.json({ id: `seed-${today}`, plate: seed.text, state: seed.state, date: today })
  } catch (err) {
    const seed = SEED_PLATES[getDailyIndex()]
    res.json({ id: `seed-${getTodayStr()}`, plate: seed.text, state: seed.state })
  }
})

// POST /daily/:id/submit — Submit a guess for today's plate
router.post('/:id/submit', optionalAuth, async (req, res, next) => {
  try {
    const { guess } = req.body
    if (!guess?.trim()) return res.status(400).json({ error: 'Guess is required' })

    // Get the daily plate
    let plateText
    const id = req.params.id

    if (id.startsWith('seed-')) {
      plateText = SEED_PLATES[getDailyIndex()].text
    } else {
      const { data } = await supabase.from('daily_challenges').select('plates(text)').eq('id', id).single()
      plateText = data?.plates?.text
    }

    if (!plateText) return res.status(404).json({ error: 'Daily challenge not found' })

    // Get AI interpretation to compare
    const aiResult = await interpretPlate(plateText)

    // Simple semantic similarity: check keyword overlap
    const guessWords = guess.toLowerCase().split(/\s+/)
    const answerWords = aiResult.primary.toLowerCase().split(/\s+/)
    const overlap = guessWords.filter(w => answerWords.some(a => a.includes(w) || w.includes(a))).length
    const similarity = overlap / Math.max(answerWords.length, 1)

    let points = 50 // base participation
    let feedback = 'Good try! Here\'s what the AI thinks it means.'

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

    // Save submission if authenticated
    if (req.user?.id && !id.startsWith('seed-')) {
      await supabase.from('daily_submissions').insert({
        challenge_id: id,
        user_id: req.user.id,
        guess: guess.trim(),
        points,
        similarity,
      }).catch(() => {})
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
