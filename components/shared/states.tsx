import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Loading orbital data…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <Loader2 className="size-5 animate-spin text-orange" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Unable to fetch orbital data.',
  description = 'The data service did not respond. Check your connection and try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft">
        <AlertCircle className="size-5 text-danger" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw data-icon="inline-start" />
          Retry
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title = 'No results found.',
  description,
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-navy">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-28 rounded-lg', className)} />
}
