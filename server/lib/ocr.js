/**
 * ocr.js — Google Cloud Vision OCR for license plate scanning
 *
 * Returns { plateText, detectedState } where:
 *   plateText     — the vanity/custom plate characters (largest text on plate)
 *   detectedState — 2-letter abbreviation if a US state name or slogan is found, else null
 */

// ── US State names → abbreviation ────────────────────────────────────────────
const STATE_NAME_MAP = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
  'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
  'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
  'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
  'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
  'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
  'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
  'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX',
  'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA',
  'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
  'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC',
}

// ── US State plate slogans → abbreviation ────────────────────────────────────
const SLOGAN_MAP = {
  // Alabama
  'HEART OF DIXIE': 'AL',
  // Alaska
  'THE LAST FRONTIER': 'AK', 'LAST FRONTIER': 'AK',
  // Arizona
  'GRAND CANYON STATE': 'AZ',
  // Arkansas
  'THE NATURAL STATE': 'AR', 'NATURAL STATE': 'AR',
  // California
  'GOLDEN STATE': 'CA',
  // Colorado
  'CENTENNIAL STATE': 'CO',
  // Connecticut
  'CONSTITUTION STATE': 'CT',
  // Delaware
  'THE FIRST STATE': 'DE', 'FIRST STATE': 'DE',
  // Florida
  'SUNSHINE STATE': 'FL',
  // Georgia
  'PEACH STATE': 'GA', 'EMPIRE STATE OF THE SOUTH': 'GA',
  // Hawaii
  'ALOHA STATE': 'HI',
  // Idaho
  'GEM STATE': 'ID', 'FAMOUS POTATOES': 'ID',
  // Illinois
  'LAND OF LINCOLN': 'IL',
  // Indiana
  'CROSSROADS OF AMERICA': 'IN', 'HOOSIER STATE': 'IN',
  // Iowa
  'HAWKEYE STATE': 'IA',
  // Kansas
  'SUNFLOWER STATE': 'KS',
  // Kentucky
  'BLUEGRASS STATE': 'KY', 'UNBRIDLED SPIRIT': 'KY',
  // Louisiana
  'PELICAN STATE': 'LA', "SPORTSMAN'S PARADISE": 'LA', 'SPORTSMANS PARADISE': 'LA',
  // Maine
  'VACATIONLAND': 'ME', 'THE WAY LIFE SHOULD BE': 'ME',
  // Maryland
  'OLD LINE STATE': 'MD',
  // Massachusetts
  'BAY STATE': 'MA', 'THE SPIRIT OF AMERICA': 'MA',
  // Michigan
  'GREAT LAKES STATE': 'MI', 'WATER WINTER WONDERLAND': 'MI', 'PURE MICHIGAN': 'MI',
  // Minnesota
  'NORTH STAR STATE': 'MN', 'LAND OF 10000 LAKES': 'MN', 'LAND OF TEN THOUSAND LAKES': 'MN',
  // Mississippi
  'MAGNOLIA STATE': 'MS',
  // Missouri
  'SHOW ME STATE': 'MO', 'SHOW-ME STATE': 'MO',
  // Montana
  'BIG SKY COUNTRY': 'MT', 'BIG SKY': 'MT',
  // Nebraska
  'CORNHUSKER STATE': 'NE', 'THE GOOD LIFE': 'NE',
  // Nevada
  'SILVER STATE': 'NV', 'BATTLE BORN': 'NV',
  // New Hampshire
  'GRANITE STATE': 'NH', 'LIVE FREE OR DIE': 'NH',
  // New Jersey
  'GARDEN STATE': 'NJ',
  // New Mexico
  'LAND OF ENCHANTMENT': 'NM',
  // New York
  'EMPIRE STATE': 'NY', 'EXCELSIOR': 'NY',
  // North Carolina
  'FIRST IN FLIGHT': 'NC', 'FIRST IN FREEDOM': 'NC',
  // North Dakota
  'PEACE GARDEN STATE': 'ND',
  // Ohio
  'BUCKEYE STATE': 'OH', 'THE HEART OF IT ALL': 'OH',
  // Oklahoma
  'SOONER STATE': 'OK',
  // Oregon
  'PACIFIC WONDERLAND': 'OR', 'PACIFIC WONDER LAND': 'OR',
  // Pennsylvania
  'KEYSTONE STATE': 'PA',
  // Rhode Island
  'OCEAN STATE': 'RI',
  // South Carolina
  'PALMETTO STATE': 'SC',
  // South Dakota
  'MOUNT RUSHMORE STATE': 'SD', 'GREAT FACES GREAT PLACES': 'SD',
  // Tennessee
  'VOLUNTEER STATE': 'TN', 'SOUNDS GOOD TO ME': 'TN',
  // Texas
  'LONE STAR STATE': 'TX',
  // Utah
  'BEEHIVE STATE': 'UT', 'THE BEEHIVE STATE': 'UT', 'LIFE ELEVATED': 'UT',
  // Vermont
  'GREEN MOUNTAIN STATE': 'VT',
  // Virginia
  'OLD DOMINION': 'VA', 'VIRGINIA IS FOR LOVERS': 'VA',
  // Washington
  'EVERGREEN STATE': 'WA',
  // West Virginia
  'MOUNTAIN STATE': 'WV', 'WILD WONDERFUL': 'WV', 'ALMOST HEAVEN': 'WV',
  // Wisconsin
  "AMERICA'S DAIRYLAND": 'WI', 'AMERICAS DAIRYLAND': 'WI', 'FORWARD': 'WI',
  // Wyoming
  'EQUALITY STATE': 'WY',
}

