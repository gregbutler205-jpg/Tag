import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import useStore from '../store/useStore'
import BackButton from '../components/BackButton'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'D.C.'
}

// Reverse map: full name → abbreviation (for matching TopoJSON properties.name)
const NAME_TO_ABBR = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([abbr, name]) => [name, abbr])
)
// D.C. is stored as "District of Columbia" in TopoJSON
NAME_TO_ABBR['District of Columbia'] = 'DC'

const ALL_STATES = Object.keys(STATE_NAMES)

const REGIONS = {
  'Northeast': ['ME','VT','NH','MA','CT','RI','NY','NJ','PA','DE','MD','DC'],
  'Southeast': ['VA','WV','NC','SC','GA','FL','TN','KY','AL','MS','AR','LA'],
  'Midwest':   ['OH','MI','IN','IL','WI','MN','IA','MO','ND','SD','NE','KS'],
  'Southwest': ['TX','OK','NM','AZ'],
  'West':      ['CO','UT','WY','MT','ID','NV','CA','OR','WA','AK','HI'],
}

function StateChip({ abbr, collected, onClick }) {
  return (
    <button
      type="button"
      title={STATE_NAMES[abbr]}
      onClick={() => onClick(abbr)}
      className={`relative rounded-lg p-2 text-center text-xs font-bold transition-all active:scale-95 ${
        collected
          ? 'bg-brand-blue text-white shadow-glow'
          : 'bg-navy-800 text-navy-500 border border-navy-600 hover:border-brand-blue hover:text-slate-300'
      }`}
    >
      {collected && (
        <span className="absolute -top-1 -right-1 text-[8px] bg-brand-yellow text-navy-900 rounded-full w-3.5 h-3.5 flex items-center justify-center font-black">
          ✓
        </span>
      )}
      {abbr}
    </button>
  )
}

function USMap({ statesCollected, onSelect }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
        projectionConfig={{ scale: 900 }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const abbr = NAME_TO_ABBR[geo.properties.name]
              if (!abbr) return null
              const collected = statesCollected.includes(abbr)
              const isHovered = hovered === abbr
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => onSelect(abbr)}
                  onMouseEnter={() => setHovered(abbr)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    default: {
                      fill: collected ? '#1d4ed8' : '#1e293b',
                      stroke: '#04080f',
                      strokeWidth: 0.5,
                      outline: 'none',
                      transition: 'fill 0.15s ease',
                    },
                    hover: {
                      fill: collected ? '#3b82f6' : '#334155',
                      stroke: '#04080f',
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: 'pointer',
                    },
                    pressed: {
                      fill: collected ? '#1e40af' : '#475569',
                      outline: 'none',
                    },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-navy-800 border border-navy-600 text-white text-xs font-bold px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
          {hovered} — {STATE_NAMES[hovered]}
          {statesCollected.includes(hovered) && <span className="ml-2 text-brand-yellow">✓</span>}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-brand-blue inline-block" /> Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-navy-800 border border-navy-600 inline-block" /> Not yet
        </span>
        <span className="text-slate-600">Tap to log</span>
      </div>
    </div>
  )
}

export default function Collection() {
  const { statesCollected, addState, addPoints } = useStore()
  const navigate = useNavigate()
  const [view, setView] = useState('map')
  const [selected, setSelected] = useState(null)
  const [justLogged, setJustLogged] = useState(null)
  const pct = Math.round((statesCollected.length / ALL_STATES.length) * 100)

  function handleSelect(abbr) {
    setSelected(abbr)
  }

  function logState() {
    addState(selected)
    addPoints(100)
    setJustLogged(selected)
    setSelected(null)
    setTimeout(() => setJustLogged(null), 3000)
  }

  function goSubmit() {
    navigate(`/submit?state=${selected}`)
    setSelected(null)
  }

  const isCollected = selected && statesCollected.includes(selected)

  return (
    <div className="pb-nav px-4 pt-3 space-y-4 max-w-lg mx-auto">

      <div className="pt-2"><BackButton to="/" /></div>

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">State Collection</h1>
        <p className="text-slate-500 text-sm">Spot plates from all 50 states + D.C.</p>
      </div>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-2xl">
            {statesCollected.length}
            <span className="text-slate-500 text-base font-normal"> / {ALL_STATES.length}</span>
          </span>
          <span className="text-brand-yellow font-bold text-lg">{pct}%</span>
        </div>
        <div className="h-3 bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-blue to-brand-blue-light rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
          <div><span className="text-white font-bold block text-lg">{statesCollected.length}</span>Collected</div>
          <div><span className="text-white font-bold block text-lg">{ALL_STATES.length - statesCollected.length}</span>Remaining</div>
          <div><span className="text-brand-yellow font-bold block text-lg">{pct}%</span>Complete</div>
        </div>
      </div>

      {/* Map / List toggle */}
      <div className="flex glass-card rounded-xl p-1 gap-1">
        <button
          onClick={() => setView('map')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            view === 'map'
              ? 'bg-brand-blue text-white shadow-glow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            view === 'list'
              ? 'bg-brand-blue text-white shadow-glow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ☰ List
        </button>
      </div>

      {/* Just-logged toast */}
      {justLogged && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 border border-emerald-700/40">
          <span className="text-2xl">✅</span>
          <p className="text-emerald-300 text-sm font-bold">{STATE_NAMES[justLogged]} added! +100 pts</p>
        </div>
      )}

      {/* Action panel */}
      {selected && (
        <div className="glass-card rounded-xl p-4 space-y-3 border border-navy-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-black text-lg">{STATE_NAMES[selected]}</p>
              <p className="text-slate-500 text-xs">{selected}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg px-1">✕</button>
          </div>
          {isCollected ? (
            <p className="text-brand-blue text-sm font-semibold">✓ Already in your collection</p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={logState}
                className="flex-1 bg-brand-blue hover:brightness-110 text-white text-sm font-black py-2.5 rounded-xl transition-all active:scale-95"
              >
                Log State +100 pts
              </button>
              <button
                onClick={goSubmit}
                className="flex-1 glass-card hover:border-navy-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95"
              >
                Submit a Plate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map view */}
      {view === 'map' && (
        <USMap statesCollected={statesCollected} onSelect={handleSelect} />
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-4">
          {Object.entries(REGIONS).map(([region, states]) => {
            const collected = states.filter(s => statesCollected.includes(s))
            return (
              <div key={region} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{region}</span>
                  <span className="text-xs text-slate-600">{collected.length}/{states.length}</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {states.map(abbr => (
                    <StateChip
                      key={abbr}
                      abbr={abbr}
                      collected={statesCollected.includes(abbr)}
                      onClick={handleSelect}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {statesCollected.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <div className="text-5xl mb-3">🗺️</div>
              <div className="font-semibold text-white">Start your collection!</div>
              <div className="text-sm mt-1">Submit a plate to add your first state</div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
