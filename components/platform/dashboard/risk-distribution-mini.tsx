import type { ConjunctionEvent, RiskLevel } from '@/lib/types/api'
import { riskColorVar } from '@/components/shared/badges'

const LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function RiskDistributionMini({ events }: { events?: ConjunctionEvent[] }) {
  if (!events) return <div className="h-24 animate-pulse rounded bg-muted" />
  const counts = LEVELS.map((level) => ({ level, count: events.filter((e) => e.riskLevel === level).length }))
  const total = events.length || 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Risk level proportions">
        {counts.map((c) =>
          c.count ? (
            <span key={c.level} style={{ width: `${(c.count / total) * 100}%`, backgroundColor: riskColorVar[c.level] }} />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-4 gap-2">
        {counts.map((c) => (
          <div key={c.level} className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: riskColorVar[c.level] }} aria-hidden="true" />
              {c.level}
            </dt>
            <dd className="text-xl font-semibold text-navy tabular">{c.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
