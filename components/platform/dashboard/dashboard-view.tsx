'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, Clock, Radar, Satellite } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrbitGlobe } from '@/components/orbit/orbit-globe'
import { OrbitLegend } from '@/components/orbit/orbit-legend'
import { ConjunctionTable } from '@/components/platform/conjunction-table'
import { RiskBadge, SeverityBadge } from '@/components/shared/badges'
import { KpiCard, PageHeader, Panel } from '@/components/shared/primitives'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useAlerts, useConjunctions, useDashboardSummary, useOrbitTracks, useSatellites } from '@/hooks/use-api'
import { formatDuration, formatNumber, formatUtc } from '@/lib/format'
import { RiskDistributionMini } from './risk-distribution-mini'

export function DashboardView() {
  const summary = useDashboardSummary()
  const satellites = useSatellites()
  const tracks = useOrbitTracks()
  const conjunctions = useConjunctions()
  const alerts = useAlerts()

  const topEvents = [...(conjunctions.data ?? [])].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)
  const nextHighRisk = [...(conjunctions.data ?? [])]
    .filter((c) => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL')
    .sort((a, b) => a.timeToTcaHours - b.timeToTcaHours)[0]
  const recentAlerts = (alerts.data ?? []).slice(0, 4)

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Mission Dashboard"
        description="Screening summary across all tracked objects within the current 72-hour horizon."
        actions={
          <Button nativeButton={false} render={<Link href="/platform/conjunctions" />} className="bg-orange text-white hover:bg-orange/90">
            Review conjunctions
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Tracked Objects" icon={Satellite} loading={summary.isLoading} value={summary.data ? formatNumber(summary.data.trackedObjects ?? (summary.data as any).tracked_objects_count) : '—'} hint="Active satellites and debris" />
        <KpiCard label="Potential Conjunctions" icon={Radar} loading={summary.isLoading} value={summary.data?.potentialConjunctions ?? (summary.data as any)?.active_conjunctions_count ?? '—'} hint="Within screening horizon" />
        <KpiCard label="High-Risk Events" icon={AlertTriangle} accent loading={summary.isLoading} value={summary.data?.highRiskEvents ?? (summary.data as any)?.high_risk_count ?? '—'} hint="Risk level HIGH or CRITICAL" />
        <KpiCard label="Last Data Update" icon={Clock} loading={summary.isLoading} value={<span className="font-mono text-xl">{summary.data ? formatUtc(summary.data.lastDataUpdate ?? (summary.data as any).last_updated, false) : '—'}</span>} hint="Public TLE refresh" />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Orbital Overview"
          description="Backend-propagated positions and ground-fixed tracks"
          bodyClassName="p-0"
          actions={
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/platform/live-orbit" />}>
              Open Live Orbit
            </Button>
          }
        >
          <OrbitGlobe
            variant="compact"
            className="h-[380px] rounded-b-lg md:h-[440px]"
            satellites={satellites.data ?? []}
            tracks={tracks.data ?? []}
            highlightIds={nextHighRisk ? [nextHighRisk.primaryObject.id, nextHighRisk.secondaryObject.id] : undefined}
          >
            <OrbitLegend className="absolute top-3 left-3 z-10 hidden sm:flex" />
            {nextHighRisk && (
              <Link
                href={`/platform/risk?event=${nextHighRisk.id}`}
                className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-5rem)] flex-col gap-1 rounded-md border border-white/10 bg-navy/85 px-3 py-2 text-white backdrop-blur-sm transition-colors hover:bg-navy"
              >
                <span className="text-[10px] font-semibold tracking-[0.14em] text-orange uppercase">Next high-risk approach</span>
                <span className="truncate text-sm font-medium">
                  {nextHighRisk.primaryObject.name} · {nextHighRisk.secondaryObject.name}
                </span>
                <span className="font-mono text-[11px] text-white/70">
                  {formatDuration(nextHighRisk.timeToTcaHours)} · {nextHighRisk.missDistanceKm.toFixed(2)} km
                </span>
              </Link>
            )}
          </OrbitGlobe>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Risk Distribution" description="Open conjunction events by level">
            <RiskDistributionMini events={conjunctions.data} />
          </Panel>

          <Panel
            title="Recent Alerts"
            className="flex-1"
            bodyClassName="p-0"
            actions={
              <Link href="/platform/alerts" className="text-xs font-medium text-orange hover:underline">
                View all
              </Link>
            }
          >
            {alerts.error ? (
              <ErrorState onRetry={() => alerts.mutate()} />
            ) : alerts.isLoading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : recentAlerts.length === 0 ? (
              <EmptyState title="No alerts." />
            ) : (
              <ul className="divide-y">
                {recentAlerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <SeverityBadge severity={a.status === 'RESOLVED' ? 'RESOLVED' : a.severity} className="mt-0.5" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium text-navy">{a.title}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{formatUtc(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Top Risk Events"
        description="Highest backend-assigned risk scores"
        bodyClassName="p-0"
        actions={
          <Link href="/platform/conjunctions" className="text-xs font-medium text-orange hover:underline">
            All conjunctions
          </Link>
        }
      >
        {conjunctions.error ? (
          <ErrorState onRetry={() => conjunctions.mutate()} />
        ) : conjunctions.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : topEvents.length === 0 ? (
          <EmptyState title="No conjunctions detected." description="No close approaches within the screening horizon." />
        ) : (
          <ConjunctionTable events={topEvents} compact />
        )}
      </Panel>

      {nextHighRisk && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <RiskBadge level={nextHighRisk.riskLevel} />
          Scores are produced by the backend risk model. The dashboard displays values without modification.
        </p>
      )}
    </>
  )
}
