import type { Satellite } from '@/lib/types/api'
import { formatNumber, formatUtc } from '@/lib/format'
import { ObjectTypeBadge, PrototypeBadge } from '@/components/shared/badges'
import { Metric } from '@/components/shared/primitives'

export function SatelliteDetails({ satellite }: { satellite: Satellite }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ObjectTypeBadge type={satellite.type} />
          <span className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-navy">{satellite.regime}</span>
          {satellite.origin === 'PROTOTYPE_SAMPLE' && <PrototypeBadge label="Sample" />}
        </div>
        <p className="font-mono text-xs text-muted-foreground">NORAD {satellite.noradId}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Metric label="Altitude" value={`${formatNumber(satellite.altitudeKm ?? (satellite as any).altitude_km, 1)} km`} />
        <Metric label="Velocity" value={`${(satellite.velocityKms ?? (satellite as any).velocity_kms ?? 0).toFixed(2)} km/s`} />
        <Metric label="Latitude" value={`${(satellite.latitudeDeg ?? (satellite as any).latitude_deg ?? 0).toFixed(2)}°`} />
        <Metric label="Longitude" value={`${(satellite.longitudeDeg ?? (satellite as any).longitude_deg ?? 0).toFixed(2)}°`} />
        <Metric label="Inclination" value={`${(satellite.inclinationDeg ?? (satellite as any).inclination_deg ?? 0).toFixed(2)}°`} />
        <Metric label="Period" value={`${formatNumber(satellite.periodMin ?? (satellite as any).period_min, 1)} min`} />
        <Metric label="Eccentricity" value={(satellite.eccentricity ?? 0).toFixed(4)} />
        <Metric label="State Epoch" value={formatUtc(satellite.stateEpoch ?? (satellite as any).state_epoch, false)} />
      </dl>
      <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        State propagated by backend (SGP4) from TLE epoch {formatUtc(satellite.tleEpoch)}.
      </p>
    </div>
  )
}
