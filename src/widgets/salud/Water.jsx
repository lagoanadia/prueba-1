import { lastDays, todayISO } from '../../lib/dates.js'


/** Agua: vasos de hoy (toca para añadir / quitar). T y L: + últimos 7 días. */
export default function Water({ size, data, update }) {
  const today = todayISO()
  const water = data.water ?? {}
  const GOAL = data.waterGoal ?? 8
  const n = water[today] ?? 0
  const set = (v) => update((d) => ({ ...d, water: { ...d.water, [today]: Math.max(0, Math.min(12, v)) } }))

  if (size === 'S') {
    return (
      <button className="water-s" onClick={() => set(n + 1)} aria-label={`Añadir vaso (${n} de ${GOAL})`}>
        <span className="water-fill" style={{ height: `${Math.min(100, (n / GOAL) * 100)}%` }} />
        <b>{n}<small>/{GOAL}</small></b>
      </button>
    )
  }

  return (
    <>
      <div className="glasses">
        {Array.from({ length: GOAL }, (_, i) => (
          <button key={i} className={`glass ${i < n ? 'full' : ''}`} onClick={() => set(i < n ? i : i + 1)} aria-label={`${i + 1} vasos`}>
            <svg viewBox="0 0 24 30" aria-hidden="true"><path d="M4 3h16l-2 23a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" fill="var(--g)" stroke="#202124" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          </button>
        ))}
      </div>
      <span className="w-hint">{n} de {GOAL} vasos</span>
      {(size === 'L' || size === 'T') && (
        <div className="mini-bars">
          {lastDays(7).map((d) => <span key={d} title={`${water[d] ?? 0} vasos`} style={{ height: `${Math.min(100, ((water[d] ?? 0) / GOAL) * 100)}%` }} />)}
        </div>
      )}
    </>
  )
}
