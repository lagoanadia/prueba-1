import { AREAS } from '../data/areas.js'

/** Los arcos de colores del logo / botón Hablar (uno por área, con hueco entre ellos). */
export default function RingArcs({ size, stroke, className = '' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const seg = c / AREAS.length
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {AREAS.map((a, i) => (
        <circle key={a.id} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={a.color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${seg * 0.72} ${c}`}
          transform={`rotate(${-90 + (360 / AREAS.length) * i + 8} ${size / 2} ${size / 2})`} />
      ))}
    </svg>
  )
}
