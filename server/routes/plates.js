import { Router } from 'express'
import multer from 'multer'
import { interpretPlate, moderatePlate } from '../lib/openai.js'
import { extractPlateText } from '../lib/ocr.js'
import { optionalAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /plates/interpret — AI decode a plate
router.post('/interpret', optionalAuth, async (req, res, next) => {
  try {
    const { text, state, hasPhoto } = req.body
    if (!text || text.length < 2 || text.length > 8) {
      return res.status(400).json({ error: 'Plate text must be 2-8 characters' })
    }

    const plateUpper = text.toUpperCase().replace(/[^A-Z0-9 -]/g, '')

    // Moderate for offensive content
    const isFlagged = await moderatePlate(plateUpper).catch(() => false)
    if (isFlagged) return res.status(422).json({ error: 'This plate was flagged by our content filter' })

    const result = await interpretPlate(plateUpper, state)

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

// POST /plates/ocr — Extract text from photo
router.post('/ocr', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' })
    const text = await extractPlateText(req.file.buffer)
    res.json({ text: text || null })
  } catch (err) {
    // Return null text if OCR fails — client falls back to manual entry
    res.json({ text: null, error: err.message })
  }
})

export default router
