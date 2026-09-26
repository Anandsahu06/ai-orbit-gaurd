import axios from 'axios';
import {
  SatelliteObject,
  SatelliteTrajectory,
  ConjunctionEvent,
  ManeuverSimulationResponse,
  DashboardSummary,
  AnalyticsSummary
} from '../types';

const API_BASE = '/api';

export const api = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await axios.get(`${API_BASE}/dashboard/summary`);
    return res.data;
  },

  getObjects: async (query?: string, objectType?: string): Promise<SatelliteObject[]> => {
    const params: Record<string, string> = {};
    if (query) params.query = query;
    if (objectType && objectType !== 'ALL') params.object_type = objectType;
    const res = await axios.get(`${API_BASE}/objects`, { params });
    return res.data;
  },

  getObjectDetails: async (noradId: string): Promise<SatelliteObject> => {
    const res = await axios.get(`${API_BASE}/objects/${noradId}`);
    return res.data;
  },

  getObjectTrajectory: async (noradId: string): Promise<SatelliteTrajectory> => {
    const res = await axios.get(`${API_BASE}/objects/${noradId}/trajectory`);
    return res.data;
  },

  getConjunctions: async (riskLevel?: string, search?: string): Promise<ConjunctionEvent[]> => {
    const params: Record<string, string> = {};
    if (riskLevel && riskLevel !== 'ALL') params.risk_level = riskLevel;
    if (search) params.search = search;
    const res = await axios.get(`${API_BASE}/conjunctions`, { params });
    return res.data;
  },

  getConjunctionDetails: async (id: string): Promise<ConjunctionEvent> => {
    const res = await axios.get(`${API_BASE}/conjunctions/${id}`);
    return res.data;
  },

  simulateManeuver: async (
    conjunctionId: string,
    deltaVMs: number = 20.0,
    direction: string = 'RETROGRADE',
    timingHours: number = 6.0
  ): Promise<ManeuverSimulationResponse> => {
    const res = await axios.post(`${API_BASE}/simulation/evaluate`, {
      conjunction_id: conjunctionId,
      delta_v_ms: deltaVMs,
      direction: direction,
      timing_offset_hours: timingHours
    });
    return res.data;
  },

  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const res = await axios.get(`${API_BASE}/analytics/summary`);
    return res.data;
  }
};
