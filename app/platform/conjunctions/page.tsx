import type { Metadata } from 'next'
import { ConjunctionsView } from '@/components/platform/conjunctions/conjunctions-view'

export const metadata: Metadata = { title: 'Conjunctions' }

export default function ConjunctionsPage() {
  return <ConjunctionsView />
}
