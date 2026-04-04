import { Router } from 'express'
import { optionalAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

const VALID_TYPES = ['bug', 'suggestion', 'content', 'other']

// POST /feedback — submit feedback
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, message, contact } = req.body

    if (!message?.trim() || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message must be at least 5 characters' })
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
    }

    const feedbackType = VALID_TYPES.includes(type) ? type : 'other'

    const { error } = await supabase.from('feedback').insert({
      type: feedbackType,
      message: message.trim(),
      contact: contact?.trim() || null,
      user_id: req.user?.id || null,
    })

    if (error) {
      console.warn('[feedback] insert error:', error.message)
      return res.status(500).json({ error: 'Failed to save feedback' })
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
