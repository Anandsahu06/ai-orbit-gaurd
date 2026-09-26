'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { api } from '@/lib/services/api'
import type { SimulationParams } from '@/lib/types/api'

const opts = { revalidateOnFocus: false }

export const useSystemStatus = () => useSWR('status', api.getSystemStatus, opts)
export const useDashboardSummary = () => useSWR('dashboard-summary', api.getDashboardSummary, opts)
export const useSatellites = () => useSWR('satellites', api.getSatellites, opts)
export const useSatellite = (id?: string) =>
  useSWR(id ? ['satellite', id] : null, ([, sid]) => api.getSatellite(sid), opts)
export const useOrbitTracks = () => useSWR('orbit-tracks', api.getOrbitTracks, opts)
export const useConjunctions = () => useSWR('conjunctions', api.getConjunctions, opts)
export const useConjunction = (id?: string) =>
  useSWR(id ? ['conjunction', id] : null, ([, cid]) => api.getConjunction(cid), opts)
export const useRiskAssessment = (id?: string) =>
  useSWR(id ? ['risk', id] : null, ([, cid]) => api.getRiskAssessment(cid), opts)
export const useAnalytics = () => useSWR('analytics', api.getAnalytics, opts)
export const useAlerts = () => useSWR('alerts', api.getAlerts, opts)
export const useSimulationScenarios = (id?: string) =>
  useSWR(id ? ['simulation', id] : null, ([, cid]) => api.getSimulationScenarios(cid), opts)

export const useRunSimulation = () =>
  useSWRMutation('simulation-run', (_key: string, { arg }: { arg: SimulationParams }) =>
    api.runSimulation(arg),
  )
