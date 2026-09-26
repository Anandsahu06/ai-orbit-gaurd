'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, Rocket, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConjunctionTable, type ConjunctionSortKey } from '@/components/platform/conjunction-table'
import { ObjectTypeBadge, PrototypeBadge, RiskBadge, StatusBadge } from '@/components/shared/badges'
import { Metric, PageHeader, Panel, SegmentedControl } from '@/components/shared/primitives'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useConjunctions } from '@/hooks/use-api'
import { formatDuration, formatUtc } from '@/lib/format'
import type { ConjunctionEvent, RiskLevel } from '@/lib/types/api'

type LevelFilter = 'ALL' | RiskLevel

export function ConjunctionsView() {
  const { data, error, isLoading, mutate } = useConjunctions()
  const [level, setLevel] = useState<LevelFilter>('ALL')
  const [query, setQuery] = useState('')
  const [hideResolved, setHideResolved] = useState(false)
  const [sortKey, setSortKey] = useState<ConjunctionSortKey>('riskScore')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<ConjunctionEvent | null>(null)

  const events = data ?? []
  const counts = (l: LevelFilter) => (l === 'ALL' ? events.length : events.filter((e) => e.riskLevel === l).length)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter(
        (e) =>
          (level === 'ALL' || e.riskLevel === level) &&
          (!hideResolved || e.status !== 'RESOLVED') &&
          (!q ||
            e.id.toLowerCase().includes(q) ||
            e.primaryObject.name.toLowerCase().includes(q) ||
            e.secondaryObject.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => (sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]))
  }, [events, level, query, hideResolved, sortKey, sortDir])

  const onSort = (key: ConjunctionSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'riskScore' || key === 'relativeVelocityKms' ? 'desc' : 'asc')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assess"
        title="Conjunctions"
        description="Predicted close approaches between tracked objects, screened by the backend within a 72-hour horizon."
        badge={<PrototypeBadge />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel bodyClassName="p-0">
          <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
            <SegmentedControl
              label="Filter by risk level"
              value={level}
              onChange={setLevel}
              className="overflow-x-auto"
              options={(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as LevelFilter[]).map((l) => ({
                value: l,
                label: l === 'ALL' ? 'All' : l.charAt(0) + l.slice(1).toLowerCase(),
                count: counts(l),
              }))}
            />
            <div className="relative lg:ml-auto lg:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event or object" aria-label="Search conjunctions" className="pl-8" />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium whitespace-nowrap text-muted-foreground">
              <input
                type="checkbox"
                checked={hideResolved}
                onChange={(e) => setHideResolved(e.target.checked)}
                className="size-3.5 accent-orange"
              />
              Hide resolved
            </label>
          </div>

          {error ? (
            <ErrorState onRetry={() => mutate()} />
          ) : isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : rows.length === 0 ? (
            <EmptyState title="No conjunctions detected." description="No events match the current filters." />
          ) : (
            <ConjunctionTable
              events={rows}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </Panel>

        <ConjunctionDetailPanel event={selected} onClose={() => setSelected(null)} />
      </div>
    </>
  )
}

function ConjunctionDetailPanel({ event, onClose }: { event: ConjunctionEvent | null; onClose: () => void }) {
  if (!event) {
    return (
      <Panel title="Event Details" className="xl:sticky xl:top-22 xl:self-start">
        <EmptyState title="No event selected." description="Select a conjunction from the table to review its details." className="py-8" />
      </Panel>
    )
  }

  return (
    <Panel
      className="xl:sticky xl:top-22 xl:self-start"
      title={<span className="font-mono">{event.id}</span>}
      description={`Screened ${formatUtc(event.screenedAt)}`}
      actions={
        <button type="button" onClick={onClose} aria-label="Close details" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy">
          <X className="size-4" aria-hidden="true" />
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <RiskBadge level={event.riskLevel} />
          <StatusBadge status={event.status} />
          <span className="ml-auto text-3xl font-semibold text-navy tabular">{event.riskScore}</span>
        </div>

        <div className="flex flex-col gap-2">
          {[
            event.primaryObject ?? { id: (event as any).primary_id ?? 'P1', name: (event as any).primary_name ?? 'Primary Object', noradId: 0, type: 'ACTIVE' as const },
            event.secondaryObject ?? { id: (event as any).secondary_id ?? 'P2', name: (event as any).secondary_name ?? 'Secondary Object', noradId: 0, type: 'DEBRIS' as const }
          ].map((o, i) => (
            <div key={o.id || i} className="flex items-center justify-between rounded-md border bg-subtle/60 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{i === 0 ? 'Primary' : 'Secondary'}</span>
                <span className="text-sm font-medium text-navy">{o.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">NORAD {o.noradId}</span>
              </div>
              <ObjectTypeBadge type={o.type} />
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Metric label="TCA" value={formatUtc(event.tca)} className="col-span-2" />
          <Metric label="Time to TCA" value={formatDuration(event.timeToTcaHours ?? (event as any).time_to_tca_hours)} />
          <Metric label="Miss Distance" value={`${(event.missDistanceKm ?? (event as any).miss_distance_km ?? 0).toFixed(2)} km`} />
          <Metric label="Relative Velocity" value={`${(event.relativeVelocityKms ?? (event as any).relative_velocity_kms ?? 0).toFixed(2)} km/s`} />
          <Metric label="Risk Score" value={`${event.riskScore ?? 0} / 100`} />
        </dl>

        <div className="flex flex-col gap-2">
          <Button nativeButton={false} render={<Link href={`/platform/risk?event=${event.id}`} />} className="bg-navy text-white hover:bg-navy/90">
            <Activity data-icon="inline-start" />
            Open Risk Analysis
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/platform/simulation?event=${event.id}`} />}>
            <Rocket data-icon="inline-start" />
            Simulate Avoidance
          </Button>
        </div>
      </div>
    </Panel>
  )
}
