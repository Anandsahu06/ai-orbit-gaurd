'use client'

import { OrbitGlobe } from '@/components/orbit/orbit-globe'
import { useConjunctions, useOrbitTracks, useSatellites } from '@/hooks/use-api'
import { formatKm } from '@/lib/format'

export function HeroGlobe() {
  const satellites = useSatellites()
  const tracks = useOrbitTracks()
  const conjunctions = useConjunctions()

  const top = [...(conjunctions.data ?? [])].sort((a, b) => b.riskScore - a.riskScore)[0]
  const highlightIds = top ? [top.primaryObject.id, top.secondaryObject.id] : undefined

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-navy/10 bg-[#050B18] shadow-2xl shadow-navy/20 sm:aspect-[5/4]">
      {satellites.data && (
        <OrbitGlobe
          satellites={satellites.data}
          tracks={tracks.data}
          highlightIds={highlightIds}
          tcaPoint={top?.tcaPoint}
          selectedId={top?.primaryObject.id}
          variant="hero"
          showControls={false}
          className="absolute inset-0"
        />
      )}
      {top && (
        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg border border-white/10 bg-[#0B1F3A]/85 px-3 py-2 text-white backdrop-blur">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-orange uppercase">Potential conjunction</span>
          <span className="text-xs font-medium">
            {top.primaryObject.name} ↔ {top.secondaryObject.name}
          </span>
          <span className="font-mono text-[11px] text-white/70">Miss distance {formatKm(top.missDistanceKm)}</span>
        </div>
      )}
    </div>
  )
}
