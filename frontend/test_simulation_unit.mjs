// Node unit test suite for prototype simulation service
import assert from 'node:assert';

// 1. Validation logic test
function validateManeuverParams(params) {
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

// 2. Physics calculation test
function calculatePrototypeManeuver(baselineDistanceKm, baselineRiskScore, relativeVelocityKms, timeToTcaHours, deltaVMs, direction, leadTimeHours) {
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
    dispKm = Math.abs(dvKms * (leadSec / 3600.0) * 0.75);
  }

  const estimatedMissDistance = Math.round(Math.max(0.1, Math.sqrt(baselineDistanceKm ** 2 + dispKm ** 2)) * 100) / 100;
  const missFactor = estimatedMissDistance >= 4.0 ? 0.2 : estimatedMissDistance >= 1.0 ? 0.55 : 0.95;
  const velFactor = Math.min(1.3, relativeVelocityKms / 10.0);
  const rawScore = Math.max(5.0, Math.min(99.0, (baselineRiskScore * (missFactor * 0.7 + 0.3)) * velFactor * 0.9));
  const roundedScore = Math.round(rawScore * 10) / 10;

  let riskLevel = 'LOW';
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

console.log('--- STARTING SIMULATION SERVICE UNIT TESTS ---');

// Test 1: Validation of Valid Inputs
const valid1 = validateManeuverParams({ deltaV: 20, direction: 'RETROGRADE', leadTime: 6 });
assert.strictEqual(valid1.valid, true, 'Valid parameters should pass');

// Test 2: Validation of Invalid Inputs
const invalidLowDv = validateManeuverParams({ deltaV: 0, direction: 'RETROGRADE', leadTime: 6 });
assert.strictEqual(invalidLowDv.valid, false, 'Delta-V < 5 should fail');
console.log('✓ Rejected deltaV = 0:', invalidLowDv.error);

const invalidHighDv = validateManeuverParams({ deltaV: 150, direction: 'RETROGRADE', leadTime: 6 });
assert.strictEqual(invalidHighDv.valid, false, 'Delta-V > 100 should fail');
console.log('✓ Rejected deltaV = 150:', invalidHighDv.error);

const invalidLead = validateManeuverParams({ deltaV: 30, direction: 'PROGRADE', leadTime: 0 });
assert.strictEqual(invalidLead.valid, false, 'Lead time < 1 should fail');
console.log('✓ Rejected leadTime = 0:', invalidLead.error);

const invalidLeadHigh = validateManeuverParams({ deltaV: 30, direction: 'PROGRADE', leadTime: 30 });
assert.strictEqual(invalidLeadHigh.valid, false, 'Lead time > 24 should fail');
console.log('✓ Rejected leadTime = 30:', invalidLeadHigh.error);

// Test 3: Low vs High Delta-V Effect
const baseDist = 0.42;
const baseRisk = 82.0;
const vel = 11.84;
const tca = 14.5;

const lowDv = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 10, 'RETROGRADE', 6);
const highDv = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 80, 'RETROGRADE', 6);
assert(highDv.estimatedMissDistance > lowDv.estimatedMissDistance, 'Higher deltaV must produce higher separation');
assert(highDv.riskScore < lowDv.riskScore, 'Higher separation must produce lower risk score');
console.log(`✓ Delta-V Sensitivity: 10 m/s -> ${lowDv.estimatedMissDistance} km vs 80 m/s -> ${highDv.estimatedMissDistance} km`);

// Test 4: Direction Sensitivity (PROGRADE vs RETROGRADE)
const prog = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 40, 'PROGRADE', 8);
const retro = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 40, 'RETROGRADE', 8);
assert.notStrictEqual(prog.estimatedMissDistance, retro.estimatedMissDistance, 'Prograde and Retrograde must have distinct along-track factors');
console.log(`✓ Direction Sensitivity: PROGRADE -> ${prog.estimatedMissDistance} km vs RETROGRADE -> ${retro.estimatedMissDistance} km`);

// Test 5: Lead Time Sensitivity (6h vs 12h)
const lead6 = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 30, 'PROGRADE', 6);
const lead12 = calculatePrototypeManeuver(baseDist, baseRisk, vel, tca, 30, 'PROGRADE', 12);
assert(lead12.estimatedMissDistance > lead6.estimatedMissDistance, 'Greater lead time must yield greater secular displacement');
console.log(`✓ Lead Time Sensitivity: 6h -> ${lead6.estimatedMissDistance} km vs 12h -> ${lead12.estimatedMissDistance} km`);

// Test 6: Risk Reduction Math
const reductionMath = ((baseRisk - highDv.riskScore) / baseRisk) * 100;
assert(Math.abs(highDv.riskReduction - reductionMath) < 0.2, 'Risk reduction formula must match ((base - new) / base) * 100');
console.log(`✓ Risk Reduction Math Verified: ${highDv.riskReduction}%`);

console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY ---');
