export interface SatelliteObject {
  norad_id: string;
  name: string;
  object_type: string;
  orbit_type: string;
  tle_line1: string;
  tle_line2: string;
  epoch: string;
  latitude: number;
  longitude: number;
  altitude_km: number;
  velocity_kms: number;
  inclination_deg: number;
  period_min: number;
  status: string;
  last_updated: string;
}

export interface TrajectoryPoint {
  time: string;
  lat: number;
  lon: number;
  alt_km: number;
  x_km: number;
  y_km: number;
  z_km: number;
}

export interface SatelliteTrajectory {
  norad_id: string;
  name: string;
  points: TrajectoryPoint[];
  epoch: string;
}

export interface ConjunctionEvent {
  id: string;
  primary_id: string;
  primary_name: string;
  secondary_id: string;
  secondary_name: string;
  tca: string;
  miss_distance_km: number;
  relative_velocity_kms: number;
  time_to_tca_hours: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: string[];
  altitude_km: number;
  is_demo: boolean;
  status: string;
}

export interface ScenarioComparisonItem {
  scenario_id: string;
  name: string;
  delta_v_ms: number;
  delta_v_kms: number;
  direction: string;
  burn_time_before_tca_h: number;
  miss_distance_km: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  miss_distance_delta_km: number;
  risk_reduction_pct: number;
  description: string;
}

export interface ManeuverSimulationResponse {
  conjunction_id: string;
  primary_name: string;
  secondary_name: string;
  original_miss_distance_km: number;
  original_risk_score: number;
  original_risk_level: string;
  tca: string;
  scenarios: ScenarioComparisonItem[];
  recommendation: string;
  simulation_notes: string;
}

export interface DashboardSummary {
  tracked_objects_count: number;
  active_conjunctions_count: number;
  high_risk_count: number;
  critical_count: number;
  active_alerts_count: number;
  system_status: string;
  last_updated: string;
  system_load: string;
  screening_window_hours: number;
  data_source_status?: string;
}

export interface FleetStatusBreakdown {
  active: number;
  inactive: number;
  debris: number;
  total: number;
}

export interface AnalyticsSummary {
  fleet_status: FleetStatusBreakdown;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  anomaly_timeline: Array<{
    time: string;
    delta_km: number;
    threshold: number;
    status: string;
  }>;
  orbits_per_period: Array<{
    period: string;
    count: number;
  }>;
  critical_events: Array<{
    id: string;
    title: string;
    miss_distance: string;
    tca: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    time_ago: string;
  }>;
  screening_stats: {
    total_screened_pairs: number;
    screening_radius_km: number;
    algorithm: string;
  };
}
