import { useState } from 'react'
import useStore from '../store/useStore'

const STEPS = ['welcome', 'install', 'account']

export default function WelcomeModal() {
  const { setHasSeenWelcome } = useStore()
  const [step, setStep] = useState(0)

  const ua = navigator.userAgent
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  function next()  { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function done()  { setHasSeenWelcome(true) }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(4,8,15,0.92)', backdropFilter: 'blur(6px)' }}>

      <div className="w-full sm:max-w-md bg-[#0d1626] border border-[#1e2d44] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}>

        {/* ── Progress dots ───────────────────────────────── */}
        <div className="flex justify-center gap-2 pt-4 pb-1">
          {STEPS.map((_, i) => (
            <div key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                background: i === step ? '#f59e0b' : '#1e2d44',
              }}
            />
          ))}
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* ── STEP 0: What is iWonde Tag ─────────────────── */}
          {step === 0 && (
            <div className="space-y-5 text-center">
              <div>
                <div className="text-6xl mb-3">🏷️</div>
                <h1 className="text-2xl font-black text-white">Welcome to iWonde Tag</h1>
                <p className="text-slate-400 text-sm mt-1">The vanity plate spotting &amp; decoding game</p>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed text-left">
                iWonde Tag turns every vanity license plate you spot on the road into a puzzle.
                Submit the plate, let the AI decode it, then try to beat the AI with your own
                interpretation. Earn points, collect all 50 states, and compete on the global leaderboard.
              </p>

              {/* Feature cards */}
              <div className="space-y-2 text-left">
                {[
                  { emoji: '🤖', title: 'AI Decodes Every Plate',   desc: 'Powered by xAI Grok — from Common to Legendary rarity.' },
                  { emoji: '🏆', title: 'Can You Beat the AI?',     desc: 'Submit your own interpretation for bonus points.' },
                  { emoji: '🏷️', title: 'Tag of the Day',           desc: 'One global daily challenge — everyone plays the same plate.' },
                  { emoji: '👥', title: 'Group Road Trip Mode',      desc: 'Compete live with friends and family in the car.' },
                  { emoji: '🗺️', title: 'State Collection',          desc: 'Spot plates from all 50 states + D.C.' },
                  { emoji: '🎖️', title: 'Rank Up to Wizard',         desc: 'Six rank tiers from Rookie to Wizard 🧙.' },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-3 bg-[#111d30] rounded-xl px-4 py-3">
                    <span className="text-xl shrink-0 mt-0.5">{f.emoji}</span>
                    <div>
                      <div className="text-white text-sm font-bold">{f.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Install Instructions ──────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-2">📲</div>
                <h2 className="text-xl font-black text-white">Add to Your Home Screen</h2>
                <p className="text-slate-400 text-sm mt-1">
                  iWonde Tag installs like an app — no App Store needed.
                </p>
              </div>

              {isStandalone ? (
                <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-4 py-4 text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-emerald-300 text-sm font-semibold">Already installed!</p>
                  <p className="text-slate-400 text-xs mt-1">iWonde Tag is running as an installed app.</p>
                </div>
              ) : (
                <>
                  {/* Show the relevant platform first, then the other */}
                  {(isIOS || (!isIOS && !isAndroid)) && (
                    <div className="bg-[#111d30] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🍎</span>
                        <span className="text-white font-bold text-sm">iPhone / iPad (Safari)</span>
                        {isIOS && (
                          <span className="ml-auto text-[10px] bg-brand-yellow text-navy-900 font-black px-2 py-0.5 rounded-full">Your device</span>
                        )}
                      </div>
                      {[
                        'Open this page in Safari (not Chrome)',
                        'Tap the Share button ↑ at the bottom of Safari',
                        'Scroll down and tap "Add to Home Screen"',
                        'Tap Add — the iWonde Tag icon appears on your home screen',
                        'Open the icon to launch the full app experience',
                      ].map((t, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                          <p className="text-slate-400 text-sm">{t}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {(isAndroid || (!isIOS && !isAndroid)) && (
                    <div className="bg-[#111d30] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🤖</span>
                        <span className="text-white font-bold text-sm">Android (Chrome)</span>
                        {isAndroid && (
                          <span className="ml-auto text-[10px] bg-brand-yellow text-navy-900 font-black px-2 py-0.5 rounded-full">Your device</span>
                        )}
                      </div>
                      {[
                        'Open this page in Chrome',
                        'Tap the three-dot menu ⋮ in the top-right corner',
                        'Tap "Add to Home Screen" or "Install App"',
                        'Tap Add — the icon appears on your home screen',
                        'Open the icon to launch the full app experience',
                      ].map((t, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                          <p className="text-slate-400 text-sm">{t}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-[#111820] border border-[#1e2d44] rounded-xl px-4 py-3">
                    <p className="text-slate-500 text-xs leading-relaxed">
                      <span className="text-slate-300 font-semibold">Why add to home screen?</span>
                      {' '}It runs full-screen without browser bars, loads faster, and works like a native app.
                      You can also play directly in your browser any time at{' '}
                      <span className="text-brand-yellow">tag.iwonde.com</span>.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Account ───────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-2">🧙</div>
                <h2 className="text-xl font-black text-white">Ready to Play</h2>
                <p className="text-slate-400 text-sm mt-1">One last thing before you dive in.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-[#111d30] rounded-2xl p-4 space-y-2">
                  <div className="text-white font-bold text-sm flex items-center gap-2">
                    <span>👤</span> Playing as a Guest
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    No sign-in required. Your points, streak, and state collection are saved on
                    this device. You won't appear on the global leaderboard as a guest.
                  </p>
                </div>

                <div className="bg-[#111d30] rounded-2xl p-4 space-y-2">
                  <div className="text-white font-bold text-sm flex items-center gap-2">
                    <span>🏆</span> Create a Free Account
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Just a username and email — no password. Your progress syncs across devices
                    and you'll appear on the global leaderboard.
                  </p>
                  <p className="text-slate-500 text-xs">
                    Tap the person icon in the top-right corner of the app to sign up any time.
                  </p>
                </div>

                <div className="bg-[#111d30] rounded-2xl p-4 space-y-2">
                  <div className="text-white font-bold text-sm flex items-center gap-2">
                    <span>📸</span> Submitting Your First Plate
                  </div>
                  {[
                    'Tap "Submit a Plate" from the home screen',
                    'Take a photo or type the plate text',
                    'Select the state and tap Decode',
                    'Try "Can You Beat AI?" for bonus points',
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                      <p className="text-slate-400 text-sm">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer buttons ──────────────────────────────── */}
        <div className="px-6 pb-8 pt-4 border-t border-[#1e2d44] space-y-2">
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="w-full py-3.5 rounded-xl font-black text-navy-900 text-base transition-all active:scale-[0.98]"
              style={{ background: '#f59e0b' }}>
              Next →
            </button>
          ) : (
            <button
              onClick={done}
              className="w-full py-3.5 rounded-xl font-black text-navy-900 text-base transition-all active:scale-[0.98]"
              style={{ background: '#f59e0b' }}>
              Start Playing 🏷️
            </button>
          )}
          {step === 0 && (
            <button onClick={done}
              className="w-full py-2 text-slate-600 text-sm font-semibold hover:text-slate-400 transition-colors">
              Skip intro
            </button>
          )}
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="w-full py-2 text-slate-600 text-sm font-semibold hover:text-slate-400 transition-colors">
              ← Back
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
