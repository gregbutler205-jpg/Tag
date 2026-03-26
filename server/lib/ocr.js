// Google Cloud Vision OCR for license plate text extraction
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
          features: [{ type: 'TEXT_DETECTION', maxResults: 5 }],
        }]
      })
    }
  )

  if (!response.ok) throw new Error('Vision API error')

  const data = await response.json()
  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations?.length) return null

  // First annotation is the full detected text; clean it for plate format
  const raw = annotations[0].description.replace(/\n/g, ' ').trim()

  // Extract the most plate-like token (2-8 alphanumeric chars)
  const tokens = raw.split(/\s+/)
  const plateToken = tokens
    .map(t => t.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    .filter(t => t.length >= 2 && t.length <= 8)
    .sort((a, b) => b.length - a.length)[0]

  return plateToken || raw.substring(0, 8).toUpperCase()
}
