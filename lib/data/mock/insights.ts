import type {
  Alert,
  AnalyticsSummary,
  DashboardSummary,
  SystemStatus,
} from '@/lib/types/api'
import { MOCK_EPOCH, MOCK_TLE_EPOCH, hoursFromEpoch } from './constants'
import { mockConjunctions } from './conjunctions'
import { mockSatellites } from './satellites'

/** PROTOTYPE SAMPLE DATA — analytics, alerts and status for the demo. */

const count = <T,>(items: T[], pred: (x: T) => boolean) => items.filter(pred).length
const openEvents = mockConjunctions.filter((c) => c.status !== 'RESOLVED')

export const mockSystemStatus: SystemStatus = {
  connected: true,
  source: 'Public TLE',
  lastDataUpdate: MOCK_TLE_EPOCH,
  screeningHorizonHours: 48,
  mode: 'PROTOTYPE',
}

export const mockDashboardSummary: DashboardSummary = {
  trackedObjects: mockSatellites.length,
  potentialConjunctions: openEvents.length,
  highRiskEvents: count(openEvents, (c) => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL'),
  lastDataUpdate: MOCK_TLE_EPOCH,
}

const TREND = [
  [6, 1], [7, 2], [5, 1], [8, 2], [9, 3], [7, 2], [6, 1],
  [8, 2], [10, 3], [9, 2], [11, 4], [10, 3], [12, 4], [11, 4],
]

export const mockAnalytics: AnalyticsSummary = {
  fleet: {
    total: mockSatellites.length,
    active: count(mockSatellites, (s) => s.type === 'ACTIVE'),
    debris: count(mockSatellites, (s) => s.type === 'DEBRIS'),
  },
  riskDistribution: (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((level) => ({
    level,
    count: count(openEvents, (c) => c.riskLevel === level),
  })),
  conjunctionTrend: TREND.map(([total, highRisk], i) => ({
    date: hoursFromEpoch((i - 13) * 24).slice(0, 10),
    total,
    highRisk,
  })),
  regimeDistribution: (['LEO', 'MEO', 'GEO'] as const).map((regime) => ({
    regime,
    count: count(mockSatellites, (s) => s.regime === regime),
  })),
  altitudeBands: [
    { band: '< 500 km', count: count(mockSatellites, (s) => s.altitudeKm < 500) },
    { band: '500–800 km', count: count(mockSatellites, (s) => s.altitudeKm >= 500 && s.altitudeKm < 800) },
    { band: '800–1,200 km', count: count(mockSatellites, (s) => s.altitudeKm >= 800 && s.altitudeKm < 1200) },
    { band: '1,200–2,000 km', count: count(mockSatellites, (s) => s.altitudeKm >= 1200 && s.altitudeKm < 2000) },
    { band: 'MEO / GEO', count: count(mockSatellites, (s) => s.altitudeKm >= 2000) },
  ],
  generatedAt: MOCK_EPOCH,
  origin: 'PROTOTYPE_SAMPLE',
}

const ev = (id: string) => mockConjunctions.find((c) => c.id === id)!

export const mockAlerts: Alert[] = [
  {
    id: 'AL-9012',
    title: 'Critical potential conjunction',
    message: 'Miss distance below 0.25 km screening threshold.',
    severity: 'HIGH',
    status: 'OPEN',
    objects: [ev('CJ-2041').primaryObject, ev('CJ-2041').secondaryObject],
    riskScore: ev('CJ-2041').riskScore,
    riskLevel: ev('CJ-2041').riskLevel,
    conjunctionId: 'CJ-2041',
    createdAt: hoursFromEpoch(-0.4),
  },
  {
    id: 'AL-9011',
    title: 'High-risk potential conjunction',
    message: 'Risk score above 80 within the next 12 hours.',
    severity: 'HIGH',
    status: 'OPEN',
    objects: [ev('CJ-2038').primaryObject, ev('CJ-2038').secondaryObject],
    riskScore: ev('CJ-2038').riskScore,
    riskLevel: ev('CJ-2038').riskLevel,
    conjunctionId: 'CJ-2038',
    createdAt: hoursFromEpoch(-1.1),
  },
  {
    id: 'AL-9009',
    title: 'Risk score increased',
    message: 'Risk score increased by 9 points since previous screening.',
    severity: 'MEDIUM',
    status: 'ACKNOWLEDGED',
    objects: [ev('CJ-2044').primaryObject, ev('CJ-2044').secondaryObject],
    riskScore: ev('CJ-2044').riskScore,
    riskLevel: ev('CJ-2044').riskLevel,
    conjunctionId: 'CJ-2044',
    createdAt: hoursFromEpoch(-2.6),
  },
  {
    id: 'AL-9007',
    title: 'New event entered screening horizon',
    message: 'Potential close approach detected within 48 h horizon.',
    severity: 'MEDIUM',
    status: 'OPEN',
    objects: [ev('CJ-2049').primaryObject, ev('CJ-2049').secondaryObject],
    riskScore: ev('CJ-2049').riskScore,
    riskLevel: ev('CJ-2049').riskLevel,
    conjunctionId: 'CJ-2049',
    createdAt: hoursFromEpoch(-3.8),
  },
  {
    id: 'AL-9005',
    title: 'Public TLE catalogue refreshed',
    message: 'Orbital states re-propagated from latest public TLE set.',
    severity: 'INFO',
    status: 'OPEN',
    objects: [],
    createdAt: hoursFromEpoch(-5.8),
  },
  {
    id: 'AL-9002',
    title: 'Event cleared after re-screening',
    message: 'Updated screening shows separation above threshold.',
    severity: 'INFO',
    status: 'RESOLVED',
    objects: [ev('CJ-2031').primaryObject, ev('CJ-2031').secondaryObject],
    riskScore: ev('CJ-2031').riskScore,
    riskLevel: ev('CJ-2031').riskLevel,
    conjunctionId: 'CJ-2031',
    createdAt: hoursFromEpoch(-9.2),
  },
]
