import { Router } from 'express'
import multer from 'multer'
import { interpretPlate, moderatePlate, challengeInterpretation } from '../lib/openai.js'
import { cropForPlateDetection } from '../lib/imageCropper.js'
import { detectPlateVision } from '../lib/visionPipeline.js'
import { extractPlateText } from '../lib/ocr.js'
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
      const { error: insertErr } = await supabase.from('plates').insert({
        text: plateUpper,
        state: state || null,
        rarity: result.rarity,
        category: result.category,
        ai_primary: result.primary,
        ai_alternatives: result.alternatives,
        difficulty: result.difficulty,
        submitted_by: req.user.id,
        has_photo: !!hasPhoto,
      })
      if (insertErr) console.warn('[plates/insert]', insertErr.message)

      if (state) {
        const { error: upsertErr } = await supabase.from('state_collection').upsert({
          user_id: req.user.id,
          state,
          first_seen: new Date().toISOString(),
        }, { onConflict: 'user_id,state', ignoreDuplicates: true })
        if (upsertErr) console.warn('[state_collection/upsert]', upsertErr.message)
      }
    }

    // ── Auto-queue to daily pool if AI confidence ≥ 75% ──────────────────────
    // Runs for all users (guest or signed-in) — fire-and-forget
    if (result.confidence >= 0.75 && plateUpper.length >= 2) {
      supabase.from('daily_pool').upsert({
        plate_text:    plateUpper,
        state:         state || null,
        meaning:       result.primary,
        source:        'ai_confident',
        status:        'pending',
        submitted_by:  req.user?.id || null,
        pending_since: new Date().toISOString(),
        goes_live_at:  new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      }, { onConflict: 'plate_text', ignoreDuplicates: true }).then(() => {}).catch(() => {})
      console.log(`[pool] Auto-queued ${plateUpper} (confidence ${Math.round(result.confidence * 100)}%)`)
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
      const { error: rpcErr } = await supabase.rpc('add_points', {
        p_user_id: req.user.id,
        p_points:  judgment.bonusPoints,
      })
      if (rpcErr) console.warn('[add_points rpc]', rpcErr.message)
    }

    // Auto-queue to daily pool if user and AI agree (85%+ match = 'agree' verdict)
    if (judgment.verdict === 'agree') {
      const plateUpper2 = plateText?.toUpperCase().replace(/[^A-Z0-9 -]/g, '')
      if (plateUpper2 && plateUpper2.length >= 2) {
        const goesLiveAt = new Date(Date.now() + 5 * 24 * 3600000).toISOString()
        supabase.from('daily_pool').upsert({
          plate_text: plateUpper2,
          state: state || null,
          meaning: aiMeaning || judgment.revisedMeaning || plateUpper2,
          source: 'user_submitted',
          status: 'pending',
          submitted_by: req.user?.id || null,
          pending_since: new Date().toISOString(),
          goes_live_at: goesLiveAt,
        }, { onConflict: 'plate_text', ignoreDuplicates: true }).then(() => {}).catch(() => {})
      }
    }

    res.json(judgment)
  } catch (err) {
    next(err)
  }
})

// POST /plates/ocr — Preprocess + vision pipeline plate detection
// Send skipCrop=true (as a FormData field) when the client has already cropped
// the image to the plate area — bypasses server-side auto-crop entirely.
router.post('/ocr', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' })

    const userCropped = req.body?.skipCrop === 'true'

    let imageBuffer, cropLog
    if (userCropped) {
      // Client already cropped to the plate — use the buffer as-is
      imageBuffer = req.file.buffer
      cropLog = { cropSucceeded: true, plateZoneCropped: true, cropType: 'user_cropped', usedFallback: false }
      console.log('[OCR] Using user-cropped image (server crop skipped)')
    } else {
      const result = await cropForPlateDetection(req.file.buffer)
      imageBuffer = result.buffer
      cropLog = result.log
    }

    // Try Google Cloud Vision first — fast (~300ms)
    let text = null
    let detectedState = null
    let meta = { ...cropLog, method: 'google_vision' }
    try {
      const visionResult = await extractPlateText(imageBuffer)
      text = visionResult.plateText
      detectedState = visionResult.detectedState
      console.log('[OCR] Google Vision result:', text, '| state:', detectedState)
    } catch (gErr) {
      console.warn('[OCR] Google Vision failed, falling back to GPT:', gErr.message)
      const vResult = await detectPlateVision(imageBuffer, cropLog)
      text = vResult.text
      meta = { ...vResult.meta, method: 'gpt_vision' }
    }

    res.json({ text: text || null, detectedState: detectedState || null, meta })
  } catch (err) {
    console.error('[OCR route]', err.message)
    res.json({ text: null, meta: { error: err.message } })
  }
})

export default router
