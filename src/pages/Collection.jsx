import useStore from '../store/useStore'
import BackButton from '../components/BackButton'

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

const ALL_STATES = Object.keys(STATE_NAMES)

const REGIONS = {
  'Northeast': ['ME','VT','NH','MA','CT','RI','NY','NJ','PA','DE','MD','DC'],
  'Southeast': ['VA','WV','NC','SC','GA','FL','TN','KY','AL','MS','AR','LA'],
  'Midwest':   ['OH','MI','IN','IL','WI','MN','IA','MO','ND','SD','NE','KS'],
  'Southwest': ['TX','OK','NM','AZ'],
  'West':      ['CO','UT','WY','MT','ID','NV','CA','OR','WA','AK','HI'],
}

function StateChip({ abbr, collected }) {
  return (
    <div
      title={STATE_NAMES[abbr]}
      className={`relative rounded-lg p-2 text-center text-xs font-bold transition-all cursor-default ${
        collected
          ? 'bg-brand-blue text-white shadow-glow'
          : 'bg-navy-800 text-navy-500 border border-navy-600'
      }`}
    >
      {collected && (
        <span className="absolute -top-1 -right-1 text-[8px] bg-brand-yellow text-navy-900 rounded-full w-3.5 h-3.5 flex items-center justify-center font-black">
          ✓
        </span>
      )}
      {abbr}
    </div>
  )
}

export default function Collection() {
  const { statesCollected } = useStore()
  const pct = Math.round((statesCollected.length / ALL_STATES.length) * 100)

  return (
    <div className="pb-nav px-4 pt-3 space-y-5 max-w-lg mx-auto">

      <div className="pt-2"><BackButton to="/" /></div>
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">State Collection</h1>
        <p className="text-slate-500 text-sm">Spot plates from all 50 states + D.C.</p>
      </div>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-2xl">{statesCollected.length}<span className="text-slate-500 text-base font-normal"> / {ALL_STATES.length}</span></span>
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

      {/* By region */}
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
                <StateChip key={abbr} abbr={abbr} collected={statesCollected.includes(abbr)} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {statesCollected.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-5xl mb-3">🗺️</div>
          <div className="font-semibold text-white">Start your collection!</div>
          <div className="text-sm mt-1">Submit a plate to add your first state</div>
        </div>
      )}
    </div>
  )
}
