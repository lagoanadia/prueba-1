import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { todayISO } from '../../lib/dates.js'
import PackedGrid from '../PackedGrid.jsx'
import { EMPTY } from '../MonthGrid.jsx'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Constancia: los días del mes en cuadrados (como Hábitos in pixels); en verde los días que has entrenado. */
export default function Consistency({ data }) {
  const [shift, setShift] = useState(0)
  const [y0, m0] = todayISO().split('-').map(Number)
  const m = ((m0 - 1 + shift) % 12 + 12) % 12
  const y = y0 + Math.floor((m0 - 1 + shift) / 12)
  const n = new Date(y, m + 1, 0).getDate()
  const days = Array.from({ length: n }, (_, i) => `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
  const trained = new Set((data.workouts ?? []).map((w) => w.date))
  const count = days.filter((d) => trained.has(d)).length

  return (
    <div className="sa-consist">
      <div className="sa-grid"><PackedGrid days={days} colorFor={(d) => (trained.has(d) ? '#3DDC97' : EMPTY)} max={36} /></div>
      <div className="sa-legend"><span><i className="is-met" />Día con entreno</span><span><i />Sin entreno</span><b>{count} {count === 1 ? 'día' : 'días'} con entreno</b></div>
      <div className="sa-row sa-center">
        <button className="fd-ib" onClick={() => setShift(shift - 1)} aria-label="Mes anterior"><Icon name="left" size={16} /></button>
        <b>{MONTHS[m]} {y}</b>
        <button className="fd-ib" onClick={() => setShift(shift + 1)} disabled={shift >= 0} aria-label="Mes siguiente"><Icon name="right" size={16} /></button>
      </div>
    </div>
  )
}
