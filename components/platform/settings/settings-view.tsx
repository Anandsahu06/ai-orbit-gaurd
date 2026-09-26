'use client'

import { Database, Server, ShieldCheck } from 'lucide-react'
import { PrototypeBadge, StatusDot } from '@/components/shared/badges'
import { Metric, PageHeader, Panel } from '@/components/shared/primitives'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { useSystemStatus } from '@/hooks/use-api'
import { formatUtc } from '@/lib/format'

const THRESHOLDS = [
  { label: 'Screening horizon', value: '72 h', note: 'Look-ahead window for conjunction screening' },
  { label: 'Screening distance', value: '5.0 km', note: 'Pairs closer than this at TCA are reported' },
  { label: 'Critical alert threshold', value: '< 0.25 km', note: 'Miss distance that raises a HIGH alert' },
  { label: 'High-risk score', value: '≥ 60', note: 'Risk score classified as HIGH or above' },
]

const RISK_BANDS = [
  { level: 'Low', range: '0 – 34', cls: 'bg-success' },
  { level: 'Medium', range: '35 – 59', cls: 'bg-warning' },
  { level: 'High', range: '60 – 84', cls: 'bg-danger' },
  { level: 'Critical', range: '85 – 100', cls: 'bg-critical' },
]

export function SettingsView() {
  const { data, error, isLoading, mutate } = useSystemStatus()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Backend connection and screening configuration. Thresholds are owned by the backend and shown here read-only."
        badge={<PrototypeBadge />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Backend Connection" actions={<Server className="size-4 text-muted-foreground" aria-hidden="true" />}>
          {error ? (
            <ErrorState onRetry={() => mutate()} />
          ) : isLoading || !data ? (
            <LoadingState />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 text-sm font-medium text-navy">
                <StatusDot tone={data.mode === 'CONNECTED' ? 'success' : 'warning'} pulse />
                {data.mode === 'CONNECTED' ? 'Connected to backend API' : 'Prototype mode — using local sample data'}
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Metric label="API Base URL" value={<span className="font-mono text-sm break-all">{apiBase || 'Not configured'}</span>} className="col-span-2" />
                <Metric label="Data Source" value={data.source} />
                <Metric label="Last Data Update" value={formatUtc(data.lastDataUpdate)} />
              </dl>
              <p className="rounded-md border bg-subtle px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Set <code className="font-mono text-navy">NEXT_PUBLIC_API_BASE_URL</code> in project variables to switch from sample data to the live backend.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Screening Thresholds" actions={<ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />}>
          <dl className="divide-y">
            {THRESHOLDS.map((t) => (
              <div key={t.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <dt className="text-sm font-medium text-navy">{t.label}</dt>
                  <p className="text-xs text-muted-foreground">{t.note}</p>
                </div>
                <dd className="font-mono text-sm font-semibold whitespace-nowrap text-navy">{t.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Risk Classification" description="Score bands used across the platform" className="lg:col-span-2" actions={<Database className="size-4 text-muted-foreground" aria-hidden="true" />}>
          <div className="grid gap-3 sm:grid-cols-4">
            {RISK_BANDS.map((b) => (
              <div key={b.level} className="flex items-center gap-3 rounded-md border p-3">
                <span aria-hidden="true" className={`size-3 rounded-full ${b.cls}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-navy">{b.level}</span>
                  <span className="font-mono text-xs text-muted-foreground">{b.range}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
