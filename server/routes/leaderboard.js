import { Router } from 'express'
import supabase from '../lib/supabase.js'

const router = Router()

const FALLBACK = [
  { rank: 1, name: 'PlateHunter99', points: 4820, streak: 14 },
  { rank: 2, name: 'VanityKing', points: 3950, streak: 7 },
  { rank: 3, name: 'RoadTripPro', points: 3200, streak: 21 },
  { rank: 4, name: 'DecodeQueen', points: 2870, streak: 5 },
  { rank: 5, name: 'StatePlater', points: 2100, streak: 3 },
]

router.get('/', async (req, res, next) => {
  try {
    const { period = 'all' } = req.query

    let query = supabase.from('users').select('id, display_name, total_points, streak').order('total_points', { ascending: false }).limit(50)

    const { data } = await query
    if (!data?.length) return res.json(FALLBACK)

    res.json(data.map((u, i) => ({
      rank: i + 1,
      name: u.display_name,
      points: u.total_points,
      streak: u.streak,
    })))
  } catch {
    res.json(FALLBACK)
  }
})

export default router
