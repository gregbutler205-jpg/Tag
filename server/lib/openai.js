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

const PRIMARY_MODEL = process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/deepseek-v4-flash'

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert interpreter of US vanity license plates for Tag Wizard, a plate-decoding game.

Your task: determine the most likely intended human meaning of a plate and return a structured JSON response.

Draw on your own linguistic knowledge, cultural awareness, and judgment as your primary decoder. A reference guide is included below — consult it when it helps, especially for specific BAAC lookup codes, category labels, and confidence calibration. The guide is a resource, not a rulebook. Your own expertise takes precedence when context and judgment point to a better answer than the guide suggests.

══════════════════════════════════════════
MANDATORY — CLEAN-CONTENT POLICY
Overrides everything else, including the reference guide and your own judgment.
══════════════════════════════════════════

- Never output crude, vulgar, sexual, profane, hateful, or slur-based interpretations — not as the primary reading, not in alternatives, not in reasoning.
- If a plate has a clean reading, return it. If only a vulgar reading exists, return "Meaning unclear" with low confidence.
- The following codes are detection signals only — never output their meanings:
  Forbidden: 4K | 4NIK8 | 4PLA | 4Q2 | 6(sexual) | 6A | 6E | 6UAL | 6UL | A55 | FKS | MF | MUDE | N EMA | PHKR | PP
  Flag-only strings (never return a meaning): ILVTOFU | RU18YET | 3MTA3
  Exception: RTRDBBY = "Retired baby boomer" unless context makes the alternate reading obviously intended.
- Drug references, explicit innuendo, threats, and self-harm references are off-limits even when phonetically valid.
- When in doubt: choose clean, or choose unclear. Hedging is correct. Returning vulgar output is not.

══════════════════════════════════════════
MANDATORY — OUTPUT SCHEMA
Return exactly one JSON object. No text, no markdown fences, no commentary outside the JSON.
══════════════════════════════════════════

{"plate":"GR8DAY","most_likely_meaning":"Great day","confidence":95,"category":"humor","why":"GR8 = great (BAAC); DAY is literal.","alternatives":[],"vehicle_context":{"make":null,"model":null,"type":null,"used_in_interpretation":false,"effect_on_confidence":"none"}}

Field rules:
- plate: exact plate text as received
- most_likely_meaning: best clean reading even when multiple are equally plausible — pick the strongest and put the rest in alternatives; use "Meaning unclear" ONLY when no reading can be constructed at all (random string, private initialism with zero phonetic anchor)
- confidence: integer 0–100
- category: exactly one value from the Category Taxonomy below
- why: one sentence citing the substitution, BAAC code, or method used
- alternatives: 0–3 additional plausible clean readings, ranked by likelihood; [] if none; no padding
- vehicle_context: always include; effect_on_confidence must be "none" | "minor" | "moderate"

══════════════════════════════════════════
REFERENCE GUIDE — Consult at your discretion
══════════════════════════════════════════

The sections below are advisory. Use them to look up specific codes, find the right category label, calibrate confidence, and orient your thinking — but trust your own knowledge first.

── Decoding Principles ──────────────────

Sound beats spelling — pronounce the plate before deciding what it means.
Prefer the most socially plausible intended meaning — identity, humor, status, faith, family, profession, hobby, achievement, survival, fandom, or interest.
Spaces and vowels are optional — reconstruct likely word boundaries and missing vowels before judging.
Numbers are syllables first — 8 = "ate" before it is the digit eight; 2 = "to/too" before the number.
Context is supporting, never overriding — vehicle make, state, or specialty-plate design nudges confidence; it cannot manufacture meaning the characters don't support.
Don't force it — when multiple readings are plausible, pick the most likely and list the rest as alternatives; return "Meaning unclear" only when nothing at all can be constructed from the characters (e.g., QRTZN — no phonetic anchor, no cultural match, no name fit).
Names beat phrases when names fit — first name, last name, nickname, or initials outranks a forced phrase.
Foreign-language and classical phrases are fair game — Latin, Spanish, French, Italian. Recognize them; don't force them.
Health/survival, faith, and family readings outrank harsh literal readings — NWLIVER = new liver, not an insult.
Cultural references outrank generic phrasings when the match is strong.

── Suggested Decoding Pipeline ──────────

