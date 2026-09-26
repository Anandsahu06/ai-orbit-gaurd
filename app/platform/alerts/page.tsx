import type { Metadata } from 'next'
import { AlertsView } from '@/components/platform/alerts/alerts-view'

export const metadata: Metadata = { title: 'Alerts' }

export default function AlertsPage() {
  return <AlertsView />
}
