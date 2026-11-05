import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { AREAS, getArea } from '../data/areas.js'

const SUBTITLES = {
  idle: 'Toca el círculo para hablar',
  listening: 'Te estoy escuchando',
  processing: 'Pensando…',
  confirm: 'Pulsa confirmar o di «sí»',
  saving: 'Guardando…',
  done: '¡Apuntado!',
}

// Abanico de tarjetas alrededor del círculo (ángulo en grados respecto a la vertical).
const FAN = [-60, -30, 0, 30, 60]

/** Pantalla "Asistente de voz". En móvil ocupa toda la pantalla; en portátil es un modal. */
export default function VoiceOverlay({ open, onClose, firstName, assistant, modal = false }) {
  const { status, transcript, reply, proposal, error } = assistant
  const highlighted = proposal?.[0]?.area
  const confirmRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose // siempre la última versión, sin re-registrar efectos

  // Esc cierra; y al terminar de guardar, se cierra sola tras un momento.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // Cuando aparecen los botones de confirmar, que se vean aunque la pantalla sea bajita.
  useEffect(() => {
    if (status === 'confirm') confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [status])
  useEffect(() => {
    if (status !== 'done') return
    const t = setTimeout(() => closeRef.current(), 1400)
    return () => clearTimeout(t)
  }, [status])

  if (!open) return null

  return (
    <div className={`voice ${modal ? 'voice-modal' : ''}`} role="dialog" aria-modal="true" aria-label="Asistente de voz">
      {modal && <div className="voice-backdrop" onClick={onClose} />}
      <div className="voice-panel">
        <header className="voice-top">
          <button className="icon-btn" onClick={onClose} aria-label="Volver al inicio"><Icon name="back" color="#5F6368" strokeWidth={2.4} /></button>
          <span>Asistente de voz</span>
          <span style={{ width: 44 }} />
        </header>

        <h1 className="hello">Hola, {firstName}</h1>
        <p className="muted voice-sub" aria-live="polite">{error || SUBTITLES[status]}</p>

        <div className={`fan fan-${status}`}>
          {AREAS.map((a, i) => (
            <div key={a.id} className={`fan-card ${highlighted === a.id ? 'fan-card-on' : ''}`}
              style={{ '--a': `${FAN[i]}deg`, '--d': `${i * 50}ms`, background: a.color }}>
              <span className="fan-icon"><Icon name={a.id} /></span>
              <span className="fan-label">{a.label}</span>
            </div>
          ))}
          <button className={`voice-circle voice-${status}`} onClick={assistant.toggle}
            aria-label={status === 'listening' ? 'Dejar de escuchar' : 'Hablar'} disabled={status === 'processing' || status === 'saving'}>
            <svg aria-hidden="true" width="112" height="72" viewBox="0 0 112 72" fill="none" strokeWidth="3" strokeLinecap="round">
              {['#3185FC', '#E84855', '#F9DC5C', '#3DDC97'].map((c, i) => (
                <path key={c} className="wave" style={{ '--w': i }} stroke={c}
                  d={`M2 ${12 + i * 16}C16 ${4 + i * 16} 30 ${20 + i * 16} 44 ${12 + i * 16}S72 ${4 + i * 16} 86 ${12 + i * 16}S102 ${18 + i * 16} 110 ${12 + i * 16}`} />
              ))}
            </svg>
          </button>
        </div>

        {(transcript || reply) && (
          <div className="card transcript">
            {transcript && (
              <>
                <p className="eyebrow">Transcripción</p>
                <p className="transcript-text">{transcript}</p>
                <div className="divider" />
              </>
            )}
            {reply && <p className="reply">{reply}</p>}
            {proposal && (
              <ul className="proposal">
                {proposal.map((a, i) => (
                  <li key={i}><span className="dot" style={{ background: getArea(a.area)?.color }} />{a.title}</li>
                ))}
              </ul>
            )}
            {status === 'confirm' && (
              <div className="confirm-row" ref={confirmRef}>
                <button className="btn-primary" onClick={assistant.confirm}>
                  Sí, confirmar<span className="btn-arrow"><Icon name="arrow" size={16} strokeWidth={2.6} /></span>
                </button>
                <button className="btn-secondary" onClick={assistant.cancel}>No</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