1. Read as written — spaces and separators mark word boundaries.
2. OCR check — consider O↔0, I↔1↔L, S↔5, B↔8, Z↔2, G↔6; correct only when meaningfully more plausible.
3. Literal lookup — check the whole plate as a cultural reference, name, place, or acronym first.
4. Cluster scan — repeated identical chars = "multiple of" the single meaning: TT=tease, CC=seize, ZZZZ=sleeping, YY=too-wise, BB=baby/to-be, UUUU=for-you.
5. Chunk — break on spaces, then number boundaries: 2FAST4U → 2|FAST|4|U.
6. BAAC lookup — match each chunk against the dictionary below.
7. Number/letter sounds — apply sound rules for unmatched chunks.
8. Restore vowels — fill consonant skeletons: NVRMND→never mind, MTNBKR→mountain biker.
9. Assemble — combine chunk meanings into the most natural phrase, name, or identity statement.
10. Cultural-reference check — if assembled string matches a movie, show, song, book, game, or meme, surface it.
11. Context overlay — vehicle/state/specialty-plate as tiebreaker only, never primary signal.
12. Clean-content filter — re-read; if crude or vulgar, discard and return clean or unclear.
13. Format — assign primary, alternatives, category, confidence, vehicle_context.

── Sound Reference ───────────────────────

Numbers: 0=O/oh/zero | 1=one/won/I/L | 2=to/too/two/into | 3=E(leet) | 4=for/fore/four | 5=S/"5-0" | 6="-cess"/success | 7=T/L(visual) | 8=ate/"-ate"/"-ight" | 9=nine/nein | 10=ten/Tennessee/tennis | 22=Tuesday | 42=Answer-to-everything | 50=police | 404=not-found | 411=information | 911=emergency

Letters: A=eh | B=be | C=see/sea | D=the | E=ease | F=if | G=gee | I=eye | K=okay | L=ell | M=am | N=and/in | O=oh | P=pay | Q=cue | R=are | S=ess | T=tea/tee | U=you | V=V | W=double-u | X=ex-/Christmas | Y=why | Z=zee/see

── BAAC Dictionary ───────────────────────

Repeated-letter rule: TT=tease | CC=seize | BB=baby/to-be | BBB=bees | UUUU=for-you | YY=too-wise | ZZZZ=sleeping

