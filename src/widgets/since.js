import { todayISO } from '../lib/dates.js'

/**
 * Día en que empezaste a usar el Journal: el guardado en el tablero (`data.since`) o, si aún no lo hay, el primer día con algo
 * (ánimo, hábito marcado, cápsula…); y si no hay nada, hoy. Así el «año» cuenta desde que empezaste y no desde el 1 de enero.
 */
export function sinceFromData(data, today = todayISO()) {
  if (data.since) return data.since
  const dates = [
    ...Object.keys(data.moods ?? {}).filter((k) => data.moods[k]),
    ...Object.values(data.pixels ?? {}).flat(),
    ...(data.bottles ?? []).map((b) => b.createdAt),
  ].filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  const first = dates.sort()[0]
  return first && first < today ? first : today
}
