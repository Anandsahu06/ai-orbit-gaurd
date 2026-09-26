import type { Metadata } from 'next'
import { RiskView } from '@/components/platform/risk/risk-view'

export const metadata: Metadata = { title: 'Risk Analysis' }

export default async function RiskPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams
  return <RiskView initialId={event} />
}
