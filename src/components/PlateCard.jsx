import RarityBadge from './RarityBadge'

export default function PlateCard({ plate, state, result, children, animate = false }) {
  return (
    <div className={`glass-card rounded-2xl p-5 space-y-4 ${animate ? 'animate-fade-up' : ''}`}>

      {/* License plate */}
      <div className="plate-wrap relative flex justify-center">
        <div className="plate w-full max-w-xs mx-auto px-8 py-4 text-center">
          {state && (
            <div className="text-[10px] font-bold tracking-[0.3em] text-navy-700 mb-1 uppercase">
              {state}
            </div>
          )}
          <div className="text-4xl font-black tracking-[0.2em] text-slate-900 leading-none">
            {plate || '???'}
          </div>
          {!state && (
            <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 mt-1">
              VANITY PLATE
            </div>
          )}
        </div>
      </div>

      {/* AI result */}
      {result && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 flex-wrap">
            <RarityBadge tier={result.rarity} />
            {result.category && (
              <span className="text-xs text-navy-500 bg-navy-800 border border-navy-600 px-2 py-0.5 rounded-full capitalize">
                {result.category}
              </span>
            )}
            {result.points && (
              <span className="ml-auto text-brand-yellow font-bold text-sm">
                +{result.points} pts
              </span>
            )}
          </div>

          {/* Primary interpretation */}
          <div className="bg-navy-800 rounded-xl p-3 border border-navy-600">
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Best Interpretation</div>
            <p className="text-white font-semibold text-base">{result.primary}</p>
          </div>

          {/* Alternatives */}
          {result.alternatives?.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Also Possible</div>
              {result.alternatives.map((alt, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-400 text-sm">
                  <span className="text-navy-500 mt-0.5">◆</span>
                  <span>{alt}</span>
                </div>
              ))}
            </div>
          )}

          {result.explanation && (
            <p className="text-slate-400 text-sm leading-relaxed border-t border-navy-700 pt-3">
              {result.explanation}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
