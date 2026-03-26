import useStore from '../store/useStore'

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

export default function Collection() {
  const { statesCollected } = useStore()

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4">
        <h1 className="text-2xl font-black">State Collection</h1>
        <p className="text-slate-400 text-sm">{statesCollected.length} / {ALL_STATES.length} states collected</p>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(statesCollected.length / ALL_STATES.length) * 100}%` }}
        />
      </div>

      {/* State grid */}
      <div className="grid grid-cols-4 gap-2">
        {ALL_STATES.map(abbr => {
          const collected = statesCollected.includes(abbr)
          return (
            <div
              key={abbr}
              title={STATE_NAMES[abbr]}
              className={`rounded-xl p-2 text-center text-xs font-bold transition-colors ${
                collected
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {abbr}
            </div>
          )
        })}
      </div>

      {/* Collected list */}
      {statesCollected.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-slate-300">Collected</h2>
          {statesCollected.map(abbr => (
            <div key={abbr} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-2 border border-slate-700">
              <span className="text-blue-400 font-bold w-8">{abbr}</span>
              <span className="text-slate-300 text-sm">{STATE_NAMES[abbr]}</span>
              <span className="ml-auto text-green-400">✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
