import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATES, STATE_NAMES } from '../lib/rarityConfig'
import PlateCard from '../components/PlateCard'
import PlateCropper from '../components/PlateCropper'
import useStore from '../store/useStore'
import api from '../lib/api'
import BackButton from '../components/BackButton'
import SafetyBanner from '../components/SafetyBanner'
import { track } from '../lib/analytics'
import { getEasterEggPhrase, EASTER_EGG_PROBABILITY } from '../lib/wizardPhrases'
import { toPng } from 'html-to-image'

const MODES = { camera: 'camera', manual: 'manual' }
const TODAY_KEY = () => `iwt_first_decode_${new Date().toDateString()}`

/* ── State chip-grid picker ─────────────────────────────────────── */
function StateChipPicker({ value, onChange }) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')

  const filtered = search.trim()
    ? STATES.filter(s =>
        s.toLowerCase().includes(search.toLowerCase()) ||
        STATE_NAMES[s].toLowerCase().includes(search.toLowerCase())
      )
    : STATES

  function select(s) {
    onChange(s)
    setOpen(false)
    setSearch('')
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
        State <span className="normal-case text-slate-600">(optional)</span>
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full glass-card border-navy-600 rounded-xl px-4 py-3 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        <span className={value ? 'text-white font-semibold' : 'text-slate-500'}>
          {value ? `${value} — ${STATE_NAMES[value]}` : 'Unknown / Not sure'}
        </span>
        <span className="flex items-center gap-2">
          {value && (
            <span
              onClick={clear}
              className="text-slate-500 hover:text-red-400 text-lg leading-none transition-colors"
              role="button"
            >✕</span>
          )}
          <svg viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd"/>
          </svg>
        </span>
      </button>

      {/* Expanded chip grid */}
      {open && (
        <div className="glass-card rounded-xl p-3 space-y-3 border border-navy-500">
          {/* Search filter */}
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search state…"
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />

          {/* Chip grid */}
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {filtered.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => select(s)}
                title={STATE_NAMES[s]}
                className={`rounded-lg py-2 text-xs font-black tracking-wide transition-all active:scale-95 ${
                  value === s
                    ? 'bg-brand-blue text-white shadow-glow'
                    : 'bg-navy-900 text-slate-400 hover:bg-navy-700 hover:text-white border border-navy-700'
                }`}
              >
                {s}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-6 text-center text-slate-600 text-xs py-2">No states match</p>
            )}
          </div>

          {/* Unknown option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); setSearch('') }}
            className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
              !value ? 'bg-brand-blue text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Unknown / Not sure
          </button>
        </div>
      )}
    </div>
  )
}

export default function Submit() {
  const [searchParams] = useSearchParams()
  const [mode, setMode]           = useState(MODES.camera)
  const [plateText, setPlateText] = useState('')
  const [state, setState]         = useState(searchParams.get('state') || '')

  useEffect(() => {
    const s = searchParams.get('state')
    if (s) setState(s)
  }, [])
  const [loading, setLoading]             = useState(false)
  const [result, setResult]               = useState(null)
  const [error, setError]                 = useState(null)
  const [photoData, setPhotoData]         = useState(null)   // DataURL for preview
  const [cropSrc, setCropSrc]             = useState(null)   // DataURL shown in cropper
  const [ocrLoading, setOcrLoading]       = useState(false)
  const [cropMeta, setCropMeta]           = useState(null)
  const [ocrFailed, setOcrFailed]         = useState(false)
  const [userMeaning, setUserMeaning]     = useState('')
  const [challenge, setChallenge]         = useState(null)
  const [challenging, setChallenging]     = useState(false)
  const [stateAutoFilled, setStateAutoFilled] = useState(false)  // true when state came from OCR
  const fileInputRef  = useRef(null)
  const plateInputRef = useRef(null)
  const resultRef     = useRef(null)
  const [stateAdded, setStateAdded]         = useState(false)
  const [easterEggPhrase, setEasterEggPhrase] = useState(null)
  const [sessionDecodes, setSessionDecodes]   = useState(0)
  const { addPoints, addState, statesCollected } = useStore()

  const logStateOnly = () => {
    const isNew = !statesCollected.includes(state)
    addState(state)
    if (isNew) addPoints(100)
    setStateAdded(true)
    setTimeout(() => setStateAdded(false), 3000)
    track('state_logged', { state, is_new: isNew, source: 'manual' })
  }

  /* ── OCR — called with a pre-cropped Blob from PlateCropper ── */
  const runOcr = async (croppedBlob, previewDataUrl) => {
    // Show the cropped area as the photo preview
    setPhotoData(previewDataUrl)
    setCropSrc(null)   // exit cropper

    setOcrLoading(true)
    setOcrFailed(false)
    setStateAutoFilled(false)
    try {
      const form = new FormData()
      form.append('photo', croppedBlob, 'plate.jpg')
      form.append('skipCrop', 'true')   // tell server not to auto-crop again
      const { data } = await api.post('/plates/ocr', form)

      if (data.text) {
        setPlateText(data.text.toUpperCase())
        setOcrFailed(false)
      } else {
        setOcrFailed(true)
        setTimeout(() => plateInputRef.current?.focus(), 100)
      }

      // Auto-fill state if detected and not already set by user
      if (data.detectedState) {
        setState(data.detectedState)
        setStateAutoFilled(true)
      }

      if (data.meta) setCropMeta(data.meta)
      track('plate_ocr', { success: !!data.text, method: data.meta?.method || 'unknown', state_detected: !!data.detectedState })
    } catch {
      setOcrFailed(true)
    } finally {
      setOcrLoading(false)
    }
  }

  /* ── File picked — show in cropper first, don't run OCR yet ── */
  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCropSrc(ev.target.result)   // open crop UI
      setPhotoData(null)
      setPlateText('')
      setOcrFailed(false)
      setCropMeta(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''   // allow re-selecting same file
  }

  /* ── Crop confirmed — extract preview DataURL then run OCR ── */
  const handleCropConfirm = (croppedBlob) => {
    const reader = new FileReader()
    reader.onload = ev => runOcr(croppedBlob, ev.target.result)
    reader.readAsDataURL(croppedBlob)
  }

  /* ── Crop cancelled — go back to picker ── */
  const handleCropCancel = () => {
    setCropSrc(null)
    setPhotoData(null)
    setPlateText('')
    setStateAutoFilled(false)
  }

  /* ── Interpret ───────────────────────────────────────────── */
  const interpret = async () => {
    if (!plateText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post('/plates/interpret', {
        text:     plateText.trim().toUpperCase(),
        state:    state || undefined,
        hasPhoto: !!photoData,
      })
      setResult(data)
      addPoints(data.points || 50)
      if (state) addState(state)
      track('plate_interpreted', {
        plate_text:  plateText.trim().toUpperCase(),
        state:       state || 'unknown',
        has_photo:   !!photoData,
        rarity:      data.rarity,
        points:      data.points,
        confidence:  Math.round((data.confidence || 0) * 100),
      })

      // ── Easter Egg trigger logic ────────────────────────────────────────────
      const newDecodeCount = sessionDecodes + 1
      setSessionDecodes(newDecodeCount)
      const confidencePct = Math.round((data.confidence || 0) * 100)
      const isFirstToday  = !sessionStorage.getItem(TODAY_KEY())
      if (isFirstToday) sessionStorage.setItem(TODAY_KEY(), '1')

      let eggPhrase = null
      let eggTrigger = null

      if (confidencePct < 50) {
        // Low confidence — always show Uncertain pool
        eggPhrase  = getEasterEggPhrase('uncertain')
        eggTrigger = 'uncertain'
      } else if (isFirstToday) {
        eggPhrase  = getEasterEggPhrase('welcome')
        eggTrigger = 'welcome'
      } else if (data.rarity === 'legendary') {
        eggPhrase  = getEasterEggPhrase('legendary')
        eggTrigger = 'legendary'
      } else if (newDecodeCount >= 5 && newDecodeCount % 5 === 0) {
        // Every 5th decode in the session
        eggPhrase  = getEasterEggPhrase('streak')
        eggTrigger = 'streak'
      } else if (Math.random() < EASTER_EGG_PROBABILITY) {
        eggPhrase  = getEasterEggPhrase('general')
        eggTrigger = 'general'
      }

      setEasterEggPhrase(eggPhrase)
      if (eggPhrase) {
        track('wizard_easter_egg_shown', { trigger_type: eggTrigger, phrase_category: eggTrigger })
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Interpretation failed — check your API key or try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Challenge the AI ────────────────────────────────────── */
  const submitChallenge = async () => {
    if (!userMeaning.trim() || !result) return
    setChallenging(true)
    try {
      const { data } = await api.post('/plates/challenge', {
        plateText: plateText.trim().toUpperCase(),
        aiMeaning: result.primary,
        userMeaning: userMeaning.trim(),
        state: state || undefined,
      })
      setChallenge(data)
      if (data.bonusPoints > 0) addPoints(data.bonusPoints)
      track('challenge_submitted', { verdict: data.verdict, bonus_points: data.bonusPoints })
    } catch {
      setChallenge({ verdict: 'disagree', reasoning: 'Could not reach the judge — try again.', bonusPoints: 0 })
    } finally {
      setChallenging(false)
    }
  }

  /* ── Save plate photo ───────────────────────────────────── */
  const savePhoto = async () => {
    if (!photoData) return
    const filename = `${plateText || 'plate'}-photo.jpg`

    // iOS: share a File so "Save Image" in the native sheet goes straight to Photos
    const blob = await (await fetch(photoData)).blob()
    const file = new File([blob], filename, { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        track('save_plate_photo', { plate_text: plateText })
        return
      } catch (err) {
        if (err.name === 'AbortError') return // user cancelled
        // fall through to desktop path
      }
    }

    // Desktop fallback
    const link = document.createElement('a')
    link.download = filename
    link.href = photoData
    link.click()
    track('save_plate_photo', { plate_text: plateText })
  }

  /* ── Save as Image ──────────────────────────────────────── */
  const [saving, setSaving] = useState(false)
  const saveAsImage = async () => {
    if (!resultRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(resultRef.current, {
        backgroundColor: '#0d1626',
        pixelRatio: 2,
      })
      const filename = `${plateText || 'plate'}-tag-wizard.png`

      // iOS: share a File so "Save Image" in the native sheet goes straight to Photos
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          track('save_as_image', { plate_text: plateText })
          return
        } catch (err) {
          if (err.name === 'AbortError') return // user cancelled
          // fall through to desktop path
        }
      }

      // Desktop fallback
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
      track('save_as_image', { plate_text: plateText })
    } catch (err) {
      console.error('Save as image failed', err)
    } finally {
      setSaving(false)
    }
  }

  /* ── Reset ───────────────────────────────────────────────── */
  const reset = () => {
    setResult(null); setPlateText(''); setState('')
    setPhotoData(null); setCropSrc(null); setError(null)
    setOcrFailed(false); setCropMeta(null)
    setUserMeaning(''); setChallenge(null)
    setStateAutoFilled(false); setEasterEggPhrase(null)
  }

  return (
    <div className="pb-nav max-w-lg mx-auto">
      <SafetyBanner />

      <div className="px-4 pt-3 space-y-4">
      {/* Page header */}
      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Submit a Plate</h1>
          <p className="text-slate-500 text-sm">Take a photo or type it in</p>
        </div>
        {result && (
          <button onClick={reset}
            className="text-brand-blue-light text-sm font-semibold hover:text-white transition-colors">
            + New Plate
          </button>
        )}
      </div>

      {!result && (
        <>
          {/* Mode toggle */}
          <div className="flex glass-card rounded-xl p-1 gap-1">
            {Object.entries(MODES).map(([key, val]) => (
              <button key={key}
                onClick={() => { setMode(val); setPhotoData(null); setPlateText('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === val
                    ? 'bg-brand-blue text-white shadow-glow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {key === 'camera' ? '📸 Camera / Upload' : '⌨️ Manual'}
              </button>
            ))}
          </div>

          {/* ── Camera / upload mode ── */}
          {mode === MODES.camera && (
            <div className="space-y-3">

              {/* Hidden native file input — opens camera/gallery/files picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFilePick}
              />

              {/* ── Step 1: No photo yet — show picker ── */}
              {!cropSrc && !photoData && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-navy-900 rounded-2xl border-2 border-dashed border-navy-600 hover:border-brand-blue transition-colors aspect-video flex flex-col items-center justify-center gap-3"
                >
                  <span className="text-5xl">📸</span>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">Take a Photo</p>
                    <p className="text-slate-500 text-sm">Camera · Library · Files — all work</p>
                  </div>
                </button>
              )}

              {/* ── Step 2: Crop UI — frame the plate ── */}
              {cropSrc && !photoData && (
                <PlateCropper
                  imageSrc={cropSrc}
                  onConfirm={handleCropConfirm}
                  onCancel={handleCropCancel}
                />
              )}

              {/* ── Step 3: Cropped preview + OCR result ── */}
              {photoData && (
                <>
                  <div className="relative rounded-2xl overflow-hidden border border-navy-600">
                    <img src={photoData} alt="Cropped plate" className="w-full rounded-2xl" />

                    {/* Re-crop / remove */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-navy-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand-blue transition-colors"
                      >
                        New Photo
                      </button>
                      <button
                        onClick={() => { setPhotoData(null); setPlateText(''); setCropMeta(null) }}
                        className="bg-navy-900/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-900 transition-colors"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>

                    {/* OCR loading overlay */}
                    {ocrLoading && (
                      <div className="absolute inset-0 bg-navy-900/70 flex flex-col items-center justify-center gap-2 rounded-2xl">
                        <div className="text-brand-yellow animate-pulse text-sm font-bold">Reading plate...</div>
                        <div className="w-8 h-8 border-2 border-brand-yellow/30 border-t-brand-yellow rounded-full animate-spin" />
                      </div>
                    )}

                    {/* OCR success badge */}
                    {!ocrLoading && plateText && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-900/90 border border-emerald-600 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        ✓ Read: {plateText}
                      </div>
                    )}
                  </div>

                  {/* OCR metadata badges */}
                  {!ocrLoading && cropMeta && (
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-900/50 text-emerald-400">
                        🎯 User cropped
                      </span>
                      {cropMeta.method && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-900/50 text-blue-400">
                          {cropMeta.method === 'google_vision' ? '⚡ Google Vision' : '🤖 AI Vision'}
                        </span>
                      )}
                      {cropMeta.escalated && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-900/50 text-amber-400">
                          🔺 Enhanced
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── OCR failed prompt ── */}
          {ocrFailed && photoData && !ocrLoading && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-3 flex items-start gap-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-400 text-sm font-bold">Couldn't read the plate</p>
                <p className="text-slate-400 text-xs mt-0.5">Type the plate characters below — we'll decode the rest</p>
              </div>
            </div>
          )}

          {/* ── Plate text input ── */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Plate Text
            </label>
            <div
              className="relative w-full mx-auto cursor-text"
              style={{ maxWidth: '360px' }}
              onClick={() => plateInputRef.current?.focus()}
            >
              <img
                src="/blank-plate.jpg"
                alt=""
                className="w-full rounded-lg select-none pointer-events-none"
                style={{ display: 'block' }}
              />
              <div className="absolute inset-0 flex items-center justify-center px-10">
                <input
                  ref={plateInputRef}
                  value={plateText}
                  onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
                  placeholder="GR8FUL"
                  maxLength={8}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    textAlign: 'center',
                    color: 'white',
                    fontSize: 'clamp(1.6rem, 6vw, 2.4rem)',
                    fontWeight: 900,
                    letterSpacing: '0.25em',
                    fontFamily: "'Roboto Mono', 'Courier New', monospace",
                    textTransform: 'uppercase',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    caretColor: 'white',
                  }}
                  className="placeholder:text-white/40"
                />
              </div>
            </div>
          </div>

          {/* ── State selector ── */}
          <StateChipPicker
            value={state}
            onChange={(s) => { setState(s); setStateAutoFilled(false) }}
          />

          {/* ── Auto-detected state warning ── */}
          {stateAutoFilled && state && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-700/50">
              <span className="text-red-400 text-base mt-0.5 flex-shrink-0">⚠️</span>
              <p className="text-red-300 text-xs leading-relaxed">
                <span className="font-bold">{state} — {STATE_NAMES[state]}</span> was auto-detected.
                {' '}Tap the state selector above to change it if wrong.
              </p>
            </div>
          )}

          {/* ── Log state without plate ── */}
          {state && !plateText.trim() && (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">
                  {stateAdded
                    ? (statesCollected.includes(state) ? `${STATE_NAMES[state]} already in your collection` : `${STATE_NAMES[state]} added! +100 pts`)
                    : `Spotted a ${STATE_NAMES[state]} plate?`}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {stateAdded ? 'Keep spotting more states!' : 'Log it now — or enter the plate text above to decode it too'}
                </p>
              </div>
              {!stateAdded && (
                <button
                  onClick={logStateOnly}
                  className="shrink-0 bg-brand-blue hover:brightness-110 text-white text-xs font-black px-3 py-2 rounded-lg transition-all active:scale-95"
                >
                  Log State
                </button>
              )}
              {stateAdded && <span className="text-2xl">✅</span>}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-900/40 border border-red-700/50 text-red-300 rounded-xl p-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* ── Decode button ── */}
          <button
            onClick={interpret}
            disabled={!plateText.trim() || loading}
            className="w-full bg-gradient-to-r from-brand-blue to-brand-blue-light hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-glow"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin text-xl">⟳</span> Decoding...
                </span>
              : '✨ Decode This Plate'}
          </button>
        </>
      )}

      {/* ── Result + Challenge ── */}
      {result && (
        <div className="space-y-4 animate-fade-up">
          <div ref={resultRef} className="rounded-2xl overflow-hidden">
            <PlateCard plate={plateText} state={state || undefined} result={result} animate easterEggPhrase={easterEggPhrase} />
          </div>

          {/* Save buttons */}
          <div className={photoData ? 'grid grid-cols-2 gap-2' : ''}>
            <button
              onClick={saveAsImage}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 glass-card hover:border-navy-500 text-slate-300 hover:text-white font-semibold py-3 rounded-2xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving
                ? <><span className="animate-spin">⟳</span> Saving...</>
                : <><span>💾</span> Save as Image</>
              }
            </button>
            {photoData && (
              <button
                onClick={savePhoto}
                className="w-full flex items-center justify-center gap-2 glass-card hover:border-navy-500 text-slate-300 hover:text-white font-semibold py-3 rounded-2xl text-sm transition-all active:scale-[0.98]"
              >
                <span>📷</span> Save Photo
              </button>
            )}
          </div>

          {/* Challenge verdict banner */}
          {challenge && (
            <div className={`rounded-2xl p-4 border ${
              challenge.verdict === 'agree'
                ? 'bg-emerald-900/30 border-emerald-600/50'
                : challenge.verdict === 'partial'
                ? 'bg-amber-900/30 border-amber-600/50'
                : 'bg-slate-800/60 border-slate-600/40'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">
                  {challenge.verdict === 'agree' ? '🎉' : challenge.verdict === 'partial' ? '🤔' : '❌'}
                </span>
                <span className={`font-black text-sm uppercase tracking-wide ${
                  challenge.verdict === 'agree'   ? 'text-emerald-400'
                  : challenge.verdict === 'partial' ? 'text-amber-400'
                  : 'text-slate-400'
                }`}>
                  {challenge.verdict === 'agree'   ? `You're right! +${challenge.bonusPoints} pts`
                   : challenge.verdict === 'partial' ? `Partial credit! +${challenge.bonusPoints} pts`
                   : 'Not quite'}
                </span>
              </div>
              <p className="text-slate-300 text-sm">{challenge.reasoning}</p>
              {challenge.revisedMeaning && challenge.revisedMeaning !== result.primary && (
                <p className="text-xs text-slate-500 mt-1">
                  Best reading: <span className="text-white font-semibold">{challenge.revisedMeaning}</span>
                </p>
              )}
            </div>
          )}

          {/* Challenge input — hide after a verdict and for unclear plates */}
          {!challenge && result?.category !== 'unclear' && (
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <p className="text-slate-400 text-sm font-semibold">
                🧙 Can You Beat The Wizard? Cast your spell:
              </p>
              <input
                value={userMeaning}
                onChange={e => setUserMeaning(e.target.value)}
                placeholder="e.g. New liver"
                maxLength={80}
                className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40 placeholder:text-slate-600"
              />
              <button
                onClick={submitChallenge}
                disabled={!userMeaning.trim() || challenging}
                className="w-full bg-brand-yellow hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-navy-900 font-black py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
              >
                {challenging
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Judging...</span>
                  : '⚖️ Submit My Interpretation'}
              </button>
            </div>
          )}

          <button onClick={reset}
            className="w-full glass-card hover:border-navy-500 text-white font-bold py-4 rounded-2xl transition-all">
            Submit Another Plate
          </button>
        </div>
      )}

      </div>
    </div>
  )
}
