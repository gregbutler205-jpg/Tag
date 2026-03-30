import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import platesRouter from './routes/plates.js'
import dailyRouter from './routes/daily.js'
import groupsRouter from './routes/groups.js'
import leaderboardRouter from './routes/leaderboard.js'
import authRouter from './routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'https://tag.iwonde.com', process.env.FRONTEND_URL].filter(Boolean) }))
app.use(express.json({ limit: '10mb' }))

app.use('/plates', platesRouter)
app.use('/daily', dailyRouter)
app.use('/groups', groupsRouter)
app.use('/leaderboard', leaderboardRouter)
app.use('/auth', authRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

// Serve built React frontend in production
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`iWonde Tag API running on :${PORT}`))
