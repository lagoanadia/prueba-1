import { useEffect, useRef, useState } from 'react'
import { todayISO } from '../../lib/dates.js'

const MODES = { foco: 25 * 60, pausa: 5 * 60 }
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Foco (pomodoro): 25 min de trabajo y 5 de pausa. Cuenta las sesiones de foco de hoy.
 * El tiempo se calcula con la hora real (no sumando ticks), así no se desfasa si el navegador va lento.
 */
export default function Focus({ size, data, update }) {
  const today = todayISO()
  const sessions = data.focus?.[today] ?? 0
  const [mode, setMode] = useState('foco')
  const [left, setLeft] = useState(MODES.foco)
  const [endsAt, setEndsAt] = useState(null) // momento en que acaba (ms); null = parado
  const finished = useRef(false)

  useEffect(() => {
    if (!endsAt) return
    finished.current = false
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setLeft(s)
      if (s === 0 && !finished.current) {
        finished.current = true
        setEndsAt(null)
        navigator.vibrate?.([120, 60, 120])
        if (mode === 'foco') update((d) => ({ ...d, focus: { ...d.focus, [today]: (d.focus?.[today] ?? 0) + 1 } }))
        const next = mode === 'foco' ? 'pausa' : 'foco'
        setMode(next)
        setLeft(MODES[next])
      }
    }, 250)
    return () => clearInterval(id)
  }, [endsAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => (endsAt ? (setEndsAt(null)) : setEndsAt(Date.now() + left * 1000))
  const reset = () => { setEndsAt(null); setLeft(MODES[mode]) }
  const pick = (m) => { setEndsAt(null); setMode(m); setLeft(MODES[m]) }
  const pct = 100 - (left / MODES[mode]) * 100

  const ring = (
    <button className={`focus-ring focus-${mode} ${endsAt ? 'is-running' : ''}`} style={{ '--p': pct }} onClick={toggle} aria-label={endsAt ? 'Pausar' : 'Empezar'}>
      <span className="focus-time">{fmt(left)}</span>
      {size !== 'S' && <span className="w-hint">{endsAt ? 'toca para pausar' : mode === 'foco' ? 'foco' : 'pausa'}</span>}
    </button>
  )

  if (size === 'S') return <div className="w-center">{ring}</div>
  return (
    <div className={`focus focus-${size}`}>
      <div className="focus-ring-wrap">{ring}</div>
      <div className="focus-side">
        <span className="focus-sessions">{Array.from({ length: Math.max(4, sessions) }, (_, i) => <span key={i} className={i < sessions ? 'on' : ''} />)}</span>
        <span className="w-hint">{sessions} {sessions === 1 ? 'sesión' : 'sesiones'} hoy</span>
        <div className="w-form">
          {Object.keys(MODES).map((m) => <button key={m} className={`pill pill-sm ${mode === m ? 'pill-on' : ''}`} onClick={() => pick(m)}>{m === 'foco' ? 'Foco 25' : 'Pausa 5'}</button>)}
          <button className="pill pill-sm" onClick={reset}>Reiniciar</button>
        </div>
      </div>
    </div>
  )
}
