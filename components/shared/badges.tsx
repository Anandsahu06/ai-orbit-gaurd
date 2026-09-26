import { cn } from '@/lib/utils'
import type { AlertSeverity, AlertStatus, ConjunctionStatus, ObjectType, RiskLevel } from '@/lib/types/api'

const base =
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap'

const riskStyles: Record<RiskLevel, string> = {
  LOW: 'bg-success-soft text-success border-success/20',
  MEDIUM: 'bg-warning-soft text-warning border-warning/25',
  HIGH: 'bg-danger-soft text-danger border-danger/20',
  CRITICAL: 'bg-critical text-white border-critical',
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span className={cn(base, riskStyles[level], className)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', level === 'CRITICAL' ? 'bg-white' : 'bg-current')} />
      {level}
    </span>
  )
}

export const riskColorVar: Record<RiskLevel, string> = {
  LOW: 'var(--success)',
  MEDIUM: 'var(--warning)',
  HIGH: 'var(--danger)',
  CRITICAL: 'var(--critical)',
}

const severityStyles: Record<AlertSeverity | 'RESOLVED', string> = {
  HIGH: 'bg-danger-soft text-danger border-danger/20',
  MEDIUM: 'bg-warning-soft text-warning border-warning/25',
  INFO: 'bg-info-soft text-info border-info/20',
  RESOLVED: 'bg-muted text-muted-foreground border-border',
}

export function SeverityBadge({ severity, className }: { severity: AlertSeverity | 'RESOLVED'; className?: string }) {
  return <span className={cn(base, severityStyles[severity], className)}>{severity}</span>
}

const statusStyles: Record<ConjunctionStatus | AlertStatus, string> = {
  OPEN: 'text-navy border-border bg-white',
  MONITORING: 'text-info border-info/20 bg-info-soft',
  ACKNOWLEDGED: 'text-info border-info/20 bg-info-soft',
  RESOLVED: 'text-muted-foreground border-border bg-muted',
}

export function StatusBadge({ status, className }: { status: ConjunctionStatus | AlertStatus; className?: string }) {
  return (
    <span className={cn(base, 'font-medium normal-case tracking-normal', statusStyles[status], className)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

export function ObjectTypeBadge({ type }: { type: ObjectType }) {
  return (
    <span
      className={cn(
        base,
        'font-medium normal-case tracking-normal',
        type === 'ACTIVE' ? 'border-navy/15 bg-navy/5 text-navy' : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {type === 'ACTIVE' ? 'Active' : 'Debris'}
    </span>
  )
}

export function PrototypeBadge(_props?: { label?: string; className?: string }) {
  return null
}

export function StatusDot({ tone = 'success', pulse = false }: { tone?: 'success' | 'warning' | 'danger' | 'muted'; pulse?: boolean }) {
  const color = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-muted-foreground',
  }[tone]
  return (
    <span className="relative flex size-2" aria-hidden="true">
      {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-50', color)} />}
      <span className={cn('relative inline-flex size-2 rounded-full', color)} />
    </span>
  )
}