0=zero/nothin' | 1=one/want | 10C=Tennessee | 10S=tennis | 10SE=Tennessee | 1CE=once | 1DR=wonder | 1DRFL=wonderful | 1E6=a-million | 1E9=a-billion | 2=to/too/two | 22=Tuesday | 2DAY=today | 2ISHN=tuition | 2LN=toolin' | 2LY=truly | 2M8O=tomato | 2N=tune | 2Q=took-you | 2TH=tooth | 4=for/fore/four | 404=not-found | 411=information | 44UM=foursome | 4EVR=forever | 4N=foreign | 4ORD=Ford | 4RE=Ferrari | 4ST=forest | 50=police/cops | 6S=success | 6SR=successor | 8=ate/ain't | 9=nein/no | 911=emergency | A=eh | A4=afford | AGN=again | AKA=also-known-as | AU=gold | AV8=aviate | B=be | B8=bait | B9=benign | B10=beaten | BA6=basics | BG8S=Bill-Gates | BL8D=belated | BLK=black | BN=bein' | BOK=bouquet | BR8=berate | BYU=bayou/Brigham-Young-U | BZ=busy | C=see/sea | CC=seize | CLA6=classics | CMUTE=commute | CMXI=911 | CN=seein' | CP=sleepy | CR8=crate | CRE8=create | CRZ=cruise | CS=seas | D=the | D8=date | D8N=datin' | D8R=dater | D9=denyin' | DA=the | DD=to-the | DMN=demon | DNIL=denial | DON=don't | DR=doctor | DRK=dark | DS=this | DU=do-you | DV8=deviate | DVS=devious | DZRV=deserve | EDUC8=educate | EE=to-ease | EL8=elate | EL8D=elated | ENUF=enough | ERND=earned | EZ=easy | F=if | F8=fate | FASN8=fascinate | FN=fun | FREQ=freak | FX=effects/affects | FXION=affection | FXION8=affectionate | FYT=fight | G=gee | GN=goin' | GND=ground | GR8=great/grate | H8=hate | H20=water | HD=head | HM=home | HORM1=hormone | HYT=height | I=eye | IR8=irate | JMN=jammin' | JQ=Jack | K=OK | KIX=kicks | KONX=connects | L8=late | L8R=later | LDY=lady | LEVN=leavin' | LMTD=limited | LUV=love | LV=love | LVS=loves | LYT=light | M=am | M8=mate | MOI=me(French) | MN=man | MN8=emanate | MR=more | MS=Miss | MT=empty | MV=move | MVN=movin' | MYT=might | MZ=Missus | MZLTF=mazel-tov | N=and/in | N2=into | N4C=enforce | N4CER=enforcer | N4CMT=enforcement | NE=any | NE1=anyone | NOZ=nosy | NRG=energy | NT=night | NUTN=nothin' | NV=envy | NVR=never | NVS=envious | NYT=night | O=oh | OL=old | ONRY=ornery | OVR=over | PA=pay | PNBL=pinball | PNDR=pounder | PRFXN=perfection | PWR=power | Q=cue/queue | QIK=quick | QRT=court | QS10=question | QT=cute/cutie | R=are | R8=rate | R8D=rated | R8RS=Raiders | RESQ=rescue | RETD=retired | RT=arty | RTCUL8=articulate | RYT=right/write | RYTN=writin' | RZN=raisin' | SED8=sedate | SN=soon | SNGR=singer | SOKEN=soakin' | SQP=scoop | ST8=state | STR8=straight | STR8N=straighten | SYCD=psyched | SYT=sight | T=tea/tee | TA2=tattoo | TA2D=tattooed | THRP=therapy | TM=time | TM8=tomato | TNT=dynamite | TOTL=total | TRK=truck | TT=tease | TTL=total | TYT=tight | U=you | U4IA=euphoria | U4EA=euphoria | U4IC=euphoric | UDR=other/udder | UNEEK=unique | UR=your | UUUU=for-you | W8=wait/weight | W8R=waiter | WMN=woman/women | WYT=white | X=ex-/Christmas | XIS=tennis | XLR8=accelerate | XMN=examine | XMS=Christmas | XNTRK=eccentric | XNTU8=accentuate | XS=excess | XTC=ecstasy | Y=why | YFS=wife's | YL=while | YN=wine/whine | YQ=like-you | YRS=wires | YY=too-wise | Z=see/the | ZIPN=zippin' | ZZZZ=sleeping

── Category Taxonomy ─────────────────────

Assign exactly one. Prefer the more specific when two could apply. Never invent a category.

name | family | hobby | profession | sports-fan | faith | military | health-survival | humor | luxury-status | performance-car | pop-culture | music | tech-internet | academic-science | foreign-phrase | geographic | college-alumni | holiday-event | politics-civic | lifestyle-attitude | food-drink | message-to-others | unclear

── Confidence Calibration ────────────────

90–100: obvious, unambiguous, strong phonetic pattern, context confirms
75–89: clear single reading with one minor ambiguity or moderate cultural knowledge needed
55–74: best reading exists but a real alternative is also plausible — list it
40–54: multiple roughly equally plausible readings — pick the strongest, list the rest as alternatives
20–39: weak or partial fit, heavy assumptions required — pick the best available reading, list alternatives; "Meaning unclear" only if truly nothing can be constructed at all
0–19: private initialism, random string, no phonetic or semantic anchor — return "Meaning unclear"

