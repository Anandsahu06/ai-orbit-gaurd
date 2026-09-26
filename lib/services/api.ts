import type {
  Alert,
  AnalyticsSummary,
  BackendManeuverRequest,
  BackendManeuverSimulationResponse,
  ConjunctionEvent,
  DashboardSummary,
  ManeuverDirection,
  OrbitTrack,
  RiskAssessment,
  RiskLevel,
  Satellite,
  ScenarioId,
  SimulationParams,
  SimulationResult,
  SimulationScenario,
  SystemStatus,
} from '@/lib/types/api'
import { mockConjunctions, mockRiskAssessment } from '@/lib/data/mock/conjunctions'
import {
  mockAlerts,
  mockAnalytics,
  mockDashboardSummary,
  mockSystemStatus,
} from '@/lib/data/mock/insights'
import { mockOrbitTracks, mockSatellites } from '@/lib/data/mock/satellites'
import { mockSimulation, separationSeries } from '@/lib/data/mock/simulation'

/**
 * Centralised frontend API layer.
 * When NEXT_PUBLIC_API_BASE_URL is set, calls go to the backend (FastAPI).
 * Otherwise structured prototype sample data is returned. No scientific
 * calculations happen here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
export const isUsingMockData = !API_BASE_URL

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const MOCK_LATENCY_MS = 350

async function request<T>(
  path: string,
  mock: () => T | null,
  init?: RequestInit,
): Promise<T> {
  if (!API_BASE_URL) {
    await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS))
    const data = mock()
    if (data === null) throw new ApiError('Resource not found', 404)
    return structuredClone(data)
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url =
    API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')
      ? `${API_BASE_URL}${cleanPath.slice(4)}`
      : cleanPath.startsWith('/api/')
        ? `${API_BASE_URL}${cleanPath}`
        : API_BASE_URL.endsWith('/api')
          ? `${API_BASE_URL}${cleanPath}`
          : `${API_BASE_URL}/api${cleanPath}`

  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new ApiError(`Request failed: ${res.statusText}`, res.status)
  return (await res.json()) as T
}

function normalizeSimulationResponse(
  raw: BackendManeuverSimulationResponse | SimulationResult,
  targetConjunctionId?: string,
): SimulationResult {
  if (raw && 'separation' in raw && Array.isArray((raw as any).separation)) {
    return raw as SimulationResult
  }

  const backend = raw as BackendManeuverSimulationResponse
  const scenarios: SimulationScenario[] = (backend.scenarios ?? []).map((s) => {
    let id: ScenarioId = 'custom'
    if (s.scenario_id === 'SCEN-0' || s.scenario_id === 'baseline') id = 'baseline'
    else if (s.scenario_id === 'SCEN-A' || s.scenario_id === 'SCEN-1' || s.scenario_id === 'scenarioA') id = 'scenarioA'
    else if (s.scenario_id === 'SCEN-B' || s.scenario_id === 'SCEN-2' || s.scenario_id === 'scenarioB') id = 'scenarioB'

    const dir = s.direction?.toUpperCase()
    const validDir: ManeuverDirection | null =
      dir === 'PROGRADE' || dir === 'RETROGRADE' || dir === 'RADIAL' || dir === 'NORMAL'
        ? (dir as ManeuverDirection)
        : null

    return {
      id,
      label: s.name,
      deltaVMs: s.delta_v_ms,
      direction: validDir,
      leadTimeHours: s.burn_time_before_tca_h > 0 ? s.burn_time_before_tca_h : null,
      missDistanceKm: s.miss_distance_km,
      riskScore: s.risk_score,
      riskLevel: s.risk_level as RiskLevel,
      riskReductionPct: s.risk_reduction_pct,
      description: s.description,
    }
  })

  return {
    conjunctionId: targetConjunctionId || backend.conjunction_id,
    scenarios,
    separation: separationSeries(scenarios),
    generatedAt: backend.tca || new Date().toISOString(),
    recommendation: backend.recommendation,
    simulationNotes: backend.simulation_notes,
  }
}

export const api = {
  getSystemStatus: () => request<SystemStatus>('/status', () => mockSystemStatus),

  getDashboardSummary: () =>
    request<DashboardSummary>('/dashboard/summary', () => mockDashboardSummary),

  getSatellites: () => request<Satellite[]>('/satellites', () => mockSatellites),

  getSatellite: (id: string) =>
    request<Satellite>(`/satellites/${encodeURIComponent(id)}`, () =>
      mockSatellites.find((s) => s.id === id) ?? null,
    ),

  getOrbitTracks: () => request<OrbitTrack[]>('/orbits/tracks', () => mockOrbitTracks),

  getConjunctions: () => request<ConjunctionEvent[]>('/conjunctions', () => mockConjunctions),

  getConjunction: (id: string) =>
    request<ConjunctionEvent>(`/conjunctions/${encodeURIComponent(id)}`, () =>
      mockConjunctions.find((c) => c.id === id) ?? null,
    ),

  getRiskAssessment: (conjunctionId: string) =>
    request<RiskAssessment>(`/risk/${encodeURIComponent(conjunctionId)}`, () =>
      mockRiskAssessment(conjunctionId),
    ),

  getAnalytics: () => request<AnalyticsSummary>('/analytics', () => mockAnalytics),

  getAlerts: () => request<Alert[]>('/alerts', () => mockAlerts),

  getSimulationScenarios: async (conjunctionId: string): Promise<SimulationResult> => {
    const raw = await request<BackendManeuverSimulationResponse | SimulationResult>(
      `/api/simulation/scenarios/${encodeURIComponent(conjunctionId)}`,
      () => mockSimulation(conjunctionId),
    )
    return normalizeSimulationResponse(raw, conjunctionId)
  },

  runSimulation: async (params: SimulationParams): Promise<SimulationResult> => {
    const body: BackendManeuverRequest = {
      conjunction_id: params.conjunctionId,
      delta_v_ms: params.deltaVMs,
      direction: params.direction,
      timing_offset_hours: params.leadTimeHours,
    }
    const raw = await request<BackendManeuverSimulationResponse | SimulationResult>(
      '/api/simulation',
      () => {
        const { conjunctionId, ...custom } = params
        return mockSimulation(conjunctionId, custom)
      },
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
    return normalizeSimulationResponse(raw, params.conjunctionId)
  },
}
