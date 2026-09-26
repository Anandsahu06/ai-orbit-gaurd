import { ConjunctionEvent, ManeuverSimulationResponse, ScenarioComparisonItem } from '../types';
import { api } from './api';

export interface ManeuverParams {
  deltaV: number;
  direction: string;
  leadTime: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SeparationProfilePoint {
  step: string;
  distance: number;
}

export interface CustomSimulationResult {
  deltaV: number;
  direction: string;
  leadTime: number;
  estimatedMissDistance: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReduction: number;
  riskChangeType: 'reduction' | 'increase' | 'none';
  separationProfile: SeparationProfilePoint[];
  recommendation: string;
  timestamp: string;
  fullSimulationResponse: ManeuverSimulationResponse;
}

/**
 * Validates custom maneuver user input according to prototype safety limits.
 * - Delta-V: 5 to 100 m/s
 * - Lead Time: 1 to 24 hours
 * - Direction: RETROGRADE, PROGRADE, RADIAL, NORMAL
 */
export function validateManeuverParams(params: ManeuverParams): ValidationResult {
  if (params.deltaV === undefined || isNaN(params.deltaV)) {
    return { valid: false, error: 'Delta-V value is required.' };
  }
  if (params.deltaV < 5 || params.deltaV > 100) {
    return { valid: false, error: 'Delta-V must be between 5 and 100 m/s.' };
  }

  if (params.leadTime === undefined || isNaN(params.leadTime)) {
    return { valid: false, error: 'Execution lead time is required.' };
  }
  if (params.leadTime < 1 || params.leadTime > 24) {
    return { valid: false, error: 'Lead time must be between 1 and 24 hours prior to TCA.' };
  }

  const validDirs = ['RETROGRADE', 'PROGRADE', 'RADIAL', 'NORMAL'];
  if (!params.direction || !validDirs.includes(params.direction.toUpperCase())) {
    return { valid: false, error: 'Direction must be RETROGRADE, PROGRADE, RADIAL, or NORMAL.' };
  }

  return { valid: true };
}

/**
 * Deterministic prototype orbital physics approximation for maneuver offset.
 *
 * Prototype Model Assumptions (Documented Hackathon Simulation):
 * 1. Along-track burns (PROGRADE / RETROGRADE) produce secular mean-anomaly separation
 *    scaling with along-track velocity differential and lead time: delta_s ~ 3 * delta_v * dt.
 *    - PROGRADE boosts semi-major axis, lowering angular rate (lag factor 1.95).
 *    - RETROGRADE lowers semi-major axis, increasing angular rate (lead factor 1.75).
 * 2. In-plane RADIAL burns rotate the line of apsides with lesser secular drift (factor 0.90).
 *    Out-of-plane NORMAL burns tilt orbital inclination (factor 0.75).
 * 3. Total separation at TCA combines baseline miss vector and maneuver displacement in quadrature.
 */
export function calculatePrototypeManeuver(
  baselineDistanceKm: number,
  baselineRiskScore: number,
  relativeVelocityKms: number,
  timeToTcaHours: number,
  deltaVMs: number,
  direction: string,
  leadTimeHours: number
): {
  estimatedMissDistance: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReduction: number;
} {
  const dvKms = deltaVMs / 1000.0;
  const leadSec = leadTimeHours * 3600.0;
  const dirUpper = direction.toUpperCase();

  let dispKm = 0.0;
  if (dirUpper === 'PROGRADE') {
    dispKm = Math.abs(3.0 * dvKms * (leadSec / 3600.0) * 1.95);
  } else if (dirUpper === 'RETROGRADE') {
    dispKm = Math.abs(3.0 * dvKms * (leadSec / 3600.0) * 1.75);
  } else if (dirUpper.startsWith('RADIAL')) {
    dispKm = Math.abs(dvKms * (leadSec / 3600.0) * 0.9);
  } else {
    // NORMAL
    dispKm = Math.abs(dvKms * (leadSec / 3600.0) * 0.75);
  }

  // Quadrature sum with original miss distance
  const estimatedMissDistance = Math.round(Math.max(0.1, Math.sqrt(baselineDistanceKm ** 2 + dispKm ** 2)) * 100) / 100;

  // ML/screening risk score approximation (0-100 scale)
  // Higher separation -> lower score. Threshold: 1.0 km hard screening threshold, 4.0 km clearing volume
  const missFactor = estimatedMissDistance >= 4.0 ? 0.2 : estimatedMissDistance >= 1.0 ? 0.55 : 0.95;
  const velFactor = Math.min(1.3, relativeVelocityKms / 10.0);
  const rawScore = Math.max(5.0, Math.min(99.0, (baselineRiskScore * (missFactor * 0.7 + 0.3)) * velFactor * 0.9));
  const roundedScore = Math.round(rawScore * 10) / 10;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (roundedScore >= 80) riskLevel = 'CRITICAL';
  else if (roundedScore >= 60) riskLevel = 'HIGH';
  else if (roundedScore >= 40) riskLevel = 'MEDIUM';

  const reduction = Math.round(((baselineRiskScore - roundedScore) / baselineRiskScore) * 1000) / 10;

  return {
    estimatedMissDistance,
    riskScore: roundedScore,
    riskLevel,
    riskReduction: reduction
  };
}

/**
 * Generates relative encounter separation profile over time points:
 * ['-12h', '-8h', '-4h', '-2h', 'TCA', '+2h', '+4h']
 * following hyperbolic flyby relative geometry: d(t) = sqrt(d_min^2 + (v_eff * dt)^2)
 */
export function generateSeparationProfile(missDistanceKm: number): SeparationProfilePoint[] {
  const vEff = 1.35; // Effective relative velocity component in km/h
  const steps = [
    { label: '-12h', hours: 12 },
    { label: '-8h', hours: 8 },
    { label: '-4h', hours: 4 },
    { label: '-2h', hours: 2 },
    { label: 'TCA', hours: 0 },
    { label: '+2h', hours: 2 },
    { label: '+4h', hours: 4 }
  ];

  return steps.map((s) => ({
    step: s.label,
    distance: Math.round(Math.sqrt(missDistanceKm ** 2 + (vEff * s.hours) ** 2) * 100) / 100
  }));
}

/**
 * Main simulation service function called by the UI button.
 * Validates inputs, sends request to backend /api/simulation/evaluate, and formats the custom result.
 */
export async function simulateCustomManeuver(args: {
  conjunction: ConjunctionEvent;
  deltaV: number;
  direction: string;
  leadTime: number;
}): Promise<CustomSimulationResult> {
  const { conjunction, deltaV, direction, leadTime } = args;

  // 1. Validate
  const validation = validateManeuverParams({ deltaV, direction, leadTime });
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid maneuver parameters.');
  }

