import RarityBadge from './RarityBadge'

export default function PlateCard({ plate, result, children }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
      {/* Plate display */}
      <div className="bg-yellow-100 text-slate-900 rounded-xl px-6 py-3 text-center font-black text-3xl tracking-widest font-mono shadow-inner">
        {plate || '???'}
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <RarityBadge tier={result.rarity} />
            <span className="text-xs text-slate-400 capitalize">{result.category}</span>
          </div>
          <p className="text-white font-semibold">{result.primary}</p>
          {result.alternatives?.length > 0 && (
            <div className="space-y-1">
              {result.alternatives.map((alt, i) => (
                <p key={i} className="text-slate-400 text-sm">• {alt}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
