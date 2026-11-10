import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { fullGreenWeeks, monthRanking } from './moodStats.js'

const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

/**
 * Panel «Análisis» (a la derecha del año): página 1 = semanas plenas y cuáles fueron, página 2 = ranking de meses.
 * Se cambia de página con las flechas de abajo o deslizando.
 */
export default function MoodAnalysis({ moods }) {
  const [page, setPage] = useState(0)
  const start = useRef(null)
  const weeks = fullGreenWeeks(moods)
  const rank = monthRanking(moods).slice(0, 5)
  const go = (p) => setPage(Math.max(0, Math.min(1, p)))
  const swipe = (e) => { if (start.current == null) return; const dx = e.clientX - start.current; start.current = null; if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1)) }

  return (
    <aside className="mood-an" aria-label="Análisis" onPointerDown={(e) => { start.current = e.clientX }} onPointerUp={swipe} onPointerCancel={() => { start.current = null }}>
      <div className="mood-an-body">
        {page === 0 ? (
          <>
            <div className="mood-an-big"><b>{weeks.length}</b><span>{weeks.length === 1 ? 'semana plena' : 'semanas plenas'}</span></div>
            {weeks.length === 0 && <p className="fd-hint">Aún ninguna: una semana plena es de lunes a domingo todo en bueno.</p>}
            <div className="mood-an-weeks">
              {weeks.map((w) => (
                <div key={w.start}><span>{fmt(w.start)} – {fmt(w.end)}</span><span className="mood-an-strip">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span></div>
              ))}
            </div>
          </>
        ) : (
          <div className="mood-an-rank">
            <div className="mood-an-title"><Icon name="star" size={15} color="#B58900" />Ranking de meses</div>
            {rank.length === 0 && <p className="fd-hint">Anota tu ánimo y aquí verás tus mejores meses.</p>}
            {rank.map((x, i) => (
              <div key={x.name} className="mood-an-row"><b>{i + 1}</b><span>{x.name}</span><span className="mood-an-bar"><i style={{ width: `${Math.round((x.good / x.logged) * 100)}%` }} /></span><span className="mood-an-n">{x.good}/{x.logged}</span></div>
            ))}
          </div>
        )}
      </div>
      <div className="mood-an-pager">
        <button className="fd-ib" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Anterior"><Icon name="left" size={14} /></button>
        <span className="mood-an-dots"><i className={page === 0 ? 'on' : ''} /><i className={page === 1 ? 'on' : ''} /></span>
        <button className="fd-ib" onClick={() => go(page + 1)} disabled={page === 1} aria-label="Siguiente"><Icon name="right" size={14} /></button>
      </div>
    </aside>
  )
}
