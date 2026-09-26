'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Globe2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SatelliteDetails } from '@/components/platform/satellite-details'
import { ObjectTypeBadge, PrototypeBadge } from '@/components/shared/badges'
import { PageHeader, Panel, SegmentedControl } from '@/components/shared/primitives'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useSatellites } from '@/hooks/use-api'
import { formatNumber } from '@/lib/format'
import type { ObjectType, OrbitRegime, Satellite } from '@/lib/types/api'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'altitudeKm' | 'velocityKms' | 'inclinationDeg' | 'periodMin'

const COLUMNS: { key: SortKey; label: string; align?: 'right'; render: (s: Satellite) => React.ReactNode }[] = [
  { key: 'altitudeKm', label: 'Altitude', align: 'right', render: (s) => `${formatNumber(s.altitudeKm ?? (s as any).altitude_km, 1)} km` },
  { key: 'velocityKms', label: 'Velocity', align: 'right', render: (s) => `${((s.velocityKms ?? (s as any).velocity_kms ?? 0)).toFixed(2)} km/s` },
  { key: 'inclinationDeg', label: 'Incl.', align: 'right', render: (s) => `${((s.inclinationDeg ?? (s as any).inclination_deg ?? 0)).toFixed(1)}°` },
  { key: 'periodMin', label: 'Period', align: 'right', render: (s) => `${formatNumber(s.periodMin ?? (s as any).period_min, 1)} min` },
]

export function SatellitesView() {
  const { data, error, isLoading, mutate } = useSatellites()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'ALL' | ObjectType>('ALL')
  const [regime, setRegime] = useState<'ALL' | OrbitRegime>('ALL')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [detail, setDetail] = useState<Satellite | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (data ?? []).filter(
      (s) =>
        (type === 'ALL' || s.type === type) &&
        (regime === 'ALL' || s.regime === regime) &&
        (!q || s.name.toLowerCase().includes(q) || String(s.noradId).includes(q)),
    )
    return filtered.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, query, type, regime, sort])

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))

  const th = 'px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap'

  const SortButton = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn('inline-flex items-center gap-1 hover:text-navy', right && 'flex-row-reverse', sort.key === k && 'text-navy')}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <ArrowUpDown className={cn('size-3', sort.key === k ? 'text-orange' : 'opacity-50')} aria-hidden="true" />
    </button>
  )

  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Satellites"
        description="Catalog of tracked active satellites and debris with their latest propagated orbital state."
        badge={<PrototypeBadge />}
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or NORAD ID" aria-label="Search satellites" className="pl-8" />
          </div>
          <SegmentedControl
            label="Object type"
            value={type}
            onChange={setType}
            options={[
              { value: 'ALL', label: 'All types' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DEBRIS', label: 'Debris' },
            ]}
          />
          <SegmentedControl
            label="Orbit regime"
            value={regime}
            onChange={setRegime}
            options={[
              { value: 'ALL', label: 'All orbits' },
              { value: 'LEO', label: 'LEO' },
              { value: 'MEO', label: 'MEO' },
              { value: 'GEO', label: 'GEO' },
            ]}
          />
          <p className="text-xs text-muted-foreground md:ml-auto">
            <span className="font-semibold text-navy tabular">{rows.length}</span> objects
          </p>
        </div>

        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title="No results found." description="Adjust the search term or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-subtle/70">
                <tr>
                  <th scope="col" className={cn(th, 'text-left')}>
                    <SortButton k="name" label="Object" />
                  </th>
                  <th scope="col" className={cn(th, 'text-left')}>NORAD</th>
                  <th scope="col" className={cn(th, 'text-left')}>Type</th>
                  <th scope="col" className={cn(th, 'text-left')}>Regime</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} scope="col" className={cn(th, 'text-right')}>
                      <SortButton k={c.key} label={c.label} right />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setDetail(s)}
                    className="cursor-pointer transition-colors hover:bg-subtle"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetail(s)
                        }}
                        className="font-medium text-navy hover:text-orange focus-visible:text-orange focus-visible:outline-none"
                      >
                        {s.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.noradId}</td>
                    <td className="px-4 py-3"><ObjectTypeBadge type={s.type} /></td>
                    <td className="px-4 py-3 text-xs font-medium text-navy">{s.regime}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-right font-mono whitespace-nowrap text-navy tabular">
                        {c.render(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {detail && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="text-navy">{detail.name}</SheetTitle>
                <SheetDescription>Latest propagated orbital state</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 overflow-y-auto p-4">
                <SatelliteDetails satellite={detail} />
                <Button
                  nativeButton={false}
                  render={<Link href={`/platform/live-orbit?sat=${detail.id}`} />}
                  className="bg-orange text-white hover:bg-orange/90"
                >
                  <Globe2 data-icon="inline-start" />
                  View on Live Orbit
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
