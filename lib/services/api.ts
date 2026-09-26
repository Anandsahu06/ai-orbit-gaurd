import type {
  Alert,
  AnalyticsSummary,
  ConjunctionEvent,
  DashboardSummary,
  OrbitTrack,
  RiskAssessment,
  Satellite,
  SimulationParams,
  SimulationResult,
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
import { mockSimulation } from '@/lib/data/mock/simulation'

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new ApiError(`Request failed: ${res.statusText}`, res.status)
  return (await res.json()) as T
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

  getSimulationScenarios: (conjunctionId: string) =>
    request<SimulationResult>(`/simulations/${encodeURIComponent(conjunctionId)}`, () =>
      mockSimulation(conjunctionId),
    ),

  runSimulation: (params: SimulationParams) =>
    request<SimulationResult>(
      '/simulations',
      () => {
        const { conjunctionId, ...custom } = params
        return mockSimulation(conjunctionId, custom)
      },
      { method: 'POST', body: JSON.stringify(params) },
    ),
}
