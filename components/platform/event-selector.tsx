'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ConjunctionEvent } from '@/lib/types/api'

export function EventSelector({
  events,
  value,
  onChange,
}: {
  events: ConjunctionEvent[]
  value?: string
  onChange: (id: string) => void
}) {
  const items = events.map((e) => ({ value: e.id, label: `${e.id} · ${e.primaryObject.name} / ${e.secondaryObject.name}` }))
  return (
    <Select items={items} value={value ?? null} onValueChange={(v) => v && onChange(v as string)}>
      <SelectTrigger className="w-full min-w-0 bg-white sm:w-[360px]" aria-label="Select conjunction event">
        <SelectValue placeholder="Select an event" />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
