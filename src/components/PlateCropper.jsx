/**
 * PlateCropper — Merlin-style drag-to-crop UI for license plate scanning
 *
 * Props:
 *   imageSrc  — DataURL of the full photo
 *   onConfirm — called with a Blob of the cropped area
 *   onCancel  — called when user taps Cancel
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// Default crop region as percentages of the image
// Positions the box at center-bottom where license plates usually live
const DEFAULT_CROP = { x: 10, y: 42, w: 80, h: 32 }

const MIN_SIZE = 8   // minimum crop dimension in %
const HANDLE_PX = 26 // touch handle size in pixels

export default function PlateCropper({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [dragging, setDragging] = useState(null) // null | 'move' | 'nw'|'ne'|'sw'|'se'
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const dragOrigin = useRef(null) // { clientX, clientY, crop, containerW, containerH }

  // ── Drag helpers ────────────────────────────────────────────────────────────

  function containerSize() {
    const r = containerRef.current?.getBoundingClientRect()
    return r ? { w: r.width, h: r.height } : { w: 1, h: 1 }
  }

  function beginDrag(type, clientX, clientY) {
    const { w, h } = containerSize()
    dragOrigin.current = { type, clientX, clientY, crop: { ...crop }, cw: w, ch: h }
    setDragging(type)
  }

  function applyMove(clientX, clientY) {
    if (!dragging || !dragOrigin.current) return
    const { clientX: ox, clientY: oy, crop: oc, cw, ch } = dragOrigin.current
    const dx = ((clientX - ox) / cw) * 100
    const dy = ((clientY - oy) / ch) * 100

    let { x, y, w, h } = oc

    if (dragging === 'move') {
      x = clamp(oc.x + dx, 0, 100 - w)
      y = clamp(oc.y + dy, 0, 100 - h)
    } else if (dragging === 'se') {
      w = clamp(oc.w + dx, MIN_SIZE, 100 - oc.x)
      h = clamp(oc.h + dy, MIN_SIZE, 100 - oc.y)
    } else if (dragging === 'sw') {
      const newX = clamp(oc.x + dx, 0, oc.x + oc.w - MIN_SIZE)
      w = oc.w + (oc.x - newX); x = newX
      h = clamp(oc.h + dy, MIN_SIZE, 100 - oc.y)
    } else if (dragging === 'ne') {
      w = clamp(oc.w + dx, MIN_SIZE, 100 - oc.x)
      const newY = clamp(oc.y + dy, 0, oc.y + oc.h - MIN_SIZE)
      h = oc.h + (oc.y - newY); y = newY
    } else if (dragging === 'nw') {
      const newX = clamp(oc.x + dx, 0, oc.x + oc.w - MIN_SIZE)
      const newY = clamp(oc.y + dy, 0, oc.y + oc.h - MIN_SIZE)
      w = oc.w + (oc.x - newX); x = newX
      h = oc.h + (oc.y - newY); y = newY
    }

    setCrop({ x, y, w, h })
  }

  function endDrag() {
    setDragging(null)
    dragOrigin.current = null
  }

  // ── Global move / up listeners while dragging ────────────────────────────────

  const onMouseMove = useCallback(e => applyMove(e.clientX, e.clientY), [dragging])
  const onTouchMove = useCallback(e => {
    e.preventDefault()
    applyMove(e.touches[0].clientX, e.touches[0].clientY)
  }, [dragging])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', endDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', endDrag)
    }
  }, [dragging, onMouseMove, onTouchMove])

  // ── Canvas extraction ────────────────────────────────────────────────────────

  function confirmCrop() {
    const img = imgRef.current
    if (!img) return

    // Map crop percentages directly to natural image pixels
    // (works because the image maintains aspect ratio in the browser)
    const sx = Math.round((crop.x / 100) * img.naturalWidth)
    const sy = Math.round((crop.y / 100) * img.naturalHeight)
    const sw = Math.round((crop.w / 100) * img.naturalWidth)
    const sh = Math.round((crop.h / 100) * img.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width  = sw
    canvas.height = sh
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const handles = [
    { type: 'nw', top: crop.y,           left: crop.x,           cursor: 'nw-resize' },
    { type: 'ne', top: crop.y,           left: crop.x + crop.w,  cursor: 'ne-resize' },
    { type: 'sw', top: crop.y + crop.h,  left: crop.x,           cursor: 'sw-resize' },
    { type: 'se', top: crop.y + crop.h,  left: crop.x + crop.w,  cursor: 'se-resize' },
  ]

  return (
    <div className="space-y-3">

      {/* Instruction banner */}
      <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5">
        <span className="text-xl flex-shrink-0">🎯</span>
        <p className="text-sm text-slate-300 leading-snug">
          Drag the box to frame the <span className="text-white font-bold">license plate</span>, then tap{' '}
          <span className="text-brand-yellow font-bold">Scan Tag</span>
        </p>
      </div>

      {/* Image + overlay */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden border border-navy-600 select-none"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop preview"
          className="w-full block"
          draggable={false}
        />

        {/* ── Dark mask (4 rects around the crop box) ── */}
        {[
          { top: '0%',                    left: '0%',              width: '100%',            height: `${crop.y}%` },
          { top: `${crop.y + crop.h}%`,   left: '0%',              width: '100%',            height: `${100 - crop.y - crop.h}%` },
          { top: `${crop.y}%`,            left: '0%',              width: `${crop.x}%`,      height: `${crop.h}%` },
          { top: `${crop.y}%`,            left: `${crop.x+crop.w}%`, width: `${100-crop.x-crop.w}%`, height: `${crop.h}%` },
        ].map((s, i) => (
          <div key={i} className="absolute bg-black/60 pointer-events-none" style={s} />
        ))}

        {/* ── Crop box border + drag target ── */}
        <div
          className="absolute"
          style={{
            top:    `${crop.y}%`,
            left:   `${crop.x}%`,
            width:  `${crop.w}%`,
            height: `${crop.h}%`,
            cursor: dragging === 'move' ? 'grabbing' : 'grab',
            border: '2.5px solid #F5C400',
            boxSizing: 'border-box',
          }}
          onMouseDown={e => { e.stopPropagation(); beginDrag('move', e.clientX, e.clientY) }}
          onTouchStart={e => { e.stopPropagation(); beginDrag('move', e.touches[0].clientX, e.touches[0].clientY) }}
        >
          {/* Corner bracket accents (purely visual) */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-brand-yellow rounded-tl pointer-events-none" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-brand-yellow rounded-tr pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-brand-yellow rounded-bl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-brand-yellow rounded-br pointer-events-none" />

          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-[2px] bg-brand-yellow/50 rounded-full" />
            <div className="absolute h-6 w-[2px] bg-brand-yellow/50 rounded-full" />
          </div>
        </div>

        {/* ── Corner drag handles ── */}
        {handles.map(({ type, top, left, cursor }) => (
          <div
            key={type}
            className="absolute z-10 bg-brand-yellow rounded-full shadow-lg"
            style={{
              top:    `${top}%`,
              left:   `${left}%`,
              width:  HANDLE_PX,
              height: HANDLE_PX,
              transform: 'translate(-50%, -50%)',
              cursor,
              touchAction: 'none',
            }}
            onMouseDown={e => { e.stopPropagation(); beginDrag(type, e.clientX, e.clientY) }}
            onTouchStart={e => { e.stopPropagation(); beginDrag(type, e.touches[0].clientX, e.touches[0].clientY) }}
          />
        ))}
      </div>

      {/* ── Buttons ── */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl glass-card text-slate-400 font-bold text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={confirmCrop}
          className="py-3.5 px-8 rounded-2xl font-black text-base transition-all active:scale-[0.98]"
          style={{ flex: 2, background: '#F5C400', color: '#04080f' }}
        >
          🔍 Scan Tag
        </button>
      </div>
    </div>
  )
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}
