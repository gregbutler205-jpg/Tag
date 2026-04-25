/**
 * visionPipeline.js — Model routing for plate text detection
 *
 * Flow:
 *   1. First pass  → FIRST_PASS_MODEL  (fast, cheap)
 *   2. Escalation  → ESCALATION_MODEL  (if confidence low / unreadable)
 *
 * Returns { text, meta } where meta contains full pipeline log.
 */

import OpenAI from 'openai'

// ── Config (all overridable via .env) ────────────────────────────────────────
const CFG = {
  FIRST_PASS_MODEL:            process.env.FIRST_PASS_MODEL            || 'gpt-4o-mini',
  ESCALATION_MODEL:            process.env.ESCALATION_MODEL            || 'gpt-4o',
  CONFIDENCE_THRESHOLD:        parseFloat(process.env.CONFIDENCE_THRESHOLD    || '0.85'),
  FIRST_PASS_DETAIL:           process.env.FIRST_PASS_DETAIL           || 'high',
  ESCALATION_DETAIL:           process.env.ESCALATION_DETAIL           || 'high',
  ESCALATION_REASONING_EFFORT: process.env.ESCALATION_REASONING_EFFORT || 'low',
  ESCALATION_USE_REASONING:    process.env.ESCALATION_USE_REASONING    === 'true',
}

// Words in notes that trigger escalation
const ESCALATION_TRIGGERS = [
  'glare', 'blur', 'obstruction', 'shadow', 'angle',
  'uncertain', 'partial', 'obscured', 'unclear', 'distorted',
  'graphic', 'emblem', 'logo', 'overlay', 'design',
]

// ── OpenAI client (lazy) ─────────────────────────────────────────────────────
let _client = null
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

// ── Prompt ───────────────────────────────────────────────────────────────────
const PLATE_PROMPT = `You are analyzing a cropped vehicle image to read the license or vanity plate text.

Return ONLY valid JSON with this exact structure:
{
  "detected_tag": "exact plate characters, uppercase, no spaces unless the plate has one — or null",
  "confidence": 0.85,
  "readable": true,
  "notes": "brief note on any quality issues: glare, blur, angle, obstruction, shadow, partial",
  "needs_escalation": false
}

Rules:
- detected_tag: 2–8 characters max; null if plate is not found or unreadable
- confidence: be conservative; 1.0 only if perfectly clear
- readable: false if plate characters are not clearly legible
- needs_escalation: true if you are uncertain about the result
- Many US specialty/vanity plates have state emblems, logos, or graphics overlaid on the plate area — sometimes directly on top of a letter. These are decorative design elements; read through them to identify the underlying character. Do not treat them as obstructions.`

// ── Helpers ──────────────────────────────────────────────────────────────────
function needsEscalation(r) {
  if (!r.detected_tag)                             return true
  if (r.confidence < CFG.CONFIDENCE_THRESHOLD)     return true
  if (!r.readable)                                 return true
  if (r.needs_escalation)                          return true
  const notes = (r.notes || '').toLowerCase()
  return ESCALATION_TRIGGERS.some(t => notes.includes(t))
}

function estimateCostUSD(model, dimensions) {
  // High-detail pricing: 512px tiles × 170 tokens + 85 base + ~50 prompt tokens
  const w = dimensions?.width  || 800
  const h = dimensions?.height || 600
  const tiles = Math.ceil(w / 512) * Math.ceil(h / 512)
  const tokens = tiles * 170 + 85 + 50
  const rate = model.includes('mini') ? 0.00000015 : 0.0000025
  return parseFloat((tokens * rate).toFixed(6))
}

