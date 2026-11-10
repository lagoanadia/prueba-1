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

const GAP = 2 // hueco mínimo entre cuadrados

/**
 * El año entero como un bloque de cuadrados que llena el hueco del widget (los días van de izquierda a derecha y
 * de arriba abajo). Siempre cuadrados y sin deslizar: solo la última fila puede quedarse sin llegar al final.
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
  const year = Number(today.slice(0, 4))
  const total = (new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / 86400000
  const days = Array.from({ length: total }, (_, i) => addDays(`${year}-01-01`, i))

  // El cuadrado más grande con el que caben todos los días en el hueco
  let cell = 4
  for (let c = 40; c >= 4; c -= 0.25) {
    const cols = Math.floor((size.w + GAP) / (c + GAP))
    const rows = Math.floor((size.h + GAP) / (c + GAP))
    if (cols > 0 && cols * rows >= total) { cell = c; break }
  }
  const cols = Math.max(1, Math.floor((size.w + GAP) / (cell + GAP)))
  const rows = Math.ceil(total / cols)
  // El sobrante se reparte en los huecos para que el bloque llene el widget de lado a lado y de arriba abajo
  const spread = (room, n) => (n > 1 ? Math.max(GAP, Math.min((room - n * cell) / (n - 1), cell * 0.5)) : GAP)

  return (
    <div className="year-mass-box" ref={box}>
      {size.w > 0 && (
        <div className="year-mass" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: `${spread(size.h, rows)}px ${spread(size.w, cols)}px` }}>
          {days.map((d) => (
            <button key={d} className={`ypx ${d === today ? 'px-today' : ''}`} style={{ width: cell, height: cell, background: colorFor(d) }}
              onClick={() => onDay?.(d)} disabled={!onDay || d > today} aria-label={d} title={d} />
          ))}
        </div>
      )}
    </div>
  )
}
