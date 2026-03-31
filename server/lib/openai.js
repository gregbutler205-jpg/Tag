import OpenAI from 'openai'

// ── OpenAI client (used for OCR vision pipeline + moderation) ─────────────────
let _client = null
export function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in server/.env')
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

// ── Grok client (used for plate interpretation + challenge) ───────────────────
let _grokClient = null
function getGrokClient() {
  if (!_grokClient) {
    if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is not set in server/.env')
    _grokClient = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  }
  return _grokClient
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert interpreter of US vanity license plates.

Your job is to determine the most likely intended human meaning of a vanity plate.
Treat each plate as a phonetic, abbreviation, and cultural-reference puzzle.

Core interpretation rules:
1. Prefer the most socially plausible intended meaning, not the most literal or bizarre reading.
2. Prioritize how the plate sounds when spoken aloud.
3. Assume spaces may be missing and vowels may be dropped.
4. Reconstruct likely word boundaries before deciding meaning.
5. Prefer likely real human intent over raw mechanical decoding.
6. Interpret the plate as something a real person might choose to represent identity, humor, status, faith, hobbies, family, work, achievement, survival, or interests.
7. Do not force a meaning when the plate is highly ambiguous.
8. It is better to be uncertain than wrong.
9. If no strong clean reading exists, return "Meaning unclear" with low confidence.
10. If one interpretation is clearly best, present it cleanly rather than overcomplicating the result.
11. Keep explanations brief, practical, and in plain English.

Substitution and phonetic rules:
12. Consider common number and character substitutions, but do not apply them mechanically.
13. Test substitutions in context and choose the reading that creates the most natural clean phrase, name, or word.
14. Common substitution guidance:
    - 2 = to / too / two
    - 4 = for / four
    - 8 = ate / eight
    - 0 = O
    - 1 = I / L / one
    - 3 = E
    - 5 = S
    - 7 = T
15. A digit may represent more than one spoken form depending on context.
16. For example:
    - 8 may mean "ate," "eight," or function as part of a word that preserves the same sound
    - 2 may mean "to," "too," or "two"
    - 4 may mean "for" or "four"
    - 1 may sometimes stand in for "one," "won," "I," or "L," depending on context
17. Evaluate surrounding letters and choose the pronunciation that produces the most natural clean phrase, name, or word.
18. Prefer the reading that sounds most like something a real person would intentionally choose.

Names, identity, and human context:
19. Consider abbreviations, names, initials, nicknames, family roles, hobbies, professions, faith references, military references, sports references, regional slang, life events, achievements, and survival stories.
20. Consider that a plate may represent a first name, last name, nickname, initials, family role, or online handle.
21. If a name-based reading is stronger than a phrase-based reading, prefer the name-based reading.
22. When a plate appears to reflect a real person's identity, story, belief, survival event, or interest, prefer that interpretation over a mechanical decoding.
23. When the plate could reflect a life event, identity, hobby, achievement, profession, faith reference, or medical survival story, prefer those kinds of real human meanings over negative literal readings.

Foreign-language and classical phrase handling:
24. Consider that some vanity plates may represent Latin, Spanish, French, Italian, or other recognizable foreign-language phrases.
25. Pay special attention to compressed Latin phrases.
26. Vanity plates may remove spaces, vowels, or nonessential letters while preserving the sound pattern.
27. If a plate strongly resembles a recognizable phrase after compression, prefer that over a weak literal reading.
28. Treat classical, philosophical, religious, and scholarly references as plausible owner intent when the character pattern supports them.
29. When a foreign-language phrase is likely, briefly explain the source phrase and its meaning in English.
30. Do not force a foreign-language interpretation unless the compressed pattern is reasonably strong.

Vehicle and plate-context handling:
31. If the image clearly shows the vehicle make, model, trim, or strong vehicle type, use that only as a supporting clue.
32. Do not let vehicle context override a more plausible reading of the plate text.
33. Increase confidence only slightly unless the vehicle context strongly reinforces the interpretation.
34. If state information is available, consider regional slang, local universities, sports teams, landmarks, and common abbreviations tied to that state or region.
35. Use state information only as supporting context, not as the primary basis for interpretation.
36. If the plate design suggests military, college, charity, disability, veteran, faith, or alumni affiliation, use that as a supporting clue.
37. Let specialty plate context slightly strengthen an otherwise plausible interpretation.

OCR-awareness instructions:
38. Consider common OCR mistakes before interpreting:
    - O ↔ 0
    - I ↔ 1 ↔ L
    - S ↔ 5
    - B ↔ 8
    - Z ↔ 2
    - G ↔ 6
39. If a more plausible clean interpretation appears after a likely OCR correction, allow that possibility.
40. Do not over-correct unless the improvement in plausibility is strong.

Alternative ranking and confidence:
41. If multiple clean meanings are plausible, rank them by real-world likelihood.
42. Provide alternatives only when they are genuinely plausible.
43. Do not pad the response with weak alternatives.
44. Confidence should be higher when:
    - the phrase is common
    - the phonetic pattern is strong
    - the compression is typical for vanity plates
    - vehicle or specialty-plate context supports it
45. Confidence should be lower when:
    - multiple readings are equally plausible
    - the phrase is obscure
    - the character pattern requires too many assumptions
    - no strong clean reading exists

Hard safety and tone rule:
46. Never return crude, vulgar, obscene, sexual, profane, or insulting interpretations.
47. Do not use them as the main interpretation.
48. Do not include them as alternatives.
49. If a plate could be interpreted that way, ignore that reading and choose the best clean interpretation instead.
50. If no clean interpretation is reasonably plausible, return "Meaning unclear" with low confidence and no vulgar alternatives.

Response format:
51. Return valid JSON only, using this exact structure:
{
  "plate": "string",
  "most_likely_meaning": "string",
  "confidence": 0-100,
  "category": "string",
  "why": "string",
  "alternatives": ["string"],
  "vehicle_context": {
    "make": "string or null",
    "model": "string or null",
    "type": "string or null",
    "used_in_interpretation": true,
    "effect_on_confidence": "none | minor | moderate"
  }
}

Category — use one of:
name, family, hobby, profession, sports, faith, military, health/survival, humor, luxury/status, performance/car culture, foreign phrase, unclear`

// ── Few-shot examples ─────────────────────────────────────────────────────────
// Included as alternating user/assistant turns to strongly guide output format and reasoning.
const EXAMPLES = [
  {
    plateText: 'NWLIVER', ctx: {},
    output: { plate: 'NWLIVER', most_likely_meaning: 'New liver', confidence: 83, category: 'health/survival', why: "This most likely refers to 'new liver,' which is a plausible personal survival or transplant-related meaning and is much more realistic than a harsh literal reading.", alternatives: ['New life giver'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'XNTHILO', ctx: {},
    output: { plate: 'XNTHILO', most_likely_meaning: 'Ex nihilo', confidence: 86, category: 'foreign phrase', why: "This appears to be a compressed stylized spelling of the Latin phrase 'ex nihilo,' meaning 'out of nothing.' Vanity plates often remove spaces and vowels while preserving the sound pattern.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'JP4X4', ctx: { vehicleMake: 'Jeep', vehicleModel: 'Wrangler', vehicleType: 'SUV' },
    output: { plate: 'JP4X4', most_likely_meaning: 'Jeep 4x4', confidence: 91, category: 'performance/car culture', why: 'The plate strongly matches an off-road vehicle meaning, and the Jeep Wrangler context reinforces that interpretation.', alternatives: ['Jeep for 4x4 use'], vehicle_context: { make: 'Jeep', model: 'Wrangler', type: 'SUV', used_in_interpretation: true, effect_on_confidence: 'moderate' } },
  },
  {
    plateText: 'EVLVR', ctx: { vehicleMake: 'Tesla', vehicleModel: 'Model 3', vehicleType: 'sedan' },
    output: { plate: 'EVLVR', most_likely_meaning: 'EV lover', confidence: 88, category: 'performance/car culture', why: "This is a strong phonetic compression of 'EV lover,' and the Tesla context supports the interpretation.", alternatives: ['Electric vehicle lover'], vehicle_context: { make: 'Tesla', model: 'Model 3', type: 'sedan', used_in_interpretation: true, effect_on_confidence: 'minor' } },
  },
  {
    plateText: 'LV2RUN', ctx: {},
    output: { plate: 'LV2RUN', most_likely_meaning: 'Love to run', confidence: 93, category: 'hobby', why: "This is a standard phonetic vanity plate compression that clearly reads as 'love to run.'", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'K8', ctx: {},
    output: { plate: 'K8', most_likely_meaning: 'Kate', confidence: 92, category: 'name', why: "The digit 8 is being used for the 'ate' sound, producing the common name 'Kate.'", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'W8', ctx: {},
    output: { plate: 'W8', most_likely_meaning: 'Wait', confidence: 84, category: 'humor', why: "The digit 8 is used for the 'ate' sound, making the plate read as 'wait.'", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'GR8DAY', ctx: {},
    output: { plate: 'GR8DAY', most_likely_meaning: 'Great day', confidence: 95, category: 'humor', why: "This is a very common vanity plate compression where 8 supplies the 'ate' sound in 'great.'", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'QRTZN', ctx: {},
    output: { plate: 'QRTZN', most_likely_meaning: 'Meaning unclear', confidence: 24, category: 'unclear', why: 'No clean interpretation is strong enough to return confidently.', alternatives: ['Quartz one', 'Cartizen'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
]

// ── User message builder ──────────────────────────────────────────────────────
function buildUserMessage(plateText, ctx = {}) {
  return `Plate: ${plateText}
State: ${ctx.state || 'unknown'}
Vehicle make: ${ctx.vehicleMake || 'unknown'}
Vehicle model: ${ctx.vehicleModel || 'unknown'}
Vehicle type: ${ctx.vehicleType || 'unknown'}
Specialty plate hints: ${ctx.specialtyPlateHints || 'none'}`
}

// ── Messages array with few-shot ──────────────────────────────────────────────
function buildMessages(plateText, ctx = {}) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (const ex of EXAMPLES) {
    messages.push({ role: 'user',      content: buildUserMessage(ex.plateText, ex.ctx) })
    messages.push({ role: 'assistant', content: JSON.stringify(ex.output) })
  }
  messages.push({ role: 'user', content: buildUserMessage(plateText, ctx) })
  return messages
}

// ── Fallback object ───────────────────────────────────────────────────────────
function buildFallback(plateText) {
  return {
    plate: plateText,
    most_likely_meaning: 'Meaning unclear',
    confidence: 15,
    category: 'unclear',
    why: 'The interpretation could not be resolved reliably.',
    alternatives: [],
    vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' },
  }
}

// ── Safe JSON parse + field validation ───────────────────────────────────────
function safeParseJSON(raw, plateText) {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed  = JSON.parse(cleaned)

    // Require the two most important fields
    if (typeof parsed.most_likely_meaning !== 'string' || typeof parsed.confidence !== 'number') {
      throw new Error('Missing required fields')
    }

    // Ensure arrays are arrays
    if (!Array.isArray(parsed.alternatives)) parsed.alternatives = []

    // Ensure vehicle_context shape
    if (!parsed.vehicle_context || typeof parsed.vehicle_context !== 'object') {
      parsed.vehicle_context = buildFallback(plateText).vehicle_context
    }

    return parsed
  } catch (err) {
    console.warn('[interpretPlate] JSON parse/validation failed:', err.message, '— using fallback')
    return buildFallback(plateText)
  }
}

// ── Rarity + points from confidence ──────────────────────────────────────────
// High confidence (easy plate) → common; low confidence (hard/ambiguous) → rarer
function mapRarity(confidence) {
  const difficulty = 100 - confidence
  if (difficulty >= 90) return 'legendary'
  if (difficulty >= 75) return 'epic'
  if (difficulty >= 50) return 'rare'
  if (difficulty >= 25) return 'uncommon'
  return 'common'
}

const POINT_MULTIPLIERS = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 }

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * interpretPlate(plateText, context)
 *
 * @param {string} plateText
 * @param {object} context — { state, vehicleMake, vehicleModel, vehicleType, specialtyPlateHints }
 * @returns {object} — app-shape result with backward-compatible fields
 */
export async function interpretPlate(plateText, context = {}) {
  const messages = buildMessages(plateText, context)

  const response = await getGrokClient().chat.completions.create({
    model:                 process.env.INTERPRETATION_MODEL || 'grok-3',
    messages,
    temperature:           0.2,
    max_tokens:            400,
  })

  const raw        = safeParseJSON(response.choices[0].message.content, plateText)
  const confidence = Math.max(0, Math.min(100, raw.confidence))
  const rarity     = mapRarity(confidence)
  const points     = Math.round(50 * (POINT_MULTIPLIERS[rarity] ?? 1))

  return {
    // Backward-compatible fields used by PlateCard + routes
    primary:        raw.most_likely_meaning,
    alternatives:   raw.alternatives,
    category:       raw.category || 'unclear',
    rarity,
    difficulty:     100 - confidence,
    humorScore:     raw.category === 'humor' ? Math.min(confidence, 90) : 0,
    explanation:    raw.why || '',
    confidence:     parseFloat((confidence / 100).toFixed(2)),
    points,
    // Extended fields
    vehicleContext: raw.vehicle_context ?? null,
  }
}

// ── Content moderation ────────────────────────────────────────────────────────
export async function moderatePlate(plateText) {
  const response = await getClient().moderations.create({ input: plateText })
  return response.results[0].flagged
}

// ── Challenge / user override ─────────────────────────────────────────────────
/**
 * challengeInterpretation(plateText, aiMeaning, userMeaning, context)
 *
 * Asks the model to judge whether the user's interpretation is plausible or
 * better than the AI's original answer.
 *
 * Returns:
 *   { verdict: 'agree'|'partial'|'disagree', reasoning: string, bonusPoints: number, revisedMeaning: string|null }
 */
export async function challengeInterpretation(plateText, aiMeaning, userMeaning, context = {}) {
  const systemMsg = `You are a fair judge of US vanity license plate interpretations.
You will be given a plate, the AI's interpretation, and a user's own interpretation.

Your job:
1. Decide whether the user's interpretation is plausible, better, or not supported.
2. Be generous — if the user's reading is reasonable and clean, agree or partially agree.
3. Never endorse crude, vulgar, or offensive meanings regardless of who proposed them.
4. Return ONLY valid JSON using this exact shape:
{
  "verdict": "agree" | "partial" | "disagree",
  "reasoning": "one or two plain-English sentences explaining your verdict",
  "revised_meaning": "string or null — if you agree or partially agree, return the best combined meaning; otherwise null"
}

Verdict guidance:
- "agree"    — user's reading is clearly plausible and at least as good as the AI's; award full bonus
- "partial"  — user's reading has merit but is less certain or complementary; award half bonus
- "disagree" — user's reading is not well-supported by the characters or is implausible`

  const userMsg = `Plate: ${plateText}
State: ${context.state || 'unknown'}
AI interpretation: ${aiMeaning}
User interpretation: ${userMeaning}`

  const response = await getGrokClient().chat.completions.create({
    model:                 process.env.INTERPRETATION_MODEL || 'grok-3',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user',   content: userMsg   },
    ],
    temperature:           0.2,
    max_tokens:            200,
  })

  let raw
  try {
    const cleaned = response.choices[0].message.content
      .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    raw = JSON.parse(cleaned)
  } catch {
    raw = { verdict: 'disagree', reasoning: 'Could not evaluate the interpretation.', revised_meaning: null }
  }

  const verdict = ['agree', 'partial', 'disagree'].includes(raw.verdict) ? raw.verdict : 'disagree'
  const bonusPoints = verdict === 'agree' ? 75 : verdict === 'partial' ? 35 : 0

  return {
    verdict,
    reasoning:      raw.reasoning      || '',
    revisedMeaning: raw.revised_meaning || null,
    bonusPoints,
  }
}
