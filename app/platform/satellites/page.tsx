import type { Metadata } from 'next'
import { SatellitesView } from '@/components/platform/satellites/satellites-view'

export const metadata: Metadata = { title: 'Satellites' }

export default function SatellitesPage() {
  return <SatellitesView />
}
