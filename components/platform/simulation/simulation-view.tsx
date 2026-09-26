'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Loader2, Play } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { EventSelector } from '@/components/platform/event-selector'
import { RiskBadge } from '@/components/shared/badges'
import { PageHeader, Panel, SegmentedControl } from '@/components/shared/primitives'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { useConjunctions, useRunSimulation, useSimulationScenarios } from '@/hooks/use-api'
import { formatUtc } from '@/lib/format'
import type { ManeuverDirection, SimulationScenario } from '@/lib/types/api'
import { cn } from '@/lib/utils'

const chartConfig = {
  baseline: { label: 'Baseline', color: 'var(--danger)' },
  scenarioA: { label: 'Scenario A', color: 'var(--navy)' },
  scenarioB: { label: 'Scenario B', color: '#5B7BA6' },
  custom: { label: 'Custom', color: 'var(--orange)' },
} satisfies ChartConfig

const sliderValue = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number))

export function SimulationView({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const conjunctions = useConjunctions()
  const [pickedId, setPickedId] = useState(initialId)
  const [deltaV, setDeltaV] = useState(0.4)
  const [leadTime, setLeadTime] = useState(3)
  const [direction, setDirection] = useState<ManeuverDirection>('PROGRADE')

  const events = [...(conjunctions.data ?? [])].filter((e) => e.status !== 'RESOLVED').sort((a, b) => b.riskScore - a.riskScore)
  const eventId = pickedId ?? events[0]?.id
  const event = events.find((e) => e.id === eventId)

  const scenarios = useSimulationScenarios(event?.id)
  const run = useRunSimulation()
  const customResult = run.data?.conjunctionId === event?.id ? run.data : undefined
  const result = customResult ?? scenarios.data

  const selectEvent = (id: string) => {
    setPickedId(id)
    run.reset()
    router.replace(`/platform/simulation?event=${id}`, { scroll: false })
  }

  const runCustom = () => {
    if (!event) return
    run.trigger({ conjunctionId: event.id, deltaVMs: deltaV, direction, leadTimeHours: leadTime }).catch(() => {})
  }

  return (
    <>
      <PageHeader
        eyebrow="Simulate"
        title="Avoidance Simulation"
        description="Compare avoidance maneuver scenarios returned by the backend simulation service against the baseline trajectory."
        actions={events.length > 0 && <EventSelector events={events} value={eventId} onChange={selectEvent} />}
      />

      {conjunctions.error ? (
        <ErrorState onRetry={() => conjunctions.mutate()} />
      ) : conjunctions.isLoading ? (
        <LoadingState />
      ) : !event ? (
        <EmptyState title="No open conjunctions." description="There are no unresolved events to simulate." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Panel title="Custom Maneuver" description={`Maneuvering object: ${event.primaryObject.name}`}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dv">Delta-V</Label>
                    <span className="font-mono text-sm font-semibold text-navy tabular">{deltaV.toFixed(2)} m/s</span>
                  </div>
                  <Slider id="dv" min={0.1} max={50} step={0.5} value={[deltaV]} onValueChange={(v) => setDeltaV(sliderValue(v))} aria-label="Delta-V in metres per second" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lead">Lead time before TCA</Label>
                    <span className="font-mono text-sm font-semibold text-navy tabular">{leadTime.toFixed(1)} h</span>
                  </div>
                  <Slider id="lead" min={0.5} max={12} step={0.5} value={[leadTime]} onValueChange={(v) => setLeadTime(sliderValue(v))} aria-label="Lead time in hours" />
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">Burn direction</span>
                  <SegmentedControl
                    label="Burn direction"
                    value={direction}
                    onChange={setDirection}
                    size="sm"
                    className="w-full"
                    options={[
                      { value: 'PROGRADE', label: 'Prograde' },
                      { value: 'RETROGRADE', label: 'Retro' },
                      { value: 'RADIAL', label: 'Radial' },
                      { value: 'NORMAL', label: 'Normal' },
                    ]}
                  />
                </div>
                <Button onClick={runCustom} disabled={run.isMutating} className="bg-orange text-white hover:bg-orange/90">
                  {run.isMutating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Play data-icon="inline-start" />}
                  {run.isMutating ? 'Recalculating…' : 'Recalculate'}
                </Button>
                {run.error && <p className="text-xs text-danger" role="alert">Simulation request failed. Try again.</p>}
              </div>
            </Panel>

            <div className="flex min-w-0 flex-col gap-6">
              {scenarios.error ? (
                <ErrorState onRetry={() => scenarios.mutate()} />
              ) : !result ? (
                <LoadingState label="Loading scenarios…" />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid h-full gap-4 sm:grid-cols-2">
                    {result.scenarios.map((s) => (
                      <ScenarioCard key={s.id} scenario={s} />
                    ))}
                    {!customResult && (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card p-4 text-center">
                        <FlaskConical className="size-5 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-medium text-navy">Custom scenario</p>
                        <p className="text-xs text-muted-foreground">Configure a maneuver and run it to compare here.</p>
                      </div>
                    )}
                  </div>
                  {result.recommendation && (
                    <div className="rounded-lg border bg-subtle p-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-navy">Recommendation: </span>
                      {result.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {result && (
            <Panel
              title="Predicted Separation Around TCA"
              description={`Distance between objects (km) · generated ${formatUtc(result.generatedAt)}`}
              className="w-full"
            >
              <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
                <LineChart data={result.separation} margin={{ left: -12, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="tMinutes" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => (v === 0 ? 'TCA' : `${v > 0 ? '+' : ''}${v}m`)} />
                  <YAxis tickLine={false} axisLine={false} width={44} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `T ${Number(p?.[0]?.payload?.tMinutes) >= 0 ? '+' : ''}${p?.[0]?.payload?.tMinutes} min`} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line dataKey="baseline" type="monotone" stroke="var(--color-baseline)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
                  <Line dataKey="scenarioA" type="monotone" stroke="var(--color-scenarioA)" strokeWidth={2} dot={false} />
                  <Line dataKey="scenarioB" type="monotone" stroke="var(--color-scenarioB)" strokeWidth={2} dot={false} />
                  {customResult && <Line dataKey="custom" type="monotone" stroke="var(--color-custom)" strokeWidth={2.5} dot={false} />}
                </LineChart>
              </ChartContainer>
            </Panel>
          )}
        </div>
      )}
    </>
  )
}

function ScenarioCard({ scenario: s }: { scenario: SimulationScenario }) {
  const isBaseline = s.id === 'baseline'
  const isCustom = s.id === 'custom'
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4',
        isCustom && 'border-orange ring-1 ring-orange/30',
      )}
      aria-label={s.label}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn('text-sm font-semibold', isCustom ? 'text-orange' : 'text-navy')}>{s.label}</h3>
        <RiskBadge level={s.riskLevel} />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {isBaseline ? 'No maneuver' : `${s.deltaVMs.toFixed(2)} m/s · ${s.direction?.toLowerCase()} · T-${s.leadTimeHours}h`}
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Miss dist.</dt>
          <dd className="font-mono text-lg font-semibold text-navy tabular">{s.missDistanceKm.toFixed(2)}<span className="ml-0.5 text-xs font-normal text-muted-foreground">km</span></dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Risk score</dt>
          <dd className="font-mono text-lg font-semibold text-navy tabular">{s.riskScore}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Risk reduction</span>
          <span className={cn('font-semibold tabular', isBaseline ? 'text-muted-foreground' : 'text-success')}>
            {isBaseline ? '—' : `${s.riskReductionPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(0, Math.min(100, s.riskReductionPct))}%` }} />
        </div>
      </div>
    </article>
  )
}
