import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const RARITY_THRESHOLDS = {
  common: 0,
  uncommon: 25,
  rare: 50,
  epic: 75,
  legendary: 90,
}

export async function interpretPlate(plateText, stateHint = null) {
  const stateContext = stateHint ? ` The plate is from ${stateHint}.` : ''

  const prompt = `You are an expert at decoding vanity license plates. Analyze this vanity plate: "${plateText}"${stateContext}

Vanity plates use techniques like:
- Letter-number substitutions: 4=A/for, 8=ate/eight, 2=to/too/two, 3=E, 0=O, 1=I/one
- Phonetics: GR8=great, LV=love, B4=before, NE1=anyone
- Abbreviations: BFF, LOL, OMG, TMI
- Cultural references: movies, TV, sports, music
- Names and personal meanings
- Puns and wordplay

Return ONLY valid JSON with this exact structure:
{
  "primary": "the most likely intended meaning as a plain English phrase",
  "alternatives": ["second most likely meaning", "third most likely meaning"],
  "category": "one of: phonetic, abbreviation, cultural, humor, name, personal, unknown",
  "difficulty": 0-100,
  "humorScore": 0-100,
  "explanation": "brief explanation of how you decoded it"
}

Difficulty guide: 0-24=common, 25-49=uncommon, 50-74=rare, 75-89=epic, 90-100=legendary`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 400,
  })

  const raw = JSON.parse(response.choices[0].message.content)

  // Map difficulty to rarity tier
  let rarity = 'common'
  if (raw.difficulty >= 90) rarity = 'legendary'
  else if (raw.difficulty >= 75) rarity = 'epic'
  else if (raw.difficulty >= 50) rarity = 'rare'
  else if (raw.difficulty >= 25) rarity = 'uncommon'

  const multipliers = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 }
  const basePoints = 50
  const points = Math.round(basePoints * multipliers[rarity])

  return {
    primary: raw.primary,
    alternatives: raw.alternatives || [],
    category: raw.category || 'unknown',
    rarity,
    difficulty: raw.difficulty,
    humorScore: raw.humorScore,
    explanation: raw.explanation,
    points,
  }
}

export async function moderatePlate(plateText) {
  const response = await client.moderations.create({ input: plateText })
  return response.results[0].flagged
}
