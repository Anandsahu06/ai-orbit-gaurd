/** Fixed reference epoch so prototype sample data renders deterministically. */
export const MOCK_EPOCH = '2026-09-26T08:00:00Z'
export const MOCK_TLE_EPOCH = '2026-09-26T02:14:00Z'

export const hoursFromEpoch = (hours: number) =>
  new Date(new Date(MOCK_EPOCH).getTime() + hours * 3_600_000).toISOString()
