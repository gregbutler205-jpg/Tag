import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import platesRouter from './routes/plates.js'
import dailyRouter from './routes/daily.js'
import groupsRouter from './routes/groups.js'
import leaderboardRouter from './routes/leaderboard.js'
import authRouter from './routes/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'https://iwondetag.com'] }))
app.use(express.json({ limit: '10mb' }))

app.use('/plates', platesRouter)
app.use('/daily', dailyRouter)
app.use('/groups', groupsRouter)
app.use('/leaderboard', leaderboardRouter)
app.use('/auth', authRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`iWonde Tag API running on :${PORT}`))
