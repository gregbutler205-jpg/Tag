import { Router } from 'express'
import { signToken } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// POST /auth/register — username + email, no password
router.post('/register', async (req, res, next) => {
  try {
    const { username, email } = req.body
    if (!username?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Username and email are required' })
    }

    // Check if username already taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('display_name', username.trim())
      .limit(1)

    if (existing?.length) {
      return res.status(400).json({ error: 'Username already taken — try another' })
    }

    // Create Supabase Auth user with random password (not used for login)
    const password = crypto.randomUUID()
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      user_metadata: { display_name: username.trim() },
      email_confirm: true,
    })
    if (error) return res.status(400).json({ error: error.message })

    // Insert into public.users
    await supabase.from('users').insert({
      id: data.user.id,
      display_name: username.trim(),
    }).catch(() => {})

    const token = signToken({ id: data.user.id, email: email.trim(), name: username.trim() })
    res.json({ token, user: { id: data.user.id, email: email.trim(), name: username.trim() } })
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

export default router
