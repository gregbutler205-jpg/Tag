import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'
import { sendTrainingNotification } from '../lib/mailer.js'

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

// PUT /admin/pool/:id — edit a pool plate
router.put('/pool/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { plate_text, meaning, category, difficulty, state, status, goes_live_at } = req.body
    const updates = {}
    if (plate_text  !== undefined) updates.plate_text  = plate_text.toUpperCase().replace(/[^A-Z0-9 -]/g, '')
    if (meaning     !== undefined) updates.meaning     = meaning.trim()
    if (category    !== undefined) updates.category    = category.trim()
    if (difficulty  !== undefined) updates.difficulty  = difficulty
    if (state       !== undefined) updates.state       = state || null
    if (status      !== undefined) updates.status      = status
    if (goes_live_at !== undefined) updates.goes_live_at = goes_live_at || null

    const { data, error } = await supabase
      .from('daily_pool')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
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

// ── Training Dataset ──────────────────────────────────────────────────────────

// GET /admin/training — pending items, user-challenged first
router.get('/training', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status || 'pending'
    const { data } = await supabase
      .from('training_data')
      .select('*')
      .eq('status', status)
      .order('source', { ascending: false })  // user_challenge before ai_decode
      .order('created_at', { ascending: true })
      .limit(200)
    res.json(data || [])
  } catch (err) { next(err) }
})

// GET /admin/training/counts — pending/approved/rejected counts
router.get('/training/counts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      supabase.from('training_data').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('training_data').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('training_data').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])
    res.json({ pending: pending.count || 0, approved: approved.count || 0, rejected: rejected.count || 0 })
  } catch (err) { next(err) }
})

// POST /admin/training/:id/approve
router.post('/training/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { finalMeaning } = req.body
    const updates = { status: 'approved', reviewed_at: new Date().toISOString() }
    if (finalMeaning?.trim()) updates.final_meaning = finalMeaning.trim()
    await supabase.from('training_data').update(updates).eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// POST /admin/training/:id/reject
router.post('/training/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('training_data')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /admin/training/export — download approved items as JSONL for fine-tuning
router.get('/training/export', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('training_data')
      .select('plate_text, state, ai_meaning, ai_confidence, user_meaning, verdict, final_meaning, source, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    const lines = (data || []).map(row => JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an expert interpreter of US vanity license plates. Return only valid JSON.' },
        { role: 'user',   content: `Plate: ${row.plate_text}\nState: ${row.state || 'unknown'}` },
        { role: 'assistant', content: JSON.stringify({
          most_likely_meaning: row.final_meaning,
          confidence: row.ai_confidence,
          source_note: row.source,
        }) },
      ],
    }))

    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Content-Disposition', `attachment; filename="tag-wizard-training-${new Date().toISOString().slice(0,10)}.jsonl"`)
    res.send(lines.join('\n'))
  } catch (err) { next(err) }
})

export default router
