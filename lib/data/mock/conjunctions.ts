import type {
  ConjunctionEvent,
  ObjectRef,
  RiskAssessment,
  RiskLevel,
} from '@/lib/types/api'
import { MOCK_EPOCH, hoursFromEpoch } from './constants'
import { mockSatellites } from './satellites'

/** PROTOTYPE SAMPLE DATA — demo conjunction screening output. */

const ref = (id: string): ObjectRef => {
  const s = mockSatellites.find((x) => x.id === id)
  if (!s) throw new Error(`Unknown mock object ${id}`)
  return { id: s.id, name: s.name, noradId: s.noradId, type: s.type }
}

const pointOf = (id: string) => {
  const s = mockSatellites.find((x) => x.id === id)!
  return { latDeg: s.latitudeDeg, lonDeg: s.longitudeDeg, altKm: s.altitudeKm }
}

interface Seed {
  id: string
  a: string
  b: string
  hours: number
  miss: number
  vel: number
  score: number
  level: RiskLevel
  status: ConjunctionEvent['status']
}

const SEEDS: Seed[] = [
  { id: 'CJ-2041', a: 'SAT-117', b: 'DEB-09', hours: 3.4, miss: 0.18, vel: 13.2, score: 91, level: 'CRITICAL', status: 'OPEN' },
  { id: 'CJ-2038', a: 'SAT-104', b: 'DEB-27', hours: 6.2, miss: 0.42, vel: 11.8, score: 82, level: 'HIGH', status: 'OPEN' },
  { id: 'CJ-2044', a: 'SAT-101', b: 'DEB-15', hours: 9.8, miss: 0.61, vel: 9.4, score: 76, level: 'HIGH', status: 'OPEN' },
  { id: 'CJ-2036', a: 'SAT-115', b: 'DEB-38', hours: 14.5, miss: 0.94, vel: 12.6, score: 68, level: 'HIGH', status: 'MONITORING' },
  { id: 'CJ-2047', a: 'SAT-116', b: 'DEB-34', hours: 17.1, miss: 1.36, vel: 7.9, score: 57, level: 'MEDIUM', status: 'MONITORING' },
  { id: 'CJ-2049', a: 'SAT-103', b: 'DEB-21', hours: 21.3, miss: 1.82, vel: 14.1, score: 52, level: 'MEDIUM', status: 'OPEN' },
  { id: 'CJ-2050', a: 'SAT-118', b: 'DEB-31', hours: 26.0, miss: 2.4, vel: 10.3, score: 44, level: 'MEDIUM', status: 'MONITORING' },
  { id: 'CJ-2052', a: 'SAT-106', b: 'DEB-03', hours: 29.6, miss: 3.1, vel: 12.9, score: 38, level: 'MEDIUM', status: 'OPEN' },
  { id: 'CJ-2053', a: 'SAT-108', b: 'DEB-21', hours: 33.8, miss: 4.6, vel: 13.5, score: 27, level: 'LOW', status: 'MONITORING' },
  { id: 'CJ-2055', a: 'SAT-122', b: 'DEB-45', hours: 38.2, miss: 5.9, vel: 8.8, score: 21, level: 'LOW', status: 'MONITORING' },
  { id: 'CJ-2057', a: 'SAT-107', b: 'DEB-42', hours: 42.7, miss: 7.3, vel: 6.4, score: 14, level: 'LOW', status: 'MONITORING' },
  { id: 'CJ-2031', a: 'SAT-120', b: 'DEB-19', hours: -4.5, miss: 2.9, vel: 11.1, score: 33, level: 'LOW', status: 'RESOLVED' },
]

export const mockConjunctions: ConjunctionEvent[] = SEEDS.map((s) => ({
  id: s.id,
  primaryObject: ref(s.a),
  secondaryObject: ref(s.b),
  tca: hoursFromEpoch(s.hours),
  timeToTcaHours: s.hours,
  missDistanceKm: s.miss,
  relativeVelocityKms: s.vel,
  riskScore: s.score,
  riskLevel: s.level,
  status: s.status,
  screenedAt: MOCK_EPOCH,
  tcaPoint: pointOf(s.a),
  origin: 'PROTOTYPE_SAMPLE',
}))

const HISTORY_OFFSETS = [-36, -30, -24, -18, -12, -6, 0]

export function mockRiskAssessment(conjunctionId: string): RiskAssessment | null {
  const event = mockConjunctions.find((c) => c.id === conjunctionId)
  if (!event) return null
  const drift = [-14, -11, -9, -6, -4, -1, 0]
  return {
    conjunctionId,
    riskScore: event.riskScore,
    riskLevel: event.riskLevel,
    model: 'Random Forest',
    modelVersion: 'prototype-0.3',
    assessedAt: MOCK_EPOCH,
    factors: [
      {
        key: 'missDistance',
        label: 'Miss Distance',
        displayValue: `${event.missDistanceKm.toFixed(2)} km`,
        description: 'Predicted separation at time of closest approach.',
      },
      {
        key: 'relativeVelocity',
        label: 'Relative Velocity',
        displayValue: `${event.relativeVelocityKms.toFixed(1)} km/s`,
        description: 'Speed of the two objects relative to each other at TCA.',
      },
      {
        key: 'timeToTca',
        label: 'Time to TCA',
        displayValue: `${event.timeToTcaHours.toFixed(1)} h`,
        description: 'Time remaining before closest approach for a response.',
      },
    ],
    history: HISTORY_OFFSETS.map((h, i) => ({
      screenedAt: hoursFromEpoch(h),
      riskScore: Math.max(0, Math.min(100, event.riskScore + drift[i])),
    })),
  }
}