// Words that are never a vanity plate
const EXCLUDE_WORDS = new Set([
  'THE','AND','FOR','ARE','BUT','NOT','ALL','CAN','HER','HIS','HIM',
  'WAS','ONE','OUR','OUT','HOW','WHO','GET','USE','ITS','YOUR','WHAT',
  'FROM','THEY','WILL','WITH','THIS','HAVE','BEEN','WHEN','LOVE','CARE',
  'FREE','ONLY','JUST','LIKE','KNOW','DOES','MORE','ABOUT','SOME','MAKE',
  'ALSO','OVER','SUCH','MOST','INTO','THAN','SAME','STATE','COUNTY',
  // Common non-plate words often on plates
  'EXPIRES','MONTH','YEAR','VOID',
])

// ── Detect state from full-image text string ──────────────────────────────────
function detectStateFromText(fullText) {
  // Normalize: uppercase, collapse whitespace, strip non-alpha-numeric-space
  const upper = fullText.toUpperCase()
    .replace(/\n/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Check full state names (handles multi-word like "NEW YORK")
  for (const [name, abbr] of Object.entries(STATE_NAME_MAP)) {
    if (upper.includes(name)) return abbr
  }

  // Check plate slogans
  for (const [slogan, abbr] of Object.entries(SLOGAN_MAP)) {
    if (upper.includes(slogan)) return abbr
  }

  // Fallback: strip all spaces and try again (handles OCR spacing artifacts)
  const compact = upper.replace(/\s+/g, '')
  for (const [name, abbr] of Object.entries(STATE_NAME_MAP)) {
    if (compact.includes(name.replace(/\s+/g, ''))) return abbr
  }

  return null
}

// ── Detect state from individual word annotations ─────────────────────────────
// Catches cases where Vision splits multi-word state names across annotations
function detectStateFromWords(wordAnnotations) {
  if (!wordAnnotations?.length) return null

  // Collect all cleaned words
  const words = wordAnnotations
    .map(a => (a.description || '').toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(Boolean)

  // Try each consecutive 1, 2, and 3-word window against the state maps
  for (let i = 0; i < words.length; i++) {
    const w1 = words[i]
    const w2 = i + 1 < words.length ? words[i] + ' ' + words[i + 1] : null
    const w3 = i + 2 < words.length ? words[i] + ' ' + words[i + 1] + ' ' + words[i + 2] : null

    for (const candidate of [w1, w2, w3].filter(Boolean)) {
      if (STATE_NAME_MAP[candidate]) return STATE_NAME_MAP[candidate]
      if (SLOGAN_MAP[candidate])     return SLOGAN_MAP[candidate]
    }
  }
  return null
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function extractPlateText(imageBuffer) {
  const key = process.env.GOOGLE_CLOUD_VISION_KEY
  if (!key) throw new Error('GOOGLE_CLOUD_VISION_KEY not configured')

  const base64 = imageBuffer.toString('base64')

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 30 }],
        }]
      })
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Vision API HTTP ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json()

  // Vision API can return 200 with a per-request error object
  const apiErr = data.responses?.[0]?.error
  if (apiErr) {
    throw new Error(`Vision API error ${apiErr.code}: ${apiErr.message}`)
  }

  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations?.length) return { plateText: null, detectedState: null }

  // ── Word annotations (index 0 is the full-text composite) ───────────────
  const wordAnnotations = annotations.slice(1)

  // ── Detect state — try full text first, then word-by-word fallback ──────
  const fullText = annotations[0].description || ''
  const detectedState =
    detectStateFromText(fullText) ||
    detectStateFromWords(wordAnnotations)

  if (!wordAnnotations.length) {
    return { plateText: fallbackExtract(fullText), detectedState }
  }

  // ── Score each word by bounding box HEIGHT + track spatial position ──────
  // We collect ALL plate-format tokens so we can reconstruct multi-word plates
  // like "MZ MEK4" instead of only returning the tallest single token.
  const candidates = []
  for (const ann of wordAnnotations) {
    const clean = (ann.description || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()

    // Must be plate-format: 2–8 alphanumeric chars
    if (clean.length < 2 || clean.length > 8) continue

    // Skip common non-plate words
    if (EXCLUDE_WORDS.has(clean)) continue

    // Skip if it looks like a state name (single word match)
    if (STATE_NAME_MAP[clean]) continue

    // Calculate bounding box dimensions and position
    const verts = ann.boundingPoly?.vertices || []
    const ys = verts.map(v => v.y || 0).filter(y => y > 0)
    const xs = verts.map(v => v.x || 0).filter(x => x > 0)

    const boxHeight = ys.length ? Math.max(...ys) - Math.min(...ys) : 0
    const centerY   = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 9999
    const minX      = xs.length ? Math.min(...xs) : 9999   // leftmost edge for L→R sort

    candidates.push({ text: clean, boxHeight, centerY, minX })
  }

  if (!candidates.length) {
    return { plateText: fallbackExtract(fullText), detectedState }
  }

  // Sort by box height descending — tallest text = main plate text
  // Use centerY as tiebreaker (prefer vertically centered text)
  candidates.sort((a, b) => {
    const heightDiff = b.boxHeight - a.boxHeight
    if (Math.abs(heightDiff) > 3) return heightDiff  // clear height winner
    return a.centerY - b.centerY                       // tiebreak: more centered
  })

  console.log(
    '[OCR] candidates by height:',
    candidates.slice(0, 8).map(c =>
      `${c.text}(h=${c.boxHeight},y=${Math.round(c.centerY)},x=${Math.round(c.minX)})`
    ).join('  ')
  )
  console.log('[OCR] detected state:', detectedState)

  // ── Spatially group all tokens on the same visual row as the top candidate ─
  // Plates like "MZ MEK4" have two separate tokens that Vision reads as
  // individual words. We collect them all, sort left-to-right, and join.
  //
  // Same-row criteria:
  //   1. Center Y is within ±75% of the top token's box height (same horizontal band)
  //   2. Box height is at least 40% of the top token's height (filters out tiny state text)
  const topCandidate    = candidates[0]
  const rowTolerance    = Math.max(topCandidate.boxHeight * 0.75, 20)
  const minHeightThresh = topCandidate.boxHeight * 0.40

  const plateRow = candidates.filter(c =>
    Math.abs(c.centerY - topCandidate.centerY) <= rowTolerance &&
    c.boxHeight >= minHeightThresh
  )

  // Sort left-to-right by leftmost X coordinate
  plateRow.sort((a, b) => a.minX - b.minX)

  const plateText = plateRow.map(c => c.text).join(' ').trim()

  console.log('[OCR] plate row tokens:', plateRow.map(c => c.text).join(' | '))
  console.log('[OCR] final plateText:', plateText)

  return { plateText, detectedState }
}

function fallbackExtract(fullText) {
  const raw = fullText.replace(/\n/g, ' ').trim()
  const tokens = raw.split(/\s+/)
  return tokens
    .map(t => t.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    .filter(t => t.length >= 2 && t.length <= 8 && !EXCLUDE_WORDS.has(t) && !STATE_NAME_MAP[t])
    .sort((a, b) => b.length - a.length)[0] || null
}