  // 2. Call backend simulation endpoint
  let response: ManeuverSimulationResponse;
  try {
    response = await api.simulateManeuver(conjunction.id, deltaV, direction, leadTime);
  } catch (err) {
    console.warn('Backend simulation call failed, utilizing client-side fallback model:', err);
    // Client-side fallback if backend is unreachable
    const fallback = calculatePrototypeManeuver(
      conjunction.miss_distance_km,
      conjunction.risk_score,
      conjunction.relative_velocity_kms,
      conjunction.time_to_tca_hours,
      deltaV,
      direction,
      leadTime
    );

    const customItem: ScenarioComparisonItem = {
      scenario_id: 'SCEN-CUSTOM',
      name: `Custom (${deltaV.toFixed(1)} m/s ${direction})`,
      delta_v_ms: deltaV,
      delta_v_kms: deltaV / 1000.0,
      direction,
      burn_time_before_tca_h: leadTime,
      miss_distance_km: fallback.estimatedMissDistance,
      risk_score: fallback.riskScore,
      risk_level: fallback.riskLevel,
      miss_distance_delta_km: Math.round((fallback.estimatedMissDistance - conjunction.miss_distance_km) * 100) / 100,
      risk_reduction_pct: fallback.riskReduction,
      description: `User-configured burn of ${deltaV.toFixed(1)} m/s (${direction}) executed ${leadTime.toFixed(1)}h prior to TCA.`
    };

    response = {
      conjunction_id: conjunction.id,
      primary_name: conjunction.primary_name,
      secondary_name: conjunction.secondary_name,
      original_miss_distance_km: conjunction.miss_distance_km,
      original_risk_score: conjunction.risk_score,
      original_risk_level: conjunction.risk_level,
      tca: conjunction.tca,
      scenarios: [
        {
          scenario_id: 'SCEN-0',
          name: 'No Maneuver (Baseline)',
          delta_v_ms: 0,
          delta_v_kms: 0,
          direction: 'NONE',
          burn_time_before_tca_h: 0,
          miss_distance_km: conjunction.miss_distance_km,
          risk_score: conjunction.risk_score,
          risk_level: conjunction.risk_level,
          miss_distance_delta_km: 0,
          risk_reduction_pct: 0,
          description: 'Current predicted trajectory without orbital correction burn.'
        },
        customItem
      ],
      recommendation: `Custom maneuver (${deltaV} m/s ${direction}) yields estimated miss distance of ${fallback.estimatedMissDistance} km.`,
      simulation_notes: 'Hypothetical maneuver simulation — decision support only. Not an operational spacecraft command.'
    };
  }

  // 3. Extract custom scenario from response
  const customScen =
    response.scenarios.find((s) => s.scenario_id === 'SCEN-CUSTOM') ||
    response.scenarios[response.scenarios.length - 1];

  const estimatedMissDistance = customScen ? customScen.miss_distance_km : conjunction.miss_distance_km;
  const riskScore = customScen ? customScen.risk_score : conjunction.risk_score;
  const riskLevel = (customScen ? customScen.risk_level : conjunction.risk_level) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  const riskReduction = customScen ? customScen.risk_reduction_pct : 0;

  const riskChangeType: 'reduction' | 'increase' | 'none' =
    riskReduction > 0 ? 'reduction' : riskReduction < 0 ? 'increase' : 'none';

  const separationProfile = generateSeparationProfile(estimatedMissDistance);

  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return {
    deltaV,
    direction,
    leadTime,
    estimatedMissDistance,
    riskScore,
    riskLevel,
    riskReduction,
    riskChangeType,
    separationProfile,
    recommendation: response.recommendation,
    timestamp,
    fullSimulationResponse: response
  };
}
