'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrototypeBadge, RiskBadge, SeverityBadge, StatusBadge } from '@/components/shared/badges'
import { PageHeader, Panel, SegmentedControl } from '@/components/shared/primitives'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { useAlerts } from '@/hooks/use-api'
import { formatUtc } from '@/lib/format'
import type { Alert, AlertStatus } from '@/lib/types/api'
import { cn } from '@/lib/utils'

type Filter = 'ALL' | AlertStatus

const SEVERITY_BAR: Record<Alert['severity'], string> = {
  HIGH: 'bg-danger',
  MEDIUM: 'bg-warning',
  INFO: 'bg-info',
}

export function AlertsView() {
  const { data, error, isLoading, mutate } = useAlerts()
  const [filter, setFilter] = useState<Filter>('ALL')

  const alerts = data ?? []
  const visible = alerts.filter((a) => filter === 'ALL' || a.status === filter)
  const count = (f: Filter) => (f === 'ALL' ? alerts.length : alerts.filter((a) => a.status === f).length)

  // Status changes are client-side only until the backend alert endpoints are connected.
  const setStatus = (id: string, status: AlertStatus) =>
    mutate((current) => current?.map((a) => (a.id === id ? { ...a, status } : a)), { revalidate: false })

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Alerts"
        description="Notifications raised by the screening pipeline for events that require operator attention."
        badge={<PrototypeBadge />}
      />

      <Panel
        bodyClassName="p-0"
        title="Alert Feed"
        actions={
          <SegmentedControl
            label="Filter alerts by status"
            value={filter}
            onChange={setFilter}
            size="sm"
            options={(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as Filter[]).map((f) => ({
              value: f,
              label: f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase(),
              count: count(f),
            }))}
          />
        }
      >
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState title="No alerts." description="Nothing matches this filter right now." />
        ) : (
          <ul className="divide-y">
            {visible.map((a) => (
              <li key={a.id} className={cn('relative flex flex-col gap-3 py-4 pr-4 pl-6 md:flex-row md:items-center', a.status === 'RESOLVED' && 'opacity-70')}>
                <span aria-hidden="true" className={cn('absolute top-4 bottom-4 left-0 w-1 rounded-r', SEVERITY_BAR[a.severity])} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <StatusBadge status={a.status} />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {a.id} · {formatUtc(a.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-navy">{a.title}</h3>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                  {a.objects.length > 0 && (
                    <p className="text-xs text-navy">
                      {a.objects.map((o) => o.name).join(' ↔ ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {a.riskLevel && typeof a.riskScore === 'number' && (
                    <div className="mr-2 flex items-center gap-2">
                      <span className="font-mono text-lg font-semibold text-navy tabular">{a.riskScore}</span>
                      <RiskBadge level={a.riskLevel} />
                    </div>
                  )}
                  {a.status === 'OPEN' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(a.id, 'ACKNOWLEDGED')}>
                      <Check data-icon="inline-start" />
                      Acknowledge
                    </Button>
                  )}
                  {a.status !== 'RESOLVED' && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(a.id, 'RESOLVED')}>
                      <CheckCheck data-icon="inline-start" />
                      Resolve
                    </Button>
                  )}
                  {a.conjunctionId && (
                    <Button size="sm" nativeButton={false} render={<Link href={`/platform/risk?event=${a.conjunctionId}`} />} className="bg-navy text-white hover:bg-navy/90">
                      Review
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
