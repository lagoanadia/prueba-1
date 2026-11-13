import { useEffect, useState } from 'react'

/** Aviso de abajo con «Deshacer» y una línea de tiempo que se gasta (ver lib/undo.js). Se pausa mientras tienes el puntero encima. */
export default function UndoToast() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const on = (e) => {
      const t = { id: crypto.randomUUID(), ...e.detail, left: e.detail.ms, since: Date.now(), paused: false }
      setItems((l) => [...l.slice(-2), t])
    }
    window.addEventListener('undo-toast', on)
    return () => window.removeEventListener('undo-toast', on)
  }, [])
  // Un temporizador por aviso; se reanuda con el tiempo que le quedaba
  useEffect(() => {
    const timers = items.filter((t) => !t.paused).map((t) => setTimeout(() => setItems((l) => l.filter((x) => x.id !== t.id)), t.left))
    return () => timers.forEach(clearTimeout)
  }, [items])
  const pause = (id) => setItems((l) => l.map((t) => (t.id === id && !t.paused ? { ...t, paused: true, left: Math.max(400, t.left - (Date.now() - t.since)) } : t)))
  const resume = (id) => setItems((l) => l.map((t) => (t.id === id && t.paused ? { ...t, paused: false, since: Date.now() } : t)))
  const undo = (t) => { setItems((l) => l.filter((x) => x.id !== t.id)); t.restore() }
  if (!items.length) return null
  return (
    <div className="undo-host" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`undo-toast ${t.paused ? 'is-paused' : ''}`} onPointerEnter={() => pause(t.id)} onPointerLeave={() => resume(t.id)}>
          <span>{t.message}</span>
          <button className="undo-btn" onClick={() => undo(t)}>Deshacer</button>
          <i className="undo-line" style={{ '--ms': `${t.left}ms` }} key={`${t.id}-${t.paused}`} />
        </div>
      ))}
    </div>
  )
}