async function callVision(imageBase64, model, detail, useReasoning = false) {
  const params = {
    model,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail,
          },
        },
        { type: 'text', text: PLATE_PROMPT },
      ],
    }],
    max_completion_tokens: 200,
  }

  if (useReasoning) {
    params.reasoning = { effort: CFG.ESCALATION_REASONING_EFFORT }
  }

  const response = await getClient().chat.completions.create(params)
  const raw = response.choices[0].message.content
  // Strip markdown fences if present (```json ... ```)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * detectPlateVision(imageBuffer, cropLog)
 *
 * @param {Buffer} imageBuffer  — preprocessed/cropped JPEG buffer
 * @param {object} cropLog      — log from imageCropper.cropForPlateDetection()
 * @returns {{ text: string|null, meta: object }}
 */
export async function detectPlateVision(imageBuffer, cropLog = {}) {
  const base64     = imageBuffer.toString('base64')
  const dimensions = cropLog.outputDimensions

  const pipelineLog = {
    // Crop metadata
    cropSucceeded:    cropLog.cropSucceeded    ?? false,
    plateZoneCropped: cropLog.plateZoneCropped ?? false,
    cropType:         cropLog.cropType         ?? 'unknown',
    usedFallback:     cropLog.usedFallback     ?? true,
    // Pipeline metadata
    escalated:        false,
    finalModel:       CFG.FIRST_PASS_MODEL,
    estimatedCostUSD: 0,
  }

  // ── First pass ─────────────────────────────────────────────────────────
  let firstResult
  try {
    firstResult = await callVision(base64, CFG.FIRST_PASS_MODEL, CFG.FIRST_PASS_DETAIL)
    pipelineLog.estimatedCostUSD += estimateCostUSD(CFG.FIRST_PASS_MODEL, dimensions)
    pipelineLog.firstPass = {
      model:        CFG.FIRST_PASS_MODEL,
      detected_tag: firstResult.detected_tag,
      confidence:   firstResult.confidence,
      readable:     firstResult.readable,
      notes:        firstResult.notes,
    }
    console.log('[VisionPipeline] First pass →', JSON.stringify(pipelineLog.firstPass))
  } catch (err) {
    console.error('[VisionPipeline] First pass error:', err.message)
    return { text: null, meta: { ...pipelineLog, error: err.message } }
  }

  // Return if confident
  if (!needsEscalation(firstResult)) {
    console.log(`[VisionPipeline] ✓ Accepted. Cost: $${pipelineLog.estimatedCostUSD}`)
    return {
      text: firstResult.detected_tag,
      meta: { ...pipelineLog, confidence: firstResult.confidence, notes: firstResult.notes },
    }
  }

  // ── Escalation ─────────────────────────────────────────────────────────
  console.log(`[VisionPipeline] ↑ Escalating → ${CFG.ESCALATION_MODEL}`)
  pipelineLog.escalated   = true
  pipelineLog.finalModel  = CFG.ESCALATION_MODEL

  let escalationResult
  try {
    escalationResult = await callVision(
      base64,
      CFG.ESCALATION_MODEL,
      CFG.ESCALATION_DETAIL,
      CFG.ESCALATION_USE_REASONING,
    )
    pipelineLog.estimatedCostUSD += estimateCostUSD(CFG.ESCALATION_MODEL, dimensions)
    pipelineLog.escalation = {
      model:        CFG.ESCALATION_MODEL,
      detected_tag: escalationResult.detected_tag,
      confidence:   escalationResult.confidence,
      readable:     escalationResult.readable,
      notes:        escalationResult.notes,
    }
    console.log('[VisionPipeline] Escalation →', JSON.stringify(pipelineLog.escalation))
    console.log(`[VisionPipeline] ✓ Done. Total cost: $${pipelineLog.estimatedCostUSD}`)
  } catch (err) {
    console.error('[VisionPipeline] Escalation error:', err.message)
    // Fall back to first-pass result
    return {
      text: firstResult.detected_tag,
      meta: { ...pipelineLog, confidence: firstResult.confidence, escalationError: err.message },
    }
  }

  return {
    text: escalationResult.detected_tag,
    meta: { ...pipelineLog, confidence: escalationResult.confidence, notes: escalationResult.notes },
  }
}
