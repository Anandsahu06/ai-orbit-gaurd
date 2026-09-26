import type { Metadata } from 'next'
import { SimulationView } from '@/components/platform/simulation/simulation-view'

export const metadata: Metadata = { title: 'Avoidance Simulation' }

export default async function SimulationPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams
  return <SimulationView initialId={event} />
}
