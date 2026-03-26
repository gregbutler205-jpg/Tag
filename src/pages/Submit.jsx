import { useState, useRef, useCallback } from 'react'
import { STATES } from '../lib/rarityConfig'
import PlateCard from '../components/PlateCard'
import useStore from '../store/useStore'
import api from '../lib/api'

const MODES = { manual: 'manual', camera: 'camera' }

export default function Submit() {
  const [mode, setMode] = useState(MODES.manual)
  const [plateText, setPlateText] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [photoData, setPhotoData] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const { addPoints, addState } = useStore()

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (e) {
      setError('Camera access denied. Use manual entry instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPhotoData(dataUrl)
    stopCamera()

    // Send to OCR
    setOcrLoading(true)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const form = new FormData()
      form.append('photo', blob, 'plate.jpg')
      const { data } = await api.post('/plates/ocr', form)
      if (data.text) setPlateText(data.text.toUpperCase())
    } catch {
      // OCR failed — user can type manually
    } finally {
      setOcrLoading(false)
    }
  }, [stopCamera])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoData(ev.target.result)
    reader.readAsDataURL(file)

    setOcrLoading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const { data } = await api.post('/plates/ocr', form)
      if (data.text) setPlateText(data.text.toUpperCase())
    } catch {
      // silent
    } finally {
      setOcrLoading(false)
    }
  }

  const interpret = async () => {
    if (!plateText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post('/plates/interpret', {
        text: plateText.trim().toUpperCase(),
        state: state || undefined,
        hasPhoto: !!photoData,
      })
      setResult(data)
      addPoints(data.points || 50)
      if (state) addState(state)
    } catch (e) {
      setError(e.response?.data?.error || 'Interpretation failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setPlateText('')
    setState('')
    setPhotoData(null)
    setError(null)
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">Submit a Plate</h1>
        {result && (
          <button onClick={reset} className="text-sm text-blue-400">
            New Plate
          </button>
        )}
      </div>

      {!result && (
        <>
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-slate-800 p-1 gap-1">
            {Object.entries(MODES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => { setMode(val); stopCamera(); setPhotoData(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === val ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                {key === 'camera' ? '📸 Camera' : '⌨️ Manual'}
              </button>
            ))}
          </div>

          {/* Camera mode */}
          {mode === MODES.camera && (
            <div className="space-y-3">
              {!photoData && (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <button
                        onClick={startCamera}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold"
                      >
                        Open Camera
                      </button>
                      <label className="text-slate-400 text-sm cursor-pointer underline">
                        or upload photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                  {cameraActive && (
                    <button
                      onClick={capturePhoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-blue-500 shadow-lg"
                    />
                  )}
                </div>
              )}
              {photoData && (
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={photoData} alt="Captured plate" className="w-full rounded-2xl" />
                  <button
                    onClick={() => { setPhotoData(null); setPlateText('') }}
                    className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <div className="text-white text-sm animate-pulse">Reading plate...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Plate text input */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Plate Text</label>
            <input
              value={plateText}
              onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
              placeholder="e.g. GR8FUL"
              maxLength={8}
              className="w-full bg-yellow-100 text-slate-900 rounded-xl px-4 py-3 text-center font-black text-2xl tracking-widest font-mono uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State selector */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">State (optional)</label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unknown / Not sure</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={interpret}
            disabled={!plateText.trim() || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
          >
            {loading ? 'Decoding...' : 'Decode This Plate ✨'}
          </button>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <PlateCard plate={plateText} result={result} />
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Points earned</div>
            <div className="text-2xl font-black text-yellow-400">+{result.points} pts</div>
          </div>
          <button
            onClick={reset}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            Submit Another Plate
          </button>
        </div>
      )}
    </div>
  )
}
