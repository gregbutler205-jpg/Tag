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

// ── Fireworks client (primary — DeepSeek-V4-Flash) ───────────────────────────
let _fireworksClient = null
function getFireworksClient() {
  if (!_fireworksClient) {
    if (!process.env.FIREWORKS_API_KEY) throw new Error('FIREWORKS_API_KEY is not set in server/.env')
    _fireworksClient = new OpenAI({ apiKey: process.env.FIREWORKS_API_KEY, baseURL: 'https://api.fireworks.ai/inference/v1' })
  }
  return _fireworksClient
}

// ── Grok client (fallback — Grok-3) ──────────────────────────────────────────
let _grokClient = null
function getGrokClient() {
  if (!_grokClient) {
    if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is not set in server/.env')
    _grokClient = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  }
  return _grokClient
}

const PRIMARY_MODEL  = process.env.FIREWORKS_MODEL  || 'accounts/fireworks/models/deepseek-v4-flash'
const FALLBACK_MODEL = process.env.FALLBACK_MODEL   || 'grok-3'

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

Vanity plate abbreviation reference (BAAC guide):
Use the following known vanity plate codes as a reference when decoding plates. These can appear alone or combined with other characters. Multiple repeated letters equal a multiple of the single-letter meaning (e.g., TT = tease, CC = seize).

Numbers as sounds/words:
0=zero/nothin' | 1=one/want | 2=to/too/two (also starts "to"-sound words: 2DAY=today, 2TH=tooth, 2N=tune, 2LY=truly, 2M8O=tomato, 2Q=took you) | 4=for/fore/four (also replaces "fo": 4ORD=ford, 4EVR=forever, 4N=foreign, 4ST=forest, 4RE=Ferrari, 4PLA=foreplay) | 6=sex/sexy (6A=sexy, 6UAL=sexual, 6S=success, 6SR=successor) | 8=ate/ain't | 9=nein(no) | 0=O substitute

Number combos: 10C=Tennessee | 10S=tennis | 1CE=once | 1DR=wonder | 1DRFL=wonderful | 1E6=a million | 1E9=a billion | 22=Tuesday | 404=not found | 411=information | 44UM=foursome | 4K=fork | 4NIK8=fornicate | 4Q2=f-you-too | 50=police/cops | 911=emergency

Single letters as words:
A=eh | B=be | C=see/sea | D=the/de | F=if | G=gee | I=eye | K=ok/'kay | L=hell | M=am | N=and/in | O=oh | Q=cue/queue | R=are | T=tea/tee | U=you | Y=why | Z=see/the

Letter+number combos (selected):
A4=afford | A55=ass | AV8=aviate | B8=bait | B9=benign | B10=beaten | BA6=basics | BG8S=Bill Gates | BL8D=belated | BR8=berate | BYU=bayou/by-you | BZ=busy | CC=seize | CLA6=classics | CMUTE=commute | CR8=crate | CRE8=create | CRZ=cruise | D8=date | D8N=datin' | D8R=dater | D9=denyin' | DA=the | DMN=demon | DNIL=denial | DU=do-you | DVS=devious | DV8=deviate | DZRV=deserve | EDUC8=educate | EL8=elate | EL8D=elated | ENUF=enough | EZ=easy | FASN8=fascinate | F8=fate | FN=fun | FREQ=freak | FX=effects/affects | FXION=affection | FXION8=affectionate | GN=goin' | GND=ground | GR8=great/grate | H8=hate | H20=water | HD=head | HM=home | HORM1=hormone | HYT=height | IR8=irate | JMN=jammin' | KIX=kicks | L8=late | L8R=later | LDY=lady | LMTD=limited | LUV=love | LV=love | LVS=loves | LYT=light | M8=mate | MN=man | MN8=emanate | MR=more | MS=Miss | MT=empty | MV=move | MVN=movin' | MYT=might | MZ=Missus | MZLTF=mazel-tov | N2=into | N4C=enforce | N4CER=enforcer | NE=any | NE1=anyone | NOZ=nosy | NRG=energy | NT=night | NUTN=nothin' | NV=envy | NVR=never | NVS=envious | NYT=night | OL=old | ONRY=ornery | OVR=over | PA=pay | PNBL=pinball | PP=pee-pee | PRFXN=perfection | PWR=power | QIK=quick | QRT=court | QS10=question | QT=cute/cutie | R8=rate | R8D=rated | R8RS=Raiders | RESQ=rescue | RETD=retired | RT=arty | RTCUL8=articulate | RYT=right/write | RYTN=writin' | RZN=raisin' | SED8=sedate | SN=soon | SNGR=singer | ST8=state | STR8=straight | STR8N=straighten | SYCD=psyched | SYT=sight | TA2=tattoo | TA2D=tattooed | THRP=therapy | TM=time | TM8=tomato | TNT=dynamite | TOTL=total | TRK=truck | TT=tease | TYT=tight | U4IA=euphoria | U4IC=euphoric | UDR=other(udder) | UNEEK=unique | UR=your | W8=wait/weight | W8R=waiter | WMN=woman/women | WYT=white | XIS=tennis | XLR8=accelerate | XMN=examine | XMS=Christmas | XNTRK=eccentric | XNTU8=accentuate | XS=excess | XTC=ecstasy | YFS=wife's | YL=while | YN=wine/whine | YQ=like-you | YRS=wires | YY=too-wise | ZIPN=zippin' | ZZZZ=sleeping

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

  let rawContent
  try {
    const response = await getFireworksClient().chat.completions.create({
      model: PRIMARY_MODEL, messages, temperature: 0.2, max_tokens: 400,
    })
    rawContent = response.choices[0].message.content
  } catch (err) {
    console.warn('[interpretPlate] Fireworks failed, falling back to Grok-3:', err.message)
    const response = await getGrokClient().chat.completions.create({
      model: FALLBACK_MODEL, messages, temperature: 0.2, max_tokens: 400,
    })
    rawContent = response.choices[0].message.content
  }

  const raw        = safeParseJSON(rawContent, plateText)
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

