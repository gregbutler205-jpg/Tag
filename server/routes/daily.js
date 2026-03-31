import { Router } from 'express'
import { interpretPlate } from '../lib/openai.js'
import { optionalAuth, requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// Seed plates — 98 curated plates, flagged entries excluded.
// Rotation cycles every ~3 months before repeating.
const SEED_PLATES = [
  { text: 'GR8FUL',   state: 'CA' },
  { text: 'LV2RUN',   state: 'OR' },
  { text: 'H8MNDY',   state: 'TX' },
  { text: 'GR8DAD',   state: 'OH' },
  { text: 'SK8MOM',   state: 'FL' },
  { text: 'CRE8IV',   state: 'NY' },
  { text: 'B4UFLY',   state: 'CO' },
  { text: 'IM L8',    state: 'NV' },
  { text: '2FAST4U',  state: 'MI' },
  { text: 'LUV2LRN',  state: 'MA' },
  { text: 'NVRMND',   state: 'WA' },
  { text: 'BCHLVR',   state: 'SC' },
  { text: 'MTNBKR',   state: 'MT' },
  { text: 'WRKFRM',   state: 'GA' },
  { text: 'RTRDBBY',  state: 'IN' },
  { text: 'QTPI',     state: 'TN' },
  { text: 'DRPCFF',   state: 'WI' },
  { text: 'PLTRCK',   state: 'PA' },
  { text: 'GLFPRO',   state: 'AZ' },
  { text: 'NTRSTD',   state: 'MN' },
  { text: '10SNE1',   state: 'CT' },
  { text: 'ICURNVS',  state: 'NJ' },
  { text: '4RUNNER',  state: 'UT' },
  { text: 'XLNC',     state: 'IL' },
  { text: 'IMAPYR8',  state: 'ME' },
  { text: 'OYL B4K',  state: 'OK' },
  { text: 'RUOK2DY',  state: 'MD' },
  { text: 'XQQQSME',  state: 'KY' },
  { text: 'Y YNT',    state: 'NC' },
  { text: 'NCC1701D', state: 'NM' },
  { text: 'OUTATYM',  state: 'IL' },
  { text: 'KHAAAN',   state: 'CA' },
  { text: 'MORDOR',   state: 'WY' },
  { text: 'LGRNG',    state: 'TX' },
  { text: 'T1000',    state: 'MI' },
  { text: 'RSHNMR',   state: 'HI' },
  { text: 'BYSFLCN',  state: 'NV' },
  { text: 'GANDLF',   state: 'OR' },
  { text: 'HODOR',    state: 'MN' },
  { text: 'MR BOND',  state: 'VA' },
  { text: '42',       state: 'CO' },
  { text: 'YYURYYUB', state: 'VT' },
  { text: 'NOTACRK',  state: 'AL' },
  { text: 'PEBCAK',   state: 'WA' },
  { text: 'LB4BRKR',  state: 'MS' },
  { text: 'ROTFL',    state: 'LA' },
  { text: '7OF9',     state: 'ID' },
  { text: 'NWYMN',    state: 'AK' },
  { text: 'GR8DAY',   state: 'TX' },
  { text: 'IMGR8',    state: 'CA' },
  { text: 'CUL8R',    state: 'FL' },
  { text: 'BLESUP',   state: 'GA' },
  { text: 'UB4ME',    state: 'NC' },
  { text: 'FUN2GO',   state: 'OH' },
  { text: '4GIVEN',   state: 'TN' },
  { text: 'XLNT',     state: 'NY' },
  { text: '2KOOL',    state: 'CA' },
  { text: 'WHOOPS',   state: 'TX' },
  { text: '2QT4U',    state: 'TX' },
  { text: 'BCLVR',    state: 'SC' },
  { text: 'NE1HOME',  state: 'WI' },
  { text: 'YRUUP',    state: 'CO' },
  { text: 'NO1BUT',   state: 'VA' },
  { text: 'W8NSEE',   state: 'MN' },
  { text: 'RUFNUF',   state: 'AZ' },
  { text: 'LIVNLRG',  state: 'GA' },
  { text: 'BRB2IT',   state: 'WA' },
  { text: 'RIZZGOD',  state: 'CA' },
  { text: 'ILVTOFU',  state: 'OR' },
  { text: 'RUDBKBY',  state: 'NJ' },
  { text: 'XQSITME',  state: 'IL' },
  { text: 'WNDRWHY',  state: 'MI' },
  { text: 'THNKTWC',  state: 'PA' },
  { text: 'MISNLGK',  state: 'FL' },
  { text: 'KPITRL',   state: 'TX' },
  { text: '4EVRUS',   state: 'VA' },
  { text: 'L8BLOOM',  state: 'OH' },
  { text: 'OBI ONE',  state: 'CA' },
  { text: '42FRDNT',  state: 'CO' },
  { text: 'MYPRCS',   state: 'KY' },
  { text: 'RDDLME',   state: 'DC' },
  { text: 'HLYWDMN',  state: 'CA' },
  { text: 'DNTSLP',   state: 'NY' },
  { text: 'PSTMDRN',  state: 'MA' },
  { text: 'CTRLALT',  state: 'WA' },
  { text: 'N2DPRTH',  state: 'AL' },
  { text: 'WWJD',     state: 'AL' },
  { text: 'YLKNOW',   state: 'TN' },
  { text: 'XNTHILO',  state: 'VT' },
  { text: 'ZEN0SUM',  state: 'CA' },
  { text: 'MTRXDWN',  state: 'IL' },
  { text: 'SBLMNAL',  state: 'NY' },
  { text: 'OVRTHNK',  state: 'WA' },
  { text: 'QNTRMUP',  state: 'NV' },
  { text: 'PRBLM8',   state: 'TX' },
  { text: 'TMSHFT',   state: 'CO' },
  { text: 'NTLKTHT',  state: 'MI' },
  { text: 'COGITO',   state: 'OR' },
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
