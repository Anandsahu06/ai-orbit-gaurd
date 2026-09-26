import type { OrbitPoint, OrbitTrack, Satellite } from '@/lib/types/api'
import { MOCK_EPOCH, MOCK_TLE_EPOCH } from './constants'

/**
 * PROTOTYPE SAMPLE DATA — synthetic objects that stand in for the backend's
 * propagated catalogue. Values are illustrative and not operational.
 */

interface SeedObject {
  id: string
  noradId: number
  type: Satellite['type']
  altitudeKm: number
  inclinationDeg: number
  raanDeg: number
  phaseDeg: number
}

const ACTIVE: SeedObject[] = [
  { id: 'SAT-101', noradId: 100101, type: 'ACTIVE', altitudeKm: 548, inclinationDeg: 53.0, raanDeg: 12, phaseDeg: 40 },
  { id: 'SAT-102', noradId: 100102, type: 'ACTIVE', altitudeKm: 551, inclinationDeg: 53.0, raanDeg: 42, phaseDeg: 110 },
  { id: 'SAT-103', noradId: 100103, type: 'ACTIVE', altitudeKm: 705, inclinationDeg: 98.2, raanDeg: 75, phaseDeg: 200 },
  { id: 'SAT-104', noradId: 100104, type: 'ACTIVE', altitudeKm: 612, inclinationDeg: 97.8, raanDeg: 120, phaseDeg: 18 },
  { id: 'SAT-105', noradId: 100105, type: 'ACTIVE', altitudeKm: 420, inclinationDeg: 51.6, raanDeg: 160, phaseDeg: 300 },
  { id: 'SAT-106', noradId: 100106, type: 'ACTIVE', altitudeKm: 780, inclinationDeg: 86.4, raanDeg: 200, phaseDeg: 75 },
  { id: 'SAT-107', noradId: 100107, type: 'ACTIVE', altitudeKm: 1200, inclinationDeg: 87.9, raanDeg: 240, phaseDeg: 150 },
  { id: 'SAT-108', noradId: 100108, type: 'ACTIVE', altitudeKm: 520, inclinationDeg: 97.5, raanDeg: 280, phaseDeg: 260 },
  { id: 'SAT-109', noradId: 100109, type: 'ACTIVE', altitudeKm: 20200, inclinationDeg: 55.0, raanDeg: 30, phaseDeg: 90 },
  { id: 'SAT-110', noradId: 100110, type: 'ACTIVE', altitudeKm: 20180, inclinationDeg: 55.0, raanDeg: 150, phaseDeg: 210 },
  { id: 'SAT-111', noradId: 100111, type: 'ACTIVE', altitudeKm: 35786, inclinationDeg: 0.1, raanDeg: 0, phaseDeg: 285 },
  { id: 'SAT-112', noradId: 100112, type: 'ACTIVE', altitudeKm: 35786, inclinationDeg: 0.05, raanDeg: 0, phaseDeg: 20 },
  { id: 'SAT-113', noradId: 100113, type: 'ACTIVE', altitudeKm: 560, inclinationDeg: 70.0, raanDeg: 320, phaseDeg: 130 },
  { id: 'SAT-114', noradId: 100114, type: 'ACTIVE', altitudeKm: 590, inclinationDeg: 45.0, raanDeg: 60, phaseDeg: 350 },
  { id: 'SAT-115', noradId: 100115, type: 'ACTIVE', altitudeKm: 650, inclinationDeg: 97.9, raanDeg: 180, phaseDeg: 60 },
  { id: 'SAT-116', noradId: 100116, type: 'ACTIVE', altitudeKm: 475, inclinationDeg: 51.6, raanDeg: 95, phaseDeg: 170 },
  { id: 'SAT-117', noradId: 100117, type: 'ACTIVE', altitudeKm: 820, inclinationDeg: 98.7, raanDeg: 225, phaseDeg: 240 },
  { id: 'SAT-118', noradId: 100118, type: 'ACTIVE', altitudeKm: 1100, inclinationDeg: 66.0, raanDeg: 300, phaseDeg: 30 },
  { id: 'SAT-119', noradId: 100119, type: 'ACTIVE', altitudeKm: 535, inclinationDeg: 53.2, raanDeg: 340, phaseDeg: 190 },
  { id: 'SAT-120', noradId: 100120, type: 'ACTIVE', altitudeKm: 690, inclinationDeg: 98.1, raanDeg: 10, phaseDeg: 320 },
  { id: 'SAT-121', noradId: 100121, type: 'ACTIVE', altitudeKm: 505, inclinationDeg: 43.0, raanDeg: 140, phaseDeg: 80 },
  { id: 'SAT-122', noradId: 100122, type: 'ACTIVE', altitudeKm: 750, inclinationDeg: 63.4, raanDeg: 260, phaseDeg: 5 },
]

