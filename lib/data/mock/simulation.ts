import type {
  RiskLevel,
  SeparationPoint,
  SimulationParams,
  SimulationResult,
  SimulationScenario,
} from '@/lib/types/api'
import { MOCK_EPOCH } from './constants'
import { mockConjunctions } from './conjunctions'

/**
 * PROTOTYPE PLACEHOLDER — NOT A PHYSICAL MODEL.
 * Produces illustrative scenario numbers so the simulation UI can be
 * exercised before the backend `POST /simulations` endpoint is connected.
 * Real ΔV / trajectory results must come from the flight-dynamics backend.
 */

const DIRECTION_WEIGHT = { PROGRADE: 1, RETROGRADE: 0.95, RADIAL: 0.6, NORMAL: 0.35 } as const

const levelFor = (score: number): RiskLevel =>
  score >= 85 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW'

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p

function placeholderScenario(
  id: SimulationScenario['id'],
  label: string,
  baseMiss: number,
  baseScore: number,
  params: Omit<SimulationParams, 'conjunctionId'>,
): SimulationScenario {
  const effect = params.deltaVMs * DIRECTION_WEIGHT[params.direction] * (0.4 + params.leadTimeHours / 2)
  const miss = round(baseMiss + effect * 4.2)
  const score = Math.max(4, Math.round(baseScore - effect * 48))
  return {
    id,
    label,
    deltaVMs: params.deltaVMs,
    direction: params.direction,
    leadTimeHours: params.leadTimeHours,
    missDistanceKm: miss,
    riskScore: score,
    riskLevel: levelFor(score),
    riskReductionPct: round(((baseScore - score) / baseScore) * 100, 1),
  }
}

export function separationSeries(scenarios: SimulationScenario[]): SeparationPoint[] {
  const baseline = scenarios.find((s) => s.id === 'baseline') ?? scenarios[0]
  const a = scenarios.find((s) => s.id === 'scenarioA') ?? scenarios[1] ?? baseline
  const b = scenarios.find((s) => s.id === 'scenarioB') ?? scenarios[2] ?? a
  const custom = scenarios.find((s) => s.id === 'custom')
  const relVel = 0.35
  const curve = (min: number, t: number) => round(Math.sqrt(min ** 2 + (relVel * t) ** 2))
  return Array.from({ length: 25 }, (_, i) => {
    const t = (i - 12) * 5
    return {
      tMinutes: t,
      baseline: curve(baseline.missDistanceKm, t),
      scenarioA: curve(a.missDistanceKm, t),
      scenarioB: curve(b.missDistanceKm, t),
      ...(custom ? { custom: curve(custom.missDistanceKm, t) } : {}),
    }
  })
}

export function mockSimulation(
  conjunctionId: string,
  custom?: Omit<SimulationParams, 'conjunctionId'>,
): SimulationResult | null {
  const event = mockConjunctions.find((c) => c.id === conjunctionId)
  if (!event) return null

  const baseline: SimulationScenario = {
    id: 'baseline',
    label: 'Baseline',
    deltaVMs: 0,
    direction: null,
    leadTimeHours: null,
    missDistanceKm: event.missDistanceKm,
    riskScore: event.riskScore,
    riskLevel: event.riskLevel,
    riskReductionPct: 0,
  }

  const scenarios: SimulationScenario[] = [
    baseline,
    placeholderScenario('scenarioA', 'Scenario A', event.missDistanceKm, event.riskScore, {
      deltaVMs: 0.1,
      direction: 'PROGRADE',
      leadTimeHours: 4,
    }),
    placeholderScenario('scenarioB', 'Scenario B', event.missDistanceKm, event.riskScore, {
      deltaVMs: 0.25,
      direction: 'RADIAL',
      leadTimeHours: 6,
    }),
  ]

  if (custom) {
    scenarios.push(placeholderScenario('custom', 'Custom', event.missDistanceKm, event.riskScore, custom))
  }

  return {
    conjunctionId,
    scenarios,
    separation: separationSeries(scenarios),
    generatedAt: MOCK_EPOCH,
  }
}
