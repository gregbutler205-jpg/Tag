import { Router } from 'express'
import multer from 'multer'
import { interpretPlate, moderatePlate, challengeInterpretation } from '../lib/openai.js'
import { cropForPlateDetection } from '../lib/imageCropper.js'
import { detectPlateVision } from '../lib/visionPipeline.js'
import { optionalAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /plates/interpret — AI decode a plate
router.post('/interpret', optionalAuth, async (req, res, next) => {
  try {
    const { text, state, hasPhoto, vehicleMake, vehicleModel, vehicleType, specialtyPlateHints } = req.body
    if (!text || text.length < 2 || text.length > 8) {
      return res.status(400).json({ error: 'Plate text must be 2-8 characters' })
    }

    const plateUpper = text.toUpperCase().replace(/[^A-Z0-9 -]/g, '')

    // Moderate for offensive content
    const isFlagged = await moderatePlate(plateUpper).catch(() => false)
    if (isFlagged) return res.status(422).json({ error: 'This plate was flagged by our content filter' })

    const result = await interpretPlate(plateUpper, {
      state,
      vehicleMake:          vehicleMake          || null,
      vehicleModel:         vehicleModel         || null,
      vehicleType:          vehicleType          || null,
      specialtyPlateHints:  specialtyPlateHints  || null,
    })

    // Add photo bonus
    if (hasPhoto) result.points += 25

    // Save to DB if user is authenticated
    if (req.user?.id) {
      await supabase.from('plates').insert({
        text: plateUpper,
        state: state || null,
        rarity: result.rarity,
        category: result.category,
        ai_primary: result.primary,
        ai_alternatives: result.alternatives,
        difficulty: result.difficulty,
        submitted_by: req.user.id,
        has_photo: !!hasPhoto,
      }).catch(() => {}) // Non-fatal

      if (state) {
        await supabase.from('state_collection').upsert({
          user_id: req.user.id,
          state,
          first_seen: new Date().toISOString(),
        }, { onConflict: 'user_id,state', ignoreDuplicates: true }).catch(() => {})
      }
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /plates/challenge — User challenges the AI's interpretation
router.post('/challenge', optionalAuth, async (req, res, next) => {
  try {
    const { plateText, aiMeaning, userMeaning, state } = req.body
    if (!plateText || !userMeaning?.trim()) {
      return res.status(400).json({ error: 'plateText and userMeaning are required' })
    }

    // Moderate the user's interpretation before judging it
    const flagged = await moderatePlate(userMeaning).catch(() => false)
    if (flagged) return res.status(422).json({ error: 'Your interpretation was flagged by the content filter' })

    const judgment = await challengeInterpretation(plateText, aiMeaning, userMeaning, { state })

    // Award bonus points to authenticated user
    if (req.user?.id && judgment.bonusPoints > 0) {
      await supabase.rpc('add_points', {
        p_user_id: req.user.id,
        p_points:  judgment.bonusPoints,
      }).catch(() => {})
    }

    res.json(judgment)
  } catch (err) {
    next(err)
  }
})

// POST /plates/ocr — Preprocess + vision pipeline plate detection
router.post('/ocr', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' })

    // Step 1: Heuristic crop — vehicle rear → plate zone → full fallback
    const { buffer: croppedBuffer, log: cropLog } = await cropForPlateDetection(req.file.buffer)

    // Step 2: Vision pipeline — first pass + conditional escalation
    const { text, meta } = await detectPlateVision(croppedBuffer, cropLog)

    res.json({ text: text || null, meta })
  } catch (err) {
    console.error('[OCR route]', err.message)
    res.json({ text: null, meta: { error: err.message } })
  }
})

export default router
