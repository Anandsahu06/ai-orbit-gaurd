'use client'

import Link from 'next/link'
import { ArrowUpDown, ChevronRight } from 'lucide-react'
import type { ConjunctionEvent } from '@/lib/types/api'
import { formatDuration, formatUtc } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RiskBadge, StatusBadge } from '@/components/shared/badges'
import { RiskScoreBar } from '@/components/shared/risk-score'

export type ConjunctionSortKey = 'riskScore' | 'timeToTcaHours' | 'missDistanceKm' | 'relativeVelocityKms'

interface Props {
  events: ConjunctionEvent[]
  compact?: boolean
  sortKey?: ConjunctionSortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (key: ConjunctionSortKey) => void
  selectedId?: string
  onSelect?: (event: ConjunctionEvent) => void
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string
  column: ConjunctionSortKey
  sortKey?: ConjunctionSortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (key: ConjunctionSortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === column
  if (!onSort) return <span>{label}</span>
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-navy focus-visible:text-navy focus-visible:outline-none',
        align === 'right' && 'flex-row-reverse',
        active && 'text-navy',
      )}
      aria-label={`Sort by ${label}${active ? (sortDir === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      {label}
      <ArrowUpDown className={cn('size-3', active ? 'text-orange' : 'opacity-50')} aria-hidden="true" />
    </button>
  )
}

export function ConjunctionTable({ events, compact, sortKey, sortDir, onSort, selectedId, onSelect }: Props) {
  const th = 'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap'
  const td = 'px-4 py-3 whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-subtle/70">
          <tr>
            <th scope="col" className={th}>Event</th>
            <th scope="col" className={th}>Objects</th>
            <th scope="col" className={th}>
              <SortHeader label="TCA" column="timeToTcaHours" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            <th scope="col" className={cn(th, 'text-right')}>
              <SortHeader label="Miss Dist." column="missDistanceKm" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            </th>
            {!compact && (
              <th scope="col" className={cn(th, 'text-right')}>
                <SortHeader label="Rel. Vel." column="relativeVelocityKms" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
              </th>
            )}
            <th scope="col" className={th}>
              <SortHeader label="Risk" column="riskScore" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </th>
            {!compact && <th scope="col" className={th}>Status</th>}
            <th scope="col" className={cn(th, 'w-8')}>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((e) => {
            const selected = e.id === selectedId
            return (
              <tr
                key={e.id}
                className={cn('group transition-colors hover:bg-subtle', selected && 'bg-orange-soft/60 hover:bg-orange-soft/80')}
              >
                <td className={td}>
                  <span className="font-mono text-xs font-medium text-navy">{e.id}</span>
                </td>
                <td className={td}>
                  <div className="flex flex-col">
                    <span className="font-medium text-navy">{e.primaryObject.name}</span>
                    <span className="text-xs text-muted-foreground">vs {e.secondaryObject.name}</span>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-navy tabular">{formatUtc(e.tca)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground tabular">{formatDuration(e.timeToTcaHours)}</span>
                  </div>
                </td>
                <td className={cn(td, 'text-right font-mono text-navy tabular')}>{e.missDistanceKm.toFixed(2)} km</td>
                {!compact && (
                  <td className={cn(td, 'text-right font-mono text-navy tabular')}>{e.relativeVelocityKms.toFixed(1)} km/s</td>
                )}
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <RiskScoreBar score={e.riskScore} level={e.riskLevel} className={compact ? 'hidden sm:flex' : ''} />
                    <RiskBadge level={e.riskLevel} />
                  </div>
                </td>
                {!compact && (
                  <td className={td}>
                    <StatusBadge status={e.status} />
                  </td>
                )}
                <td className={cn(td, 'pr-3')}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(e)}
                      aria-label={`View ${e.id}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-orange focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      href={`/platform/risk?event=${e.id}`}
                      aria-label={`Analyse ${e.id}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-orange focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
