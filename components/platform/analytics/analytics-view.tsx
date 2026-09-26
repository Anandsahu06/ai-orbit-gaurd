'use client'

import { AlertTriangle, Orbit, Satellite, Trash2 } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { PrototypeBadge, riskColorVar } from '@/components/shared/badges'
import { KpiCard, PageHeader, Panel } from '@/components/shared/primitives'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { useAnalytics } from '@/hooks/use-api'
import { formatShortDate, formatUtc } from '@/lib/format'

const trendConfig = {
  total: { label: 'All conjunctions', color: 'var(--navy)' },
  highRisk: { label: 'High / critical', color: 'var(--orange)' },
} satisfies ChartConfig

const riskConfig = {
  count: { label: 'Events' },
  LOW: { label: 'Low', color: 'var(--success)' },
  MEDIUM: { label: 'Medium', color: 'var(--warning)' },
  HIGH: { label: 'High', color: 'var(--danger)' },
  CRITICAL: { label: 'Critical', color: 'var(--critical)' },
} satisfies ChartConfig

const regimeColors = { LEO: 'var(--navy)', MEO: '#5B7BA6', GEO: 'var(--orange)' } as const
const regimeConfig = {
  count: { label: 'Objects' },
  LEO: { label: 'LEO', color: regimeColors.LEO },
  MEO: { label: 'MEO', color: regimeColors.MEO },
  GEO: { label: 'GEO', color: regimeColors.GEO },
} satisfies ChartConfig

const bandConfig = { count: { label: 'Objects', color: 'var(--navy)' } } satisfies ChartConfig

export function AnalyticsView() {
  const { data, error, isLoading, mutate } = useAnalytics()

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Aggregate statistics on the tracked population and screened conjunction activity."
        badge={<PrototypeBadge />}
      />

      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Tracked Objects" value={data.fleet?.total ?? (data as any)?.tracked_objects ?? 0} icon={Orbit} />
            <KpiCard label="Active Satellites" value={data.fleet?.active ?? 0} icon={Satellite} />
            <KpiCard label="Debris Objects" value={data.fleet?.debris ?? 0} icon={Trash2} />
            <KpiCard
              label="Open Conjunctions"
              value={(data.riskDistribution ?? []).reduce((a, r) => a + (r?.count ?? 0), 0)}
              icon={AlertTriangle}
              accent
            />
          </div>

          <Panel title="Conjunction Trend" description={`Daily screened events, last 14 days · generated ${formatUtc(data.generatedAt)}`}>
            <ChartContainer config={trendConfig} className="aspect-auto h-[280px] w-full">
              <AreaChart data={data.conjunctionTrend} margin={{ left: -16, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-highRisk)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-highRisk)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatShortDate} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area dataKey="total" type="monotone" stroke="var(--color-total)" fill="url(#fillTotal)" strokeWidth={2} />
                <Area dataKey="highRisk" type="monotone" stroke="var(--color-highRisk)" fill="url(#fillHigh)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Risk Level Distribution" description="Open conjunction events">
              <ChartContainer config={riskConfig} className="aspect-auto h-[240px] w-full">
                <BarChart data={data.riskDistribution} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="level" tickLine={false} axisLine={false} tickFormatter={(v) => riskConfig[v as keyof typeof riskConfig]?.label ?? v} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="level" />} />
                  <Bar dataKey="count" radius={4}>
                    {data.riskDistribution.map((r) => (
                      <Cell key={r.level} fill={riskColorVar[r.level]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </Panel>

            <Panel title="Orbit Regime" description="Tracked objects by regime">
              <ChartContainer config={regimeConfig} className="mx-auto aspect-square h-[240px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="regime" />} />
                  <Pie data={data.regimeDistribution} dataKey="count" nameKey="regime" innerRadius={55} outerRadius={90} strokeWidth={2} paddingAngle={2}>
                    {data.regimeDistribution.map((r) => (
                      <Cell key={r.regime} fill={regimeColors[r.regime]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="regime" />} />
                </PieChart>
              </ChartContainer>
            </Panel>

            <Panel title="Altitude Bands" description="Object count by altitude">
              <ChartContainer config={bandConfig} className="aspect-auto h-[240px] w-full">
                <BarChart data={data.altitudeBands} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="band" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 11 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
