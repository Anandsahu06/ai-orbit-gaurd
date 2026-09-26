/**
 * OrbitalGuard AI — frontend API contracts.
 * These interfaces describe what the backend returns. The frontend only
 * displays these values; it never derives orbital or risk values itself.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ObjectType = 'ACTIVE' | 'DEBRIS'
export type OrbitRegime = 'LEO' | 'MEO' | 'GEO'
export type DataOrigin = 'PUBLIC_TLE' | 'PROTOTYPE_SAMPLE'

export interface ObjectRef {
  id: string
  name: string
  noradId: number
  type: ObjectType
}

export interface Satellite extends ObjectRef {
  regime: OrbitRegime
  /** Propagated orbital state (SGP4) at `stateEpoch`. */
  altitudeKm: number
  velocityKms: number
  latitudeDeg: number
  longitudeDeg: number
  inclinationDeg: number
  periodMin: number
  eccentricity: number
  stateEpoch: string
  tleEpoch: string
  origin: DataOrigin
}

export interface OrbitPoint {
  latDeg: number
  lonDeg: number
  altKm: number
}

export interface OrbitTrack {
  satelliteId: string
  /** Positions returned by the backend propagator, in order. */
  positions: OrbitPoint[]
  propagatedAt: string
}

export type ConjunctionStatus = 'OPEN' | 'MONITORING' | 'RESOLVED'

export interface ConjunctionEvent {
  id: string
  primaryObject: ObjectRef
  secondaryObject: ObjectRef
  tca: string
  timeToTcaHours: number
  missDistanceKm: number
  relativeVelocityKms: number
  riskScore: number
  riskLevel: RiskLevel
  status: ConjunctionStatus
  screenedAt: string
  /** Approximate location of closest approach, if provided by backend. */
  tcaPoint?: OrbitPoint
  origin: DataOrigin
}

export type RiskFactorKey = 'missDistance' | 'relativeVelocity' | 'timeToTca'

export interface RiskFactor {
  key: RiskFactorKey
  label: string
  displayValue: string
  description: string
}

export interface RiskHistoryPoint {
  screenedAt: string
  riskScore: number
}

export interface RiskAssessment {
  conjunctionId: string
  riskScore: number
  riskLevel: RiskLevel
  model: string
  modelVersion: string
  factors: RiskFactor[]
  history: RiskHistoryPoint[]
  assessedAt: string
}

export type ManeuverDirection = 'PROGRADE' | 'RETROGRADE' | 'RADIAL' | 'NORMAL'

export interface SimulationParams {
  conjunctionId: string
  deltaVMs: number
  direction: ManeuverDirection
  leadTimeHours: number
}

export interface BackendScenarioComparisonItem {
  scenario_id: string
  name: string
  delta_v_ms: number
  delta_v_kms: number
  direction: string
  burn_time_before_tca_h: number
  miss_distance_km: number
  risk_score: number
  risk_level: string
  miss_distance_delta_km: number
  risk_reduction_pct: number
  description: string
}

export interface BackendManeuverSimulationResponse {
  conjunction_id: string
  primary_name: string
  secondary_name: string
  original_miss_distance_km: number
  original_risk_score: number
  original_risk_level: string
  tca: string
  scenarios: BackendScenarioComparisonItem[]
  recommendation: string
  simulation_notes: string
}

export interface BackendManeuverRequest {
  conjunction_id: string
  delta_v_ms: number
  direction: string
  timing_offset_hours: number
}

export type ScenarioId = 'baseline' | 'scenarioA' | 'scenarioB' | 'custom'

export interface SimulationScenario {
  id: ScenarioId
  label: string
  deltaVMs: number
  direction: ManeuverDirection | null
  leadTimeHours: number | null
  missDistanceKm: number
  riskScore: number
  riskLevel: RiskLevel
  riskReductionPct: number
  description?: string
}

export interface SeparationPoint {
  tMinutes: number
  baseline: number
  scenarioA: number
  scenarioB: number
  custom?: number
}

export interface SimulationResult {
  conjunctionId: string
  scenarios: SimulationScenario[]
  separation: SeparationPoint[]
  generatedAt: string
  recommendation?: string
  simulationNotes?: string
}

export interface AnalyticsSummary {
  fleet: { total: number; active: number; debris: number }
  riskDistribution: { level: RiskLevel; count: number }[]
  conjunctionTrend: { date: string; total: number; highRisk: number }[]
  regimeDistribution: { regime: OrbitRegime; count: number }[]
  altitudeBands: { band: string; count: number }[]
  generatedAt: string
  origin: DataOrigin
}

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'INFO'
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

export interface Alert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  status: AlertStatus
  objects: ObjectRef[]
  riskScore?: number
  riskLevel?: RiskLevel
  conjunctionId?: string
  createdAt: string
}

export interface SystemStatus {
  connected: boolean
  source: string
  lastDataUpdate: string
  screeningHorizonHours: number
  mode: 'PROTOTYPE' | 'CONNECTED'
}

export interface DashboardSummary {
  trackedObjects: number
  potentialConjunctions: number
  highRiskEvents: number
  lastDataUpdate: string
}