const DEBRIS: SeedObject[] = [
  { id: 'DEB-03', noradId: 200003, type: 'DEBRIS', altitudeKm: 770, inclinationDeg: 74.0, raanDeg: 35, phaseDeg: 220 },
  { id: 'DEB-09', noradId: 200009, type: 'DEBRIS', altitudeKm: 818, inclinationDeg: 98.9, raanDeg: 222, phaseDeg: 236 },
  { id: 'DEB-12', noradId: 200012, type: 'DEBRIS', altitudeKm: 860, inclinationDeg: 82.5, raanDeg: 110, phaseDeg: 15 },
  { id: 'DEB-15', noradId: 200015, type: 'DEBRIS', altitudeKm: 545, inclinationDeg: 53.4, raanDeg: 18, phaseDeg: 45 },
  { id: 'DEB-19', noradId: 200019, type: 'DEBRIS', altitudeKm: 950, inclinationDeg: 99.0, raanDeg: 190, phaseDeg: 290 },
  { id: 'DEB-21', noradId: 200021, type: 'DEBRIS', altitudeKm: 710, inclinationDeg: 98.0, raanDeg: 78, phaseDeg: 205 },
  { id: 'DEB-27', noradId: 200027, type: 'DEBRIS', altitudeKm: 611, inclinationDeg: 97.2, raanDeg: 124, phaseDeg: 21 },
  { id: 'DEB-31', noradId: 200031, type: 'DEBRIS', altitudeKm: 1150, inclinationDeg: 65.8, raanDeg: 296, phaseDeg: 34 },
  { id: 'DEB-34', noradId: 200034, type: 'DEBRIS', altitudeKm: 480, inclinationDeg: 51.4, raanDeg: 92, phaseDeg: 175 },
  { id: 'DEB-38', noradId: 200038, type: 'DEBRIS', altitudeKm: 640, inclinationDeg: 97.6, raanDeg: 176, phaseDeg: 64 },
  { id: 'DEB-42', noradId: 200042, type: 'DEBRIS', altitudeKm: 1480, inclinationDeg: 52.0, raanDeg: 250, phaseDeg: 140 },
  { id: 'DEB-45', noradId: 200045, type: 'DEBRIS', altitudeKm: 890, inclinationDeg: 71.0, raanDeg: 330, phaseDeg: 100 },
]

const SEEDS = [...ACTIVE, ...DEBRIS]

const EARTH_RADIUS_KM = 6378.137
const MU = 398600.4418
const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI
const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p

/**
 * Synthetic circular-orbit geometry used only to produce plausible sample
 * tracks for the demo. The real platform receives tracks from the backend
 * SGP4 propagator; this is not a propagation model.
 */
function samplePoint(seed: SeedObject, phaseDeg: number): OrbitPoint {
  const i = toRad(seed.inclinationDeg)
  const u = toRad(phaseDeg)
  const lat = Math.asin(Math.sin(i) * Math.sin(u))
  const lon = toRad(seed.raanDeg) + Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u))
  let lonDeg = toDeg(lon) % 360
  if (lonDeg > 180) lonDeg -= 360
  if (lonDeg < -180) lonDeg += 360
  return { latDeg: round(toDeg(lat), 3), lonDeg: round(lonDeg, 3), altKm: seed.altitudeKm }
}

function regimeFor(altKm: number): Satellite['regime'] {
  if (altKm < 2000) return 'LEO'
  if (altKm < 35000) return 'MEO'
  return 'GEO'
}

export const mockSatellites: Satellite[] = SEEDS.map((seed) => {
  const r = EARTH_RADIUS_KM + seed.altitudeKm
  const pos = samplePoint(seed, seed.phaseDeg)
  return {
    id: seed.id,
    name: seed.id,
    noradId: seed.noradId,
    type: seed.type,
    regime: regimeFor(seed.altitudeKm),
    altitudeKm: seed.altitudeKm,
    velocityKms: round(Math.sqrt(MU / r), 2),
    latitudeDeg: pos.latDeg,
    longitudeDeg: pos.lonDeg,
    inclinationDeg: seed.inclinationDeg,
    periodMin: round((2 * Math.PI * Math.sqrt(r ** 3 / MU)) / 60, 1),
    eccentricity: seed.type === 'DEBRIS' ? 0.0021 : 0.0004,
    stateEpoch: MOCK_EPOCH,
    tleEpoch: MOCK_TLE_EPOCH,
    origin: 'PROTOTYPE_SAMPLE',
  }
})

export const mockOrbitTracks: OrbitTrack[] = SEEDS.map((seed) => ({
  satelliteId: seed.id,
  positions: Array.from({ length: 91 }, (_, k) => samplePoint(seed, k * 4)),
  propagatedAt: MOCK_EPOCH,
}))
