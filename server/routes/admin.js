import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// Admin check middleware
function requireAdmin(req, res, next) {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!req.user?.id || !adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// GET /admin/pending — list pending plates
router.get('/pending', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('daily_pool')
      .select('*, users(display_name)')
      .eq('status', 'pending')
      .order('pending_since', { ascending: true })
    res.json(data || [])
  } catch (err) { next(err) }
})

// POST /admin/approve/:id
router.post('/approve/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('daily_pool').update({ status: 'approved' }).eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// POST /admin/reject/:id
router.post('/reject/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('daily_pool').update({ status: 'rejected' }).eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /admin/pool — full pool stats
router.get('/pool', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('daily_pool')
      .select('id, plate_text, state, meaning, category, difficulty, rarity, status, times_shown, source, goes_live_at, pending_since')
      .order('created_at', { ascending: false })
    res.json(data || [])
  } catch (err) { next(err) }
})

export default router
