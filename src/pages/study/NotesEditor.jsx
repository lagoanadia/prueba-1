import { useState } from 'react'
import { safeUrl } from './ResourceCards.jsx'

const BLOCKS = [
  ['title', 'Título'], ['subtitle', 'Subtítulo'], ['text', 'Texto'], ['list', 'Lista'],
  ['highlight', 'Destacado'], ['image', 'Imagen'], ['outline', 'Esquema'],
]
const PLACEHOLDER = { title: 'Título', subtitle: 'Subtítulo', text: 'Escribe…', list: 'Un punto por línea', highlight: 'Lo importante', image: 'https://… (enlace a la imagen)', outline: 'Un punto por línea; con espacios delante para meterlo dentro' }

/** Editor de apuntes por bloques. Se guarda en data.notes[topicId] solo al pulsar «Guardar apuntes». */
export default function NotesEditor({ data, update, subject, unit, topicId, back, openNotes }) {
  const index = unit.topics.findIndex((t) => t.id === topicId)
  const topic = unit.topics[index]
  const [blocks, setBlocks] = useState(() => data.notes?.[topicId] ?? [])
  const [dirty, setDirty] = useState(false)

  const edit = (fn) => { setBlocks(fn); setDirty(true) }
  const add = (type) => edit((b) => [...b, { id: crypto.randomUUID(), type, text: '' }])
  const set = (id, text) => edit((b) => b.map((x) => (x.id === id ? { ...x, text } : x)))
  const move = (i, dir) => edit((b) => { const n = [...b]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; return n })
  const remove = (id) => edit((b) => b.filter((x) => x.id !== id))
  const save = () => { update((d) => ({ ...d, notes: { ...(d.notes ?? {}), [topicId]: blocks.filter((x) => x.text.trim()) } })); setDirty(false) }
  const leave = (fn) => () => { if (!dirty || window.confirm('Hay cambios sin guardar. ¿Salir igualmente?')) fn() }

  return (
    <div className="page study notes" style={{ '--c': subject.color }}>
      <button className="back-link" onClick={leave(back)}>← {unit.name}</button>
      <header className="page-head">
        <div>
          <h1>Editor de apuntes</h1>
          <p className="muted page-sub">
            {subject.short} ·{' '}
            <select className="topic-select" value={topicId} onChange={(e) => leave(() => openNotes(e.target.value))()} aria-label="Tema">
              {unit.topics.map((t, i) => <option key={t.id} value={t.id}>Tema {i + 1} · {t.name}</option>)}
            </select>
          </p>
        </div>
        <div className="page-actions">
          {dirty && <span className="unsaved">Cambios sin guardar</span>}
          <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!dirty} onClick={save}>Guardar apuntes</button>
        </div>
      </header>

      <div className="note-toolbar">
        <span className="muted">Añadir</span>
        {BLOCKS.map(([type, label]) => <button key={type} className="pill" onClick={() => add(type)}>{label}</button>)}
      </div>

      <div className="card note-sheet">
        {topic && <p className="note-topic">{topic.name}</p>}
        {blocks.map((b, i) => {
          const src = b.type === 'image' && safeUrl(b.text)
          return (
            <div key={b.id} className={`note-block nb-${b.type}`}>
              {['title', 'subtitle', 'image'].includes(b.type)
                ? <input value={b.text} placeholder={PLACEHOLDER[b.type]} onChange={(e) => set(b.id, e.target.value)} maxLength={b.type === 'image' ? 400 : 120} />
                : <textarea value={b.text} placeholder={PLACEHOLDER[b.type]} rows={Math.max(2, b.text.split('\n').length)} onChange={(e) => set(b.id, e.target.value)} maxLength={4000} />}
              {src && <img src={src} alt="" loading="lazy" />}
              <span className="nb-tools">
                <button onClick={() => move(i, -1)} disabled={i === 0}>Subir</button>
                <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>Bajar</button>
                <button onClick={() => remove(b.id)}>Quitar</button>
              </span>
            </div>
          )
        })}
        {blocks.length === 0 && <p className="muted">Empieza añadiendo un bloque</p>}
      </div>
    </div>
  )
}
