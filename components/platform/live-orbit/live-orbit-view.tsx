'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { OrbitGlobe } from '@/components/orbit/orbit-globe'
import { OrbitLegend } from '@/components/orbit/orbit-legend'
import { SatelliteDetails } from '@/components/platform/satellite-details'
import { PrototypeBadge } from '@/components/shared/badges'
import { PageHeader, SegmentedControl } from '@/components/shared/primitives'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { useConjunctions, useOrbitTracks, useSatellites } from '@/hooks/use-api'
import type { ObjectType } from '@/lib/types/api'
import { cn } from '@/lib/utils'

type TypeFilter = 'ALL' | ObjectType

export function LiveOrbitView({ initialId }: { initialId?: string }) {
  const satellites = useSatellites()
  const tracks = useOrbitTracks()
  const conjunctions = useConjunctions()
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [showAllTracks, setShowAllTracks] = useState(true)

  const all = satellites.data ?? []
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (s) =>
        (typeFilter === 'ALL' || s.type === typeFilter) &&
        (!q || s.name.toLowerCase().includes(q) || String(s.noradId).includes(q)),
    )
  }, [all, query, typeFilter])

  const selected = all.find((s) => s.id === selectedId)
  const pairIds = useMemo(() => {
    if (!selectedId || !conjunctions.data) return undefined
    const ids = conjunctions.data
      .filter((c) => c.status !== 'RESOLVED' && (c.primaryObject.id === selectedId || c.secondaryObject.id === selectedId))
      .flatMap((c) => [c.primaryObject.id, c.secondaryObject.id])
      .filter((id) => id !== selectedId)
    return ids.length ? ids : undefined
  }, [conjunctions.data, selectedId])

  const counts = {
    ALL: all.length,
    ACTIVE: all.filter((s) => s.type === 'ACTIVE').length,
    DEBRIS: all.filter((s) => s.type === 'DEBRIS').length,
  }

  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Live Orbit"
        description="Interactive 3D view of backend-propagated object positions. Select an object on the globe or from the list."
        badge={<PrototypeBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex max-h-[680px] flex-col overflow-hidden rounded-lg border bg-card lg:order-first">
          <div className="flex flex-col gap-3 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or NORAD ID"
                aria-label="Search objects"
                className="pl-8"
              />
            </div>
            <SegmentedControl
              label="Filter by object type"
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-full"
              options={[
                { value: 'ALL', label: 'All', count: counts.ALL },
                { value: 'ACTIVE', label: 'Active', count: counts.ACTIVE },
                { value: 'DEBRIS', label: 'Debris', count: counts.DEBRIS },
              ]}
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="all-tracks" className="text-xs font-medium text-muted-foreground">
                Show all orbit tracks
              </Label>
              <Switch id="all-tracks" checked={showAllTracks} onCheckedChange={setShowAllTracks} />
            </div>
          </div>

          {selected && (
            <div className="border-b bg-subtle/60 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-orange uppercase">Selected object</p>
                  <h2 className="text-base font-semibold text-navy">{selected.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Clear selection"
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-navy"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <SatelliteDetails satellite={selected} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {satellites.error ? (
              <ErrorState onRetry={() => satellites.mutate()} />
            ) : satellites.isLoading ? (
              <LoadingState />
            ) : visible.length === 0 ? (
              <EmptyState title="No objects match." description="Try a different search or filter." />
            ) : (
              <ul aria-label="Tracked objects" className="divide-y">
                {visible.map((s) => {
                  const active = s.id === selectedId
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none',
                          active && 'bg-orange-soft/70 hover:bg-orange-soft',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn('size-2 shrink-0 rounded-full', active ? 'bg-orange' : s.type === 'DEBRIS' ? 'bg-[#8A9AB0]' : 'bg-navy')}
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-navy">{s.name}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.noradId} · {s.regime}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground tabular">{Math.round(s.altitudeKm).toLocaleString()} km</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <OrbitGlobe
          className="h-[520px] rounded-lg border md:h-[680px]"
          satellites={visible}
          tracks={tracks.data ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          highlightIds={pairIds}
          showAllTracks={showAllTracks}
        >
          <OrbitLegend className="absolute top-3 left-3 z-10" />
          <div className="absolute top-3 right-3 z-10 rounded-md border border-white/10 bg-navy/80 px-3 py-2 font-mono text-[11px] text-white/80 backdrop-blur-sm">
            {visible.length} objects displayed
          </div>
        </OrbitGlobe>
      </div>
    </>
  )
}
