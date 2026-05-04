export default function Logo({ size = 'md', showTagline = false }) {
  const sizes = {
    sm:  { img: 'h-10',   title: 'text-xl',  sub: 'text-xs' },
    md:  { img: 'h-20',   title: 'text-3xl', sub: 'text-sm' },
    lg:  { img: 'h-36',   title: 'text-5xl', sub: 'text-base' },
    hero:{ img: 'h-52',   title: 'text-6xl', sub: 'text-lg' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <img
        src="/logo.jpg"
        alt="Tag Wizard — Decode. Compete. Collect."
        className={`${s.img} w-auto object-contain drop-shadow-2xl`}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      {showTagline && (
        <p className="text-brand-yellow/70 text-xs tracking-[0.25em] uppercase font-semibold">
          Decode · Compete · Collect
        </p>
      )}
    </div>
  )
}