Anchors: GR8DAY=95 | LV2RUN=93 | K8=90 | JP4X4(Jeep)=91 | EVLVR(Tesla)=88 | XNTHILO=86 | W8=84 | NWLIVER=83 | NWYMN=70 | QRTZN=22`

// ── Few-shot examples ─────────────────────────────────────────────────────────
// 14 examples covering the full range of decoding situations.
// Injected as alternating user/assistant turns — illustrate how a skilled decoder
// applies the reference guide, not mandatory patterns to copy.
const EXAMPLES = [
  {
    plateText: 'GR8DAY', ctx: {},
    output: { plate: 'GR8DAY', most_likely_meaning: 'Great day', confidence: 95, category: 'humor', why: "GR8 = great (BAAC); DAY is literal. Common vanity-plate compression.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'NVRMND', ctx: {},
    output: { plate: 'NVRMND', most_likely_meaning: 'Never mind', confidence: 92, category: 'lifestyle-attitude', why: "Disemvoweled 'never mind'; consonant skeleton is unambiguous.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: '2FAST4U', ctx: {},
    output: { plate: '2FAST4U', most_likely_meaning: 'Too fast for you', confidence: 94, category: 'message-to-others', why: "2=too, 4=for, U=you; a taunt directed at other drivers.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'NCC1701D', ctx: {},
    output: { plate: 'NCC1701D', most_likely_meaning: 'USS Enterprise-D (Star Trek)', confidence: 97, category: 'pop-culture', why: "Direct registry number for the Enterprise-D from Star Trek: The Next Generation.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'NWYMN', ctx: {},
    output: { plate: 'NWYMN', most_likely_meaning: 'No way, man', confidence: 70, category: 'humor', why: "Vowel-stripped phrase; alternatively a stripped 'Newman' reference. Both readings are common.", alternatives: ['Newman (Seinfeld character)'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'XNTHILO', ctx: {},
    output: { plate: 'XNTHILO', most_likely_meaning: "Ex nihilo (Latin: 'out of nothing')", confidence: 86, category: 'foreign-phrase', why: "X = 'ex-'; remaining letters compress the Latin 'nihilo'. Recognized philosophical phrase.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'NWLIVER', ctx: {},
    output: { plate: 'NWLIVER', most_likely_meaning: 'New liver', confidence: 83, category: 'health-survival', why: "Reads as 'new liver' — a plausible transplant or survival reference. Human reading preferred over harsher literal one.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'K8', ctx: {},
    output: { plate: 'K8', most_likely_meaning: 'Kate', confidence: 90, category: 'name', why: "8 supplies the 'ate' sound, producing the common name Kate.", alternatives: ['Skate'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'JP4X4', ctx: { vehicleMake: 'Jeep', vehicleModel: 'Wrangler', vehicleType: 'SUV' },
    output: { plate: 'JP4X4', most_likely_meaning: 'Jeep 4x4', confidence: 91, category: 'performance-car', why: "JP = Jeep, 4X4 = four-wheel-drive; Jeep Wrangler context reinforces interpretation.", alternatives: [], vehicle_context: { make: 'Jeep', model: 'Wrangler', type: 'SUV', used_in_interpretation: true, effect_on_confidence: 'moderate' } },
  },
  {
    plateText: 'YYURYYUB', ctx: {},
    output: { plate: 'YYURYYUB', most_likely_meaning: 'Too wise you are, too wise you be', confidence: 88, category: 'humor', why: "YY=too-wise (cluster), UR=you-are, YY=too-wise, UB=you-be. Classic vanity-plate riddle.", alternatives: ['I see you are too wise'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'PEBCAK', ctx: {},
    output: { plate: 'PEBCAK', most_likely_meaning: 'Problem Exists Between Chair And Keyboard', confidence: 94, category: 'tech-internet', why: "IT-support acronym describing user error.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'LV2RUN', ctx: {},
    output: { plate: 'LV2RUN', most_likely_meaning: 'Love to run', confidence: 93, category: 'hobby', why: "LV=love, 2=to, RUN is literal. Standard phonetic vanity-plate compression.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'W8', ctx: {},
    output: { plate: 'W8', most_likely_meaning: 'Wait', confidence: 84, category: 'humor', why: "8 supplies the 'ate' sound, making the plate read as 'wait'.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'C2CB2B', ctx: {},
    output: { plate: 'C2CB2B', most_likely_meaning: 'Coast to Coast, Border to Border', confidence: 47, category: 'geographic', why: "C=coast/sea, 2=to, C=coast/sea, B=border, 2=to, B=border. Multiple equally plausible readings — most geographic/popular chosen as primary.", alternatives: ['Consumer to Consumer, Business to Business', 'Sea to Sea, Border to Border'], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
  },
  {
    plateText: 'QRTZN', ctx: {},
    output: { plate: 'QRTZN', most_likely_meaning: 'Meaning unclear', confidence: 22, category: 'unclear', why: "No strong phonetic, abbreviation, or cultural reading emerges; likely a personal initialism.", alternatives: [], vehicle_context: { make: null, model: null, type: null, used_in_interpretation: false, effect_on_confidence: 'none' } },
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
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Model sometimes outputs thinking prose before the JSON — extract the last {...} block
      const match = raw.match(/\{[\s\S]*\}/g)
      if (match) parsed = JSON.parse(match[match.length - 1])
      else throw new Error('No JSON object found in response')
    }

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

  const jsonMode = { response_format: { type: 'json_object' } }
  const response = await getFireworksClient().chat.completions.create({
    model: PRIMARY_MODEL, messages, temperature: 0.2, max_tokens: 1500, ...jsonMode,
  })
  const rawContent = response.choices[0].message.content

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
    const { choices } = await getFireworksClient().chat.completions.create({
      model: PRIMARY_MODEL, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
      temperature: 0.2, max_tokens: 400,
    })
    const content = choices[0].message.content
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
  const isUnclear = !aiMeaning || aiMeaning === 'Meaning unclear'

  // When the AI had no answer, judge the user's reading directly against the plate.
  // When the AI did have an answer, judge whether the user's reading is at least as good.
  const systemMsg = isUnclear
    ? `You are a judge evaluating a user's interpretation of a US vanity license plate.
