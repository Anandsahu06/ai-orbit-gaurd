'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gauge, Rocket, Timer, Zap } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { OrbitGlobe } from '@/components/orbit/orbit-globe'
import { EventSelector } from '@/components/platform/event-selector'
import { ObjectTypeBadge, RiskBadge } from '@/components/shared/badges'
import { Metric, PageHeader, Panel } from '@/components/shared/primitives'
import { RiskGauge } from '@/components/shared/risk-score'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { useConjunctions, useOrbitTracks, useRiskAssessment, useSatellites } from '@/hooks/use-api'
import { formatDuration, formatUtc } from '@/lib/format'
import type { RiskFactorKey } from '@/lib/types/api'

const FACTOR_ICON: Record<RiskFactorKey, typeof Gauge> = {
  missDistance: Gauge,
  relativeVelocity: Zap,
  timeToTca: Timer,
}

const chartConfig = { riskScore: { label: 'Risk score', color: 'var(--orange)' } } satisfies ChartConfig

export function RiskView({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const conjunctions = useConjunctions()
  const satellites = useSatellites()
  const tracks = useOrbitTracks()
  const [pickedId, setPickedId] = useState(initialId)

  const events = [...(conjunctions.data ?? [])].sort((a, b) => b.riskScore - a.riskScore)
  const eventId = pickedId ?? events[0]?.id
  const event = events.find((e) => e.id === eventId)
  const risk = useRiskAssessment(event?.id)

  const selectEvent = (id: string) => {
    setPickedId(id)
    router.replace(`/platform/risk?event=${id}`, { scroll: false })
  }

  const primaryObj = event?.primaryObject ?? {
    id: (event as any)?.primary_id ?? 'P1',
    name: (event as any)?.primary_name ?? 'Primary Object',
    noradId: 0,
    type: 'ACTIVE' as const
  }
  const secondaryObj = event?.secondaryObject ?? {
    id: (event as any)?.secondary_id ?? 'P2',
    name: (event as any)?.secondary_name ?? 'Secondary Object',
    noradId: 0,
    type: 'DEBRIS' as const
  }

  const pairSats = event
    ? (satellites.data ?? []).filter((s) => s.id === primaryObj.id || s.id === secondaryObj.id)
    : []

  return (
    <>
      <PageHeader
        eyebrow="Assess"
        title="Risk Analysis"
        description="Explainable view of the backend risk assessment for a selected conjunction event."
        actions={events.length > 0 && <EventSelector events={events} value={eventId} onChange={selectEvent} />}
      />

      {conjunctions.error ? (
        <ErrorState onRetry={() => conjunctions.mutate()} />
      ) : conjunctions.isLoading ? (
        <LoadingState />
      ) : !event ? (
        <EmptyState title="No conjunctions detected." description="There are no events available to analyse." />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Risk Score" description={risk.data ? `${risk.data.model} · v${risk.data.modelVersion}` : 'Backend risk model'}>
              {risk.error ? (
                <ErrorState onRetry={() => risk.mutate()} />
              ) : !risk.data ? (
                <LoadingState label="Loading assessment…" />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <RiskGauge score={risk.data.riskScore} level={risk.data.riskLevel} size={220} />
                  <RiskBadge level={risk.data.riskLevel} />
                  <p className="text-center font-mono text-[11px] text-muted-foreground">Assessed {formatUtc(risk.data.assessedAt)}</p>
                </div>
              )}
            </Panel>

            <Panel title="Event Geometry" description={<span className="font-mono">{event.id}</span>}>
              <div className="flex flex-col gap-4">
                {[primaryObj, secondaryObj].map((o, i) => (
                  <div key={o.id || i} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{i === 0 ? 'Primary' : 'Secondary'}</span>
                      <span className="truncate text-sm font-medium text-navy">{o?.name ?? 'Unknown Object'}</span>
                    </div>
                    <ObjectTypeBadge type={o?.type ?? 'ACTIVE'} />
                  </div>
                ))}
                <dl className="grid grid-cols-2 gap-4 border-t pt-4">
                  <Metric label="TCA" value={formatUtc(event.tca)} className="col-span-2" />
                  <Metric label="Time to TCA" value={formatDuration(event.timeToTcaHours ?? (event as any).time_to_tca_hours ?? 0)} />
                  <Metric label="Miss Distance" value={`${(event.missDistanceKm ?? (event as any).miss_distance_km ?? 0).toFixed(2)} km`} />
                  <Metric label="Relative Velocity" value={`${(event.relativeVelocityKms ?? (event as any).relative_velocity_kms ?? 0).toFixed(2)} km/s`} className="col-span-2" />
                </dl>
              </div>
            </Panel>

            <Panel title="Encounter View" description="Conjunction pair and approximate TCA" bodyClassName="p-0">
              <OrbitGlobe
                variant="compact"
                showControls={false}
                className="h-[340px] rounded-b-lg"
                satellites={pairSats}
                tracks={tracks.data ?? []}
                highlightIds={pairSats.map((s) => s.id)}
                showAllTracks={false}
                tcaPoint={event.tcaPoint}
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel className="lg:col-span-2" title="Contributing Factors" description="Inputs considered by the risk model">
              {!risk.data ? (
                <LoadingState label="Loading factors…" />
              ) : (
                <ul className="flex flex-col gap-4">
                  {risk.data.factors.map((f) => {
                    const Icon = FACTOR_ICON[f.key] ?? Gauge
                    return (
                      <li key={f.key} className="flex gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-orange-soft text-orange">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-sm font-medium text-navy">{f.label}</span>
                            <span className="font-mono text-sm font-semibold text-navy tabular-nums shrink-0 text-right">{f.displayValue}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">{f.description}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <Panel className="lg:col-span-3" title="Risk Score History" description="Score across successive screening runs">
              {!risk.data ? (
                <LoadingState label="Loading history…" />
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
                  <LineChart data={risk.data.history} margin={{ left: -16, right: 12, top: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="screenedAt" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatUtc(v, false).replace(' UTC', '')} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={40} />
                    <ReferenceLine y={70} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'High', position: 'insideTopRight', fontSize: 10, fill: 'var(--danger)' }} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatUtc(String(v))} />} />
                    <Line dataKey="riskScore" type="monotone" stroke="var(--color-riskScore)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </Panel>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-navy p-5 text-white sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Evaluate an avoidance maneuver</p>
              <p className="text-sm text-white/70">Compare backend-simulated scenarios against the baseline trajectory for this event.</p>
            </div>
            <Button nativeButton={false} render={<Link href={`/platform/simulation?event=${event.id}`} />} className="bg-orange text-white hover:bg-orange/90">
              <Rocket data-icon="inline-start" />
              Open Simulation
            </Button>
          </div>
        </>
      )}
    </>
  )
}
