import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <p className="text-[11px] font-semibold tracking-[0.14em] text-orange uppercase">{eyebrow}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-navy text-balance">{title}</h1>
          {badge}
        </div>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('flex flex-col rounded-lg border bg-card shadow-[0_1px_2px_rgba(11,31,58,0.04)]', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <h2 className="text-sm font-semibold text-navy">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('flex-1', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
  loading = false,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  accent?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(11,31,58,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-md',
              accent ? 'bg-orange-soft text-orange' : 'bg-muted text-navy',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <span className="h-7 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <p className={cn('text-2xl font-semibold tracking-tight tabular', accent ? 'text-orange' : 'text-navy')}>{value}</p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Metric({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('font-mono text-sm font-medium text-navy tabular', valueClassName)}>{value}</dd>
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'sm',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  label: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg border bg-muted/60 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'bg-white text-navy shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-navy',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('rounded px-1 text-[10px] tabular', active ? 'bg-orange-soft text-orange' : 'bg-white/70')}>
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