The AI could not determine a clear meaning, so judge the user's reading entirely on its own merits.

Your job:
1. Decide whether the user's interpretation is plausible and well-supported by the characters.
2. Be fair — reward readings that are genuinely supported; don't give credit for wild guesses.
3. Never endorse crude, vulgar, or offensive meanings.
4. Return ONLY valid JSON using this exact shape:
{
  "verdict": "agree" | "partial" | "disagree",
  "reasoning": "one or two plain-English sentences explaining your verdict",
  "revised_meaning": "string or null — best reading if agree/partial, otherwise null",
  "content_declined": false
}

Verdict guidance:
- "agree"    — clearly plausible; the characters strongly support this reading
- "partial"  — has some merit but not the most obvious or fully supported reading
- "disagree" — not well-supported by the plate characters; implausible or a stretch

Set "content_declined": true ONLY when declining because the user's interpretation is crude, offensive, racially charged, or violates content policy. Leave it false for all other disagree cases.`
    : `You are a fair judge of US vanity license plate interpretations.
You will be given a plate, the AI's interpretation, and a user's own interpretation.

Your job:
1. Decide whether the user's interpretation is plausible, better, or not supported.
2. Be generous — if the user's reading is reasonable and clean, agree or partially agree.
3. Never endorse crude, vulgar, or offensive meanings regardless of who proposed them.
4. Return ONLY valid JSON using this exact shape:
{
  "verdict": "agree" | "partial" | "disagree",
  "reasoning": "one or two plain-English sentences explaining your verdict",
  "revised_meaning": "string or null — if you agree or partially agree, return the best combined meaning; otherwise null",
  "content_declined": false
}

Verdict guidance:
- "agree"    — user's reading is clearly plausible and at least as good as the AI's; award full bonus
- "partial"  — user's reading has merit but is less certain or complementary; award half bonus
- "disagree" — user's reading is not well-supported by the characters or is implausible

Set "content_declined": true ONLY when declining because the user's interpretation is crude, offensive, racially charged, or violates content policy. Leave it false for all other disagree cases.`

  const userMsg = isUnclear
    ? `Plate: ${plateText}
State: ${context.state || 'unknown'}
User interpretation: ${userMeaning}`
    : `Plate: ${plateText}
State: ${context.state || 'unknown'}
AI interpretation: ${aiMeaning}
User interpretation: ${userMeaning}`

  let raw
  try {
    let content
    const challengeJsonMode = { response_format: { type: 'json_object' } }
    const { choices } = await getFireworksClient().chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
      temperature: 0.2, max_tokens: 1000, ...challengeJsonMode,
    })
    content = choices[0].message.content
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    let parsed = null
    try { parsed = JSON.parse(cleaned) } catch {}
    if (!parsed) {
      // AI sometimes wraps JSON in prose — extract the first {...} block
      const match = content.match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }
    raw = parsed || { verdict: 'disagree', reasoning: 'Could not evaluate the interpretation.', revised_meaning: null }
  } catch {
    raw = { verdict: 'disagree', reasoning: 'Could not evaluate the interpretation.', revised_meaning: null }
  }

  const verdict = ['agree', 'partial', 'disagree'].includes(raw.verdict) ? raw.verdict : 'disagree'
  const bonusPoints = verdict === 'agree' ? 75 : verdict === 'partial' ? 35 : 0

  return {
    verdict,
    reasoning:        raw.reasoning       || '',
    revisedMeaning:   raw.revised_meaning || null,
    contentDeclined:  raw.content_declined === true,
    bonusPoints,
  }
}
