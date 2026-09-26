import { cn } from '@/lib/utils'

const ITEMS = [
  { label: 'Active satellite', swatch: 'bg-[#E6EEF9]' },
  { label: 'Debris', swatch: 'bg-[#8A9AB0]' },
  { label: 'Selected', swatch: 'bg-orange' },
  { label: 'Conjunction pair', swatch: 'bg-[#FF8A80]' },
]

export function OrbitLegend({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ul
      aria-label="Map legend"
      className={cn(
        'flex gap-x-4 gap-y-1.5 rounded-md border border-white/10 bg-navy/80 px-3 py-2 text-[11px] text-white/85 backdrop-blur-sm',
        compact ? 'flex-wrap' : 'flex-col',
        className,
      )}
    >
      {ITEMS.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', i.swatch)} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
