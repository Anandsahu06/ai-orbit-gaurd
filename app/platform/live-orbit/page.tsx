import type { Metadata } from 'next'
import { LiveOrbitView } from '@/components/platform/live-orbit/live-orbit-view'

export const metadata: Metadata = { title: 'Live Orbit' }

export default async function LiveOrbitPage({ searchParams }: { searchParams: Promise<{ sat?: string }> }) {
  const { sat } = await searchParams
  return <LiveOrbitView initialId={sat} />
}
