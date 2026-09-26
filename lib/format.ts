/** Display-only formatting helpers. No derived science lives here. Safe against undefined/null. */

export const formatNumber = (n: number | null | undefined, digits = 0) => {
  if (typeof n !== 'number' || isNaN(n)) return '0'
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export const formatKm = (n: number | null | undefined, digits = 2) => `${formatNumber(n, digits)} km`

export const formatFixed = (n: number | null | undefined, digits = 2, fallback = '0.00'): string => {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return n.toFixed(digits)
}

export const formatVelocity = (n: number | null | undefined, digits = 2) => `${formatFixed(n, digits, '0.00')} km/s`
export const formatDegrees = (n: number | null | undefined, digits = 1) => `${formatFixed(n, digits, '0.0')}°`
export const formatPercent = (n: number | null | undefined, digits = 1) => `${formatFixed(n, digits, '0.0')}%`

export function formatUtc(iso?: string | null, withDate = true) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
    if (!withDate) return `${time} UTC`
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    return `${date} · ${time} UTC`
  } catch {
    return String(iso)
  }
}

export function formatDuration(hours?: number | null) {
  if (typeof hours !== 'number' || isNaN(hours)) return '—'
  const sign = hours < 0 ? '+' : '−'
  const abs = Math.abs(hours)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  return `T${sign}${h}h ${m.toString().padStart(2, '0')}m`
}

export const formatShortDate = (iso?: string | null) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  } catch {
    return String(iso)
  }
}

export const directionLabel = (d: string | null | undefined) =>
  d ? d.charAt(0) + d.slice(1).toLowerCase() : '—'
