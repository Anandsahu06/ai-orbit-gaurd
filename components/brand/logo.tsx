import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect width="32" height="32" rx="7" className="fill-navy" />
      <circle cx="16" cy="16" r="5" className="fill-white" />
      <ellipse
        cx="16"
        cy="16"
        rx="11"
        ry="5.5"
        transform="rotate(-28 16 16)"
        fill="none"
        strokeWidth="1.6"
        className="stroke-white/60"
      />
      <circle cx="25.2" cy="11.4" r="2.2" className="fill-orange" />
    </svg>
  )
}

export function Logo({
  href = '/',
  className,
  compact = false,
}: {
  href?: string
  className?: string
  compact?: boolean
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)} aria-label="OrbitalGuard AI home">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-wide text-navy">
            ORBITALGUARD <span className="text-orange">AI</span>
          </span>
          <span className="mt-1 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Space Traffic Management
          </span>
        </span>
      )}
    </Link>
  )
}