// ── Batch group guess scoring ─────────────────────────────────────────────────
/**
 * scoreGroupGuesses(plateText, aiMeaning, guesses, context)
 *
 * Scores all group guesses in a single API call.
 *
 * @param {string}   plateText  — the plate being judged
 * @param {string}   aiMeaning  — the AI's official interpretation
 * @param {Array}    guesses    — [{ id, guess }]
 * @param {object}   context    — { state }
 * @returns {Array}             — [{ id, verdict, bonusPoints, reasoning }]
 */
export async function scoreGroupGuesses(plateText, aiMeaning, guesses, context = {}) {
  if (!guesses.length) return []

  const systemMsg = `You are a fair judge of US vanity license plate interpretations.
You will receive a plate, the official AI interpretation, and several player guesses.
Score each player guess independently. Be generous — reward creative but reasonable readings.
Never endorse crude or offensive meanings.
Return ONLY valid JSON using this exact shape:
{
  "scores": [
    { "index": 1, "verdict": "agree"|"partial"|"disagree", "score": 75|35|0, "reason": "one sentence" },
    ...
  ]
}
Verdict guide: "agree" = clearly plausible (75 pts), "partial" = reasonable but uncertain (35 pts), "disagree" = not supported (0 pts)`

  const guessList = guesses.map((g, i) => `${i + 1}. "${g.guess}"`).join('\n')

  const userMsg = `Plate: ${plateText}
State: ${context.state || 'unknown'}
Official AI interpretation: "${aiMeaning}"

Player guesses to score:
${guessList}`

  let raw
  try {
    let content
    try {
      const response = await getFireworksClient().chat.completions.create({
        model: PRIMARY_MODEL, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        temperature: 0.2, max_tokens: 400,
      })
      content = response.choices[0].message.content
    } catch (err) {
      console.warn('[scoreGroupGuesses] Fireworks failed, falling back to Grok-3:', err.message)
      const response = await getGrokClient().chat.completions.create({
        model: FALLBACK_MODEL, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        temperature: 0.2, max_tokens: 400,
      })
      content = response.choices[0].message.content
    }
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    raw = JSON.parse(cleaned)
  } catch {
    // Both failed — mark all as disagree so the reveal still completes
    return guesses.map(g => ({ id: g.id, verdict: 'disagree', bonusPoints: 0, reasoning: 'Could not evaluate.' }))
  }

  return (raw.scores || []).map((s, i) => {
    const g = guesses[i]
    if (!g) return null
    const verdict = ['agree', 'partial', 'disagree'].includes(s.verdict) ? s.verdict : 'disagree'
    return {
      id:          g.id,
      verdict,
      bonusPoints: verdict === 'agree' ? 75 : verdict === 'partial' ? 35 : 0,
      reasoning:   s.reason || '',
    }
  }).filter(Boolean)
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

  let raw
  try {
    let content
    try {
      const response = await getFireworksClient().chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        temperature: 0.2, max_tokens: 200,
      })
      content = response.choices[0].message.content
    } catch (err) {
      console.warn('[challengeInterpretation] Fireworks failed, falling back to Grok-3:', err.message)
      const response = await getGrokClient().chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        temperature: 0.2, max_tokens: 200,
      })
      content = response.choices[0].message.content
    }
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
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
