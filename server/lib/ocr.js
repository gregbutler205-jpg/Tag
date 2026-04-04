// Google Cloud Vision OCR for license plate text extraction
// Uses bounding box Y-position to prefer text near the top of the (already-cropped)
// image — where the plate lives — over text at the bottom (bumper stickers, etc.)

// Common English words that should NEVER be a license plate
const COMMON_WORDS = new Set([
  'THE','AND','FOR','YOU','ARE','BUT','NOT','ALL','CAN','HER','HIS','HIM',
  'WAS','ONE','OUR','OUT','HOW','WHO','GET','USE','ITS','YOUR','WHAT','THAT',
  'FROM','THEY','WILL','WITH','THIS','HAVE','BEEN','WHEN','THAN','THEN',
  'LOVE','CARE','THINK','APPLIES','EVERYONE','FREEDOM','ACTUALLY','PRIVILEGE',
  'DONT','FREE','ONLY','JUST','LIKE','KNOW','DOES','MORE','THEY','CARE',
  'WHAT','EVEN','ALSO','SOME','DOES','MAKE','TAKE','WANT','CALL','COME',
  'LOOK','GOOD','VERY','OVER','SUCH','MOST','UPON','INTO','THAN','SAME',
  'THOSE','THESE','COULD','WOULD','ABOUT','WHICH','THERE','THEIR','WHEN',
  'STATE','GRAND','CANYON','LEXUS','ARIZONA','TOYOTA','HONDA','FORD','BMW',
  'APPLIES','PRIVILEGE','ACTUALLY','APPLIES','FREEDOM','THINK',
])

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

  if (!response.ok) throw new Error('Vision API error')

  const data = await response.json()
  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations?.length) return null

  // annotations[0] = full text block (all detected text combined)
  // annotations[1+] = individual words with bounding boxes
  const wordAnnotations = annotations.slice(1)

  if (!wordAnnotations.length) {
    // No individual word data — fall back to longest non-English token
    return fallbackExtract(annotations[0].description)
  }

  // Determine image height from max Y coordinate across all word bounding boxes
  let maxY = 0
  for (const ann of wordAnnotations) {
    for (const v of (ann.boundingPoly?.vertices || [])) {
      if ((v.y || 0) > maxY) maxY = v.y
    }
  }
  const imageHeight = maxY || 600

  // Score each word annotation as a plate candidate
  const candidates = []
  for (const ann of wordAnnotations) {
    const clean = (ann.description || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()

    // Plates are 2–8 alphanumeric characters
    if (clean.length < 2 || clean.length > 8) continue

    // Calculate vertical center of this word's bounding box
    const verts = ann.boundingPoly?.vertices || []
    const ys = verts.map(v => v.y || 0).filter(y => y > 0)
    const centerY = ys.length
      ? (Math.min(...ys) + Math.max(...ys)) / 2
      : imageHeight * 0.5
    const yFraction = centerY / imageHeight  // 0 = top, 1 = bottom

    // Position score: strongly prefer upper portion of image (plate zone)
    // A word at y=0.1 gets 0.9; a word at y=0.9 gets 0.1
    const positionScore = (1 - yFraction) * 3  // weight ×3

    // Length bonus: prefer 4–7 chars (typical plate range)
    const lengthBonus = (clean.length >= 4 && clean.length <= 7) ? 0.5 : 0

    // Common English word penalty — these are never plates
    const wordPenalty = COMMON_WORDS.has(clean) ? -5 : 0

    // Pure number bonus — some plates are all-numeric but that's rare; slight penalty
    const numericPenalty = /^\d+$/.test(clean) ? -0.5 : 0

    const score = positionScore + lengthBonus + wordPenalty + numericPenalty

    candidates.push({ text: clean, score, yFraction: yFraction.toFixed(2) })
  }

  if (!candidates.length) {
    return fallbackExtract(annotations[0].description)
  }

  // Sort by score descending — highest scored token wins
  candidates.sort((a, b) => b.score - a.score)

  console.log(
    '[OCR] candidates:',
    candidates.slice(0, 6).map(c => `${c.text}(y=${c.yFraction},s=${c.score.toFixed(1)})`).join('  ')
  )

  return candidates[0].text
}

// Fallback: pick longest alphanumeric token that isn't a common English word
function fallbackExtract(fullText) {
  const raw = fullText.replace(/\n/g, ' ').trim()
  const tokens = raw.split(/\s+/)
  const plateToken = tokens
    .map(t => t.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    .filter(t => t.length >= 2 && t.length <= 8 && !COMMON_WORDS.has(t))
    .sort((a, b) => b.length - a.length)[0]

  return plateToken || raw.substring(0, 8).toUpperCase()
}
