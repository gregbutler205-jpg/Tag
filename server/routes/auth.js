import { Router } from 'express'
import { signToken, requireAuth } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// POST /auth/register — username + email, no password
router.post('/register', async (req, res, next) => {
  try {
    const { username, email } = req.body
    if (!username?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Username and email are required' })
    }

    // Username: 2–30 chars, letters/numbers/underscores/hyphens only
    const cleanUsername = username.trim()
    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be 2–30 characters' })
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, spaces, hyphens, and underscores' })
    }

    // Email: basic format check
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    // Check if username already taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('display_name', cleanUsername)
      .limit(1)

    if (existing?.length) {
      return res.status(400).json({ error: 'Username already taken — try another' })
    }

    // Create Supabase Auth user with random password (not used for login)
    const password = crypto.randomUUID()
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      user_metadata: { display_name: cleanUsername },
      email_confirm: true,
    })
    if (error) return res.status(400).json({ error: error.message })

    // Insert into public.users
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      display_name: cleanUsername,
    })
    if (insertError) console.warn('[register] users insert:', insertError.message)

    const token = signToken({ id: data.user.id, email: cleanEmail, name: cleanUsername })
    res.json({ token, user: { id: data.user.id, email: cleanEmail, name: cleanUsername } })
  } catch (err) {
    next(err)
  }
})

// POST /auth/login — username only
router.post('/login', async (req, res, next) => {
  try {
    const { username } = req.body
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required' })

    // Look up by display_name
    const { data: users, error } = await supabase
      .from('users')
      .select('id, display_name')
      .ilike('display_name', username.trim())
      .limit(1)

    if (error || !users?.length) {
      return res.status(404).json({ error: 'Username not found — check spelling or create an account' })
    }

    const user = users[0]

    // Get email from Supabase Auth
    const { data: authData } = await supabase.auth.admin.getUserById(user.id)
    const email = authData?.user?.email || ''

    const token = signToken({ id: user.id, email, name: user.display_name })
    res.json({ token, user: { id: user.id, email, name: user.display_name } })
  } catch (err) {
    next(err)
  }
})

// GET /auth/me — fetch current user's points + states from DB (for cross-device sync)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('display_name, total_points, avatar_base64')
      .eq('id', req.user.id)
      .single()

    const { data: states } = await supabase
      .from('state_collection')
      .select('state')
      .eq('user_id', req.user.id)

    res.json({
      id:              req.user.id,
      name:            userData?.display_name || req.user.name,
      email:           req.user.email,
      points:          userData?.total_points  || 0,
      statesCollected: states?.map(s => s.state) || [],
      avatar:          userData?.avatar_base64 || null,
    })
  } catch (err) { next(err) }
})

// POST /auth/sync-points — add earned points to DB total
router.post('/sync-points', requireAuth, async (req, res, next) => {
  try {
    const delta = parseInt(req.body.delta, 10)
    if (!delta || delta <= 0) return res.status(400).json({ error: 'Invalid delta' })

    const { error } = await supabase.rpc('add_points', {
      p_user_id: req.user.id,
      p_points:  delta,
    })
    if (error) console.warn('[sync-points rpc]', error.message)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// PUT /auth/profile — update display name and/or avatar
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { displayName, avatarBase64 } = req.body
    const updates = {}

    // ── Display name ──────────────────────────────────────────────────────────
    if (displayName !== undefined) {
      const trimmed = displayName?.trim()
      if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
        return res.status(400).json({ error: 'Name must be 2–30 characters' })
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('display_name', trimmed)
        .neq('id', req.user.id)
        .limit(1)

      if (existing?.length) {
        return res.status(400).json({ error: 'That username is already taken' })
      }

      updates.display_name = trimmed
    }

    // ── Avatar ────────────────────────────────────────────────────────────────
    if (avatarBase64 !== undefined) {
      // null = remove; data URL = set (max ~150 KB base64)
      if (avatarBase64 !== null && (
        !avatarBase64.startsWith('data:image/') || avatarBase64.length > 200000
      )) {
        return res.status(400).json({ error: 'Invalid avatar' })
      }
      updates.avatar_base64 = avatarBase64
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)

    if (error) return res.status(500).json({ error: error.message })

    // If display name changed, issue a fresh token with the new name
    if (updates.display_name) {
      const token = signToken({ id: req.user.id, email: req.user.email, name: updates.display_name })
      return res.json({ token, user: { id: req.user.id, email: req.user.email, name: updates.display_name } })
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
