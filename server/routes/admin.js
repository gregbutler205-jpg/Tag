import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// ── Admin check middleware ────────────────────────────────────────────────────
// Accepts either email (ADMIN_EMAILS) or UUID (ADMIN_USER_IDS) — either env var works
function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const adminIds    = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  const emailMatch  = req.user?.email && adminEmails.includes(req.user.email.toLowerCase())
  const idMatch     = req.user?.id    && adminIds.includes(req.user.id)
  if (!emailMatch && !idMatch) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// ── Daily Pool ────────────────────────────────────────────────────────────────

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

// DELETE /admin/pool/:id — remove from daily pool
router.delete('/pool/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('daily_pool').delete().eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Plate Submissions ─────────────────────────────────────────────────────────

// GET /admin/submissions — all submitted plates
router.get('/submissions', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('plates')
      .select('id, text, state, rarity, category, ai_primary, difficulty, has_photo, validated, created_at, users(display_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    res.json(data || [])
  } catch (err) { next(err) }
})

// DELETE /admin/submissions/:id — delete a plate submission
router.delete('/submissions/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('plates').delete().eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Users ─────────────────────────────────────────────────────────────────────

// GET /admin/users-list — all users
router.get('/users-list', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('id, display_name, total_points, streak, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    res.json(data || [])
  } catch (err) { next(err) }
})

// DELETE /admin/users/:id — delete user (removes from public.users + auth)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    // Delete from public.users first (FK constraint)
    await supabase.from('users').delete().eq('id', id)
    // Delete from Supabase auth
    await supabase.auth.admin.deleteUser(id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Groups ────────────────────────────────────────────────────────────────────

// GET /admin/groups-list — all groups
router.get('/groups-list', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('groups')
      .select('id, name, code, mode, created_at, users(display_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    res.json(data || [])
  } catch (err) { next(err) }
})

// DELETE /admin/groups/:id — delete group and its members
router.delete('/groups/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    // Remove members first (FK)
    await supabase.from('group_members').delete().eq('group_id', id)
    await supabase.from('group_state_collection').delete().eq('group_id', id).catch(() => {})
    await supabase.from('group_daily_results').delete().eq('group_id', id).catch(() => {})
    await supabase.from('groups').delete().eq('id', id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Feedback ──────────────────────────────────────────────────────────────────

// GET /admin/feedback-list — all feedback submissions
router.get('/feedback-list', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('feedback')
      .select('id, type, message, contact, created_at, users(display_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    res.json(data || [])
  } catch (err) { next(err) }
})

// DELETE /admin/feedback/:id
router.delete('/feedback/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('feedback').delete().eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
