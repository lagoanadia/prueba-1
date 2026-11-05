import { useEffect, useState } from 'react'
import { AREAS } from '../data/areas.js'

const R = 110 // radio medio del anillo
const STROKE = 60 // grosor: el anillo va de 80 a 140, como en el prototipo
const C = 2 * Math.PI * R // longitud de la circunferencia
const GAP = 4 // separación blanca entre áreas

/**
 * Rueda del día: un trozo por área, proporcional a sus tareas de hoy.
 * Cada trozo es un círculo con stroke-dasharray = "longitud visible, resto invisible".
 * Sin tareas: anillo gris + taza de café.
 */
export default function Donut({ entries, size = 380 }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true)) // dispara la animación de "dibujado"
    return () => cancelAnimationFrame(id)
  }, [])

  const counts = AREAS.map((a) => ({ ...a, n: entries.filter((e) => e.area === a.id).length })).filter((a) => a.n > 0)
  const total = counts.reduce((sum, a) => sum + a.n, 0)
  const label = total
    ? `Tareas de hoy por áreas: ${counts.map((a) => `${a.label} ${a.n}`).join(', ')}`
    : 'Hoy no tienes tareas: el día está libre'

  let offset = 0
  return (
    <svg className="donut" role="img" aria-label={label} viewBox="0 0 300 300" style={{ maxWidth: size }}>
      {total === 0 && <circle cx="150" cy="150" r={R} fill="none" stroke="#DADCE0" strokeWidth={STROKE} />}
      {counts.map((a) => {
        const len = (a.n / total) * C
        const visible = counts.length > 1 ? Math.max(len - GAP, 1) : C
        const seg = (
          <circle key={a.id} cx="150" cy="150" r={R} fill="none" stroke={a.color} strokeWidth={STROKE}
            strokeDasharray={`${drawn ? visible : 0} ${C}`} strokeDashoffset={-offset}
            transform="rotate(-90 150 150)" className="donut-seg" />
        )
        offset += len
        return seg
      })}
      <g transform="translate(90 90)" fill="none" stroke="#202124" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="donut-icon">
        {total === 0 ? (
          <>
            <path d="M28 54L33 88C34 97 42 102 53 102L67 102C78 102 86 97 87 88L92 54Z" />
            <path d="M91 62C110 60 110 86 88 84" />
            <path d="M20 108C48 112 72 112 100 108" />
            <path className="steam" d="M46 42C40 34 52 28 46 18" />
            <path className="steam" d="M62 42C56 34 68 28 62 18" />
            <path className="steam" d="M78 42C72 34 84 28 78 18" />
          </>
        ) : (
          <>
            <path d="M10 99C18 86 30 64 44 47C50 55 54 62 58 67C64 55 70 44 75 35C86 54 98 78 110 99" />
            <path d="M6 101C40 104 80 98 114 101" />
            <path d="M20 94C32 84 38 74 50 62" strokeDasharray="0.1 8" strokeWidth="5" />
            <path d="M75 35L74 12" />
            <path className="flag" d="M74 12L97 19L74 27Z" fill="#F9DC5C" />
            <path d="M101 14L109 10M63 24L56 18M86 6L89 0" />
          </>
        )}
      </g>
    </svg>
  )
}
