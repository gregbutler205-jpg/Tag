import { RARITY } from '../lib/rarityConfig'

export default function RarityBadge({ tier }) {
  const r = RARITY[tier] || RARITY.common
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${r.bg} ${r.color}`}>
      {r.label}
    </span>
  )
}
