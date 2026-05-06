import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import platesRouter from './routes/plates.js'
import dailyRouter from './routes/daily.js'
import groupsRouter from './routes/groups.js'
import roadtripRouter from './routes/roadtrip.js'
import leaderboardRouter from './routes/leaderboard.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import feedbackRouter from './routes/feedback.js'
import { generalLimiter, interpretLimiter, authLimiter, feedbackLimiter } from './lib/limiters.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'https://tag.iwonde.com', process.env.FRONTEND_URL].filter(Boolean) }))
app.use(express.json({ limit: '10mb' }))

app.use(generalLimiter)
app.use('/plates/interpret', interpretLimiter)
app.use('/plates/challenge', interpretLimiter)
app.use('/auth/login',       authLimiter)
app.use('/auth/register',    authLimiter)
app.use('/feedback',         feedbackLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/plates', platesRouter)
app.use('/daily', dailyRouter)
app.use('/groups', groupsRouter)
app.use('/road-trip', roadtripRouter)
app.use('/leaderboard', leaderboardRouter)
app.use('/auth', authRouter)
app.use('/admin', adminRouter)
app.use('/feedback', feedbackRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

// Serve built React frontend in production
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err)
  const isProd = process.env.NODE_ENV === 'production'
  res.status(500).json({ error: isProd ? 'Internal server error' : (err.message || 'Internal server error') })
})

app.listen(PORT, () => console.log(`iWonde Tag API running on :${PORT}`))
