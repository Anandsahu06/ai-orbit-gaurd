/** Display-only formatting helpers. No derived science lives here. */

export const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const formatKm = (n: number, digits = 2) => `${formatNumber(n, digits)} km`

export function formatUtc(iso: string, withDate = true) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  if (!withDate) return `${time} UTC`
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  return `${date} · ${time} UTC`
}

export function formatDuration(hours: number) {
  const sign = hours < 0 ? '+' : '−'
  const abs = Math.abs(hours)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  return `T${sign}${h}h ${m.toString().padStart(2, '0')}m`
}

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })

export const directionLabel = (d: string | null) =>
  d ? d.charAt(0) + d.slice(1).toLowerCase() : '—'
