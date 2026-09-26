import type { RiskLevel } from '@/lib/types/api'
import { cn } from '@/lib/utils'
import { riskColorVar } from './badges'

export function RiskScoreBar({ score, level, className }: { score: number; level: RiskLevel; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="w-7 font-mono text-sm font-semibold text-navy tabular">{score}</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${score}%`, backgroundColor: riskColorVar[level] }} />
      </span>
    </div>
  )
}

/** Semi-circular gauge displaying a backend-provided 0–100 risk score. */
export function RiskGauge({ score, level, size = 200 }: { score: number; level: RiskLevel; size?: number }) {
  const r = 80
  const circumference = Math.PI * r
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100)
  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 200 116" className="w-full" role="img" aria-label={`Risk score ${score} of 100, ${level}`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={riskColorVar[level]}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-4xl font-semibold tracking-tight text-navy tabular">{score}</span>
        <span className="text-xs text-muted-foreground">of 100</span>
      </div>
    </div>
  )
}
