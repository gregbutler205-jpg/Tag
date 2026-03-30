const TIERS = {
  common:    { label: 'Common',    classes: 'bg-slate-700/80 text-slate-300 border-slate-600' },
  uncommon:  { label: 'Uncommon',  classes: 'bg-emerald-900/80 text-emerald-300 border-emerald-700' },
  rare:      { label: 'Rare',      classes: 'bg-blue-900/80 text-blue-300 border-blue-600' },
  epic:      { label: 'Epic',      classes: 'bg-purple-900/80 text-purple-300 border-purple-600 rarity-epic' },
  legendary: { label: 'Legendary', classes: 'bg-yellow-900/80 text-yellow-300 border-yellow-600 rarity-legendary' },
}

const STARS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }

export default function RarityBadge({ tier, showStars = true }) {
  const t = TIERS[tier] || TIERS.common
  const stars = STARS[tier] || 1
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.classes}`}>
      {showStars && <span className="opacity-80">{'★'.repeat(stars)}</span>}
      {t.label}
    </span>
  )
}
