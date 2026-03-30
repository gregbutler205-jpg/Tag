/**
 * imageCropper.js — Server-side heuristic image preprocessing
 *
 * Pipeline (in order of preference):
 *   1. Plate zone crop  (bottom-center of vehicle rear)
 *   2. Vehicle rear crop (bottom portion of full image)
 *   3. Full image reduced (fallback)
 *
 * Structured so the crop strategy can be swapped for a real CV detector
 * (YOLO, OpenCV) by replacing cropForPlateDetection() without touching
 * the vision pipeline or routes.
 */

import sharp from 'sharp'

// ── Configurable thresholds ──────────────────────────────────────────────────
// All values are fractions of the full image (or parent crop) dimension.
const CFG = {
  // Vehicle rear region — from this Y down to the bottom
  REAR_Y_START:   0.35,
  REAR_X_START:   0.05,
  REAR_X_END:     0.95,

  // Plate zone — within the rear crop
  PLATE_X_START:  0.15,
  PLATE_X_END:    0.85,
  PLATE_Y_START:  0.35,
  PLATE_Y_END:    0.80,

  // Output
  MAX_WIDTH:      800,
  JPEG_QUALITY:   85,
  MIN_CROP_AREA:  4000, // px² — skip crop if smaller than this
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function calcRegion(W, H, xStart, xEnd, yStart, yEnd) {
  const left   = Math.round(W * xStart)
  const top    = Math.round(H * yStart)
  const width  = Math.round(W * (xEnd - xStart))
  const height = Math.round(H * (yEnd - yStart))
  return { left, top, width, height }
}

async function extractRegion(buffer, region) {
  return sharp(buffer)
    .extract(region)
    .resize({ width: CFG.MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: CFG.JPEG_QUALITY })
    .toBuffer()
}

async function getDimensions(buffer) {
  const { width, height } = await sharp(buffer).metadata()
  return { width, height }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * cropForPlateDetection(rawBuffer)
 *
 * Returns { buffer, log } where log contains:
 *   cropSucceeded     — whether any meaningful crop was made
 *   plateZoneCropped  — whether the narrow plate zone was used
 *   cropType          — 'plate' | 'rear' | 'full'
 *   usedFallback      — true when cropType === 'full'
 *   originalDimensions
 *   outputDimensions
 *   cropRegion        — the pixel region extracted (if applicable)
 *
 * To swap in a real CV detector later, replace this function.
 * The calling code (visionPipeline.js) depends only on the return shape above.
 */
export async function cropForPlateDetection(rawBuffer) {
  // Normalize: auto-rotate via EXIF, convert to JPEG
  const normalized = await sharp(rawBuffer)
    .rotate()
    .jpeg({ quality: 95 })
    .toBuffer()

  const { width: W, height: H } = await getDimensions(normalized)

  const log = {
    originalDimensions: { width: W, height: H },
    cropSucceeded:    false,
    plateZoneCropped: false,
    cropType:         'full',
    usedFallback:     true,
    outputDimensions: null,
    cropRegion:       null,
  }

  // ── 1. Plate zone crop ───────────────────────────────────────────────────
  // Calculated relative to full image (rear embedded in fractions)
  const rearH = H * (1.0 - CFG.REAR_Y_START)
  const plateRegion = {
    left:   Math.round(W  * CFG.REAR_X_START  + W  * (CFG.REAR_X_END - CFG.REAR_X_START) * CFG.PLATE_X_START),
    top:    Math.round(H  * CFG.REAR_Y_START  + rearH * CFG.PLATE_Y_START),
    width:  Math.round(W  * (CFG.REAR_X_END - CFG.REAR_X_START) * (CFG.PLATE_X_END - CFG.PLATE_X_START)),
    height: Math.round(rearH * (CFG.PLATE_Y_END - CFG.PLATE_Y_START)),
  }

  if (plateRegion.width * plateRegion.height >= CFG.MIN_CROP_AREA) {
    try {
      const cropped = await extractRegion(normalized, plateRegion)
      log.cropSucceeded    = true
      log.plateZoneCropped = true
      log.cropType         = 'plate'
      log.usedFallback     = false
      log.outputDimensions = await getDimensions(cropped)
      log.cropRegion       = plateRegion
      console.log('[ImageCropper] ✓ Plate zone crop', log.outputDimensions)
      return { buffer: cropped, log }
    } catch (err) {
      console.warn('[ImageCropper] Plate zone crop failed:', err.message)
    }
  }

  // ── 2. Vehicle rear crop ─────────────────────────────────────────────────
  const rearRegion = calcRegion(W, H, CFG.REAR_X_START, CFG.REAR_X_END, CFG.REAR_Y_START, 1.0)

  if (rearRegion.width * rearRegion.height >= CFG.MIN_CROP_AREA) {
    try {
      const cropped = await extractRegion(normalized, rearRegion)
      log.cropSucceeded    = true
      log.cropType         = 'rear'
      log.usedFallback     = false
      log.outputDimensions = await getDimensions(cropped)
      log.cropRegion       = rearRegion
      console.log('[ImageCropper] ✓ Rear crop', log.outputDimensions)
      return { buffer: cropped, log }
    } catch (err) {
      console.warn('[ImageCropper] Rear crop failed:', err.message)
    }
  }

  // ── 3. Fallback: full image reduced ──────────────────────────────────────
  console.warn('[ImageCropper] ⚠ Using full-image fallback')
  const reduced = await sharp(normalized)
    .resize({ width: CFG.MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: CFG.JPEG_QUALITY })
    .toBuffer()

  log.outputDimensions = await getDimensions(reduced)
  return { buffer: reduced, log }
}
