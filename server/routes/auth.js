import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { signToken } from '../lib/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    // Use Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { display_name: displayName || email.split('@')[0] },
    })
    if (error) return res.status(400).json({ error: error.message })

    const token = signToken({ id: data.user.id, email, name: displayName })
    res.json({ token, user: { id: data.user.id, email, name: displayName } })
  } catch (err) {
    next(err)
  }
})

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: 'Invalid credentials' })

    const name = data.user.user_metadata?.display_name || email.split('@')[0]
    const token = signToken({ id: data.user.id, email, name })
    res.json({ token, user: { id: data.user.id, email, name } })
  } catch (err) {
    next(err)
  }
})

export default router
