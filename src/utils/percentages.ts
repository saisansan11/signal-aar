import type { Response } from '../models'

export function countOptionResponses(responses: Response[], options: string[]) {
  const counts: Record<string, number> = {}
  options.forEach(o => { counts[o] = 0 })
  responses.forEach(r => { if (r.selectedOption && counts[r.selectedOption] !== undefined) counts[r.selectedOption]++ })
  const total = responses.length || 1
  return options.map(o => ({
    option: o,
    count: counts[o],
    pct: Math.round((counts[o] / total) * 100),
  }))
}

export function averageRating(responses: Response[]): number {
  const rated = responses.filter(r => r.ratingValue !== null)
  if (!rated.length) return 0
  return rated.reduce((s, r) => s + (r.ratingValue ?? 0), 0) / rated.length
}
