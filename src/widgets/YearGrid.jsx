import { useLayoutEffect, useRef, useState } from 'react'
import { addDays, todayISO, weekStart } from '../lib/dates.js'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** El año en 12 mini-meses (4 por fila), cada uno con sus semanas en filas de 7 (lunes a domingo). */
export default function YearGrid({ colorFor, onDay }) {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  return (
    <div className="year-months">
      {MONTHS.map((name, m) => {
        const days = new Date(year, m + 1, 0).getDate()
        const offset = (new Date(year, m, 1).getDay() + 6) % 7
        return (
          <div key={name} className="ymonth">
            <span className="ymonth-name">{name}</span>
            <div className="ymonth-grid">
              {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = iso(year, m, i + 1)
                return <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ background: colorFor(d) }}
                  onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const GAP = 2 // entre cuadrados

/**
 * El año entero como una masa de cuadrados (semanas en columnas, lunes arriba). Siempre cuadrados y sin deslizar:
 * se parte en 1-4 bandas apiladas según el ancho y el alto del hueco, la que dé los cuadrados más grandes.
 */
export function YearMass({ colorFor, onDay }) {
  const box = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const today = todayISO()
  const year = today.slice(0, 4)
  const first = weekStart(`${year}-01-01`)
  const weeks = Math.floor((new Date(`${weekStart(`${year}-12-31`)}T12:00:00`) - new Date(`${first}T12:00:00`)) / 604800000) + 1
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(first, w * 7 + i)))

  // Se prueba con 1 a 6 bandas apiladas y se queda la que da los cuadrados más grandes
  let best = { bands: 1, cell: 0 }
  for (let b = 1; b <= 6; b++) {
    const per = Math.ceil(weeks / b)
    const cell = Math.min((size.w - (per - 1) * GAP) / per, (size.h - (7 * b - 1) * GAP) / (7 * b))
    if (cell > best.cell) best = { bands: b, cell }
  }
  const cell = Math.max(4, Math.min(Math.floor(best.cell), 40))
  const per = Math.ceil(weeks / best.bands)
  const bands = Array.from({ length: best.bands }, (_, i) => cols.slice(i * per, (i + 1) * per))
  // El espacio que sobra se reparte entre los cuadrados (hueco parejo, también entre bandas) para llenar el widget
  const spread = (room, n) => (n > 1 ? Math.max(GAP, Math.min((room - n * cell) / (n - 1), cell * 0.45)) : GAP)
  const gapX = spread(size.w, per)
  const gapY = spread(size.h, 7 * best.bands)

  return (
    <div className="year-mass-box" ref={box} style={{ gap: gapY }}>
      {size.w > 0 && bands.map((band, bi) => (
        <div key={bi} className="year-mass" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoColumns: `${cell}px`, gap: `${gapY}px ${gapX}px` }}>
          {band.flat().map((d) => (d.startsWith(year)
            ? <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ width: cell, height: cell, background: colorFor(d) }} onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
            : <span key={d} />))}
        </div>
      ))}
    </div>
  )
}
