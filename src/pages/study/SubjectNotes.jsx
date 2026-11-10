import { useState } from 'react'
import BlockEdit from '../../components/BlockEdit.jsx'
import Icon from '../../components/Icon.jsx'
import QuickNote from './QuickNote.jsx'
import { changeSubject } from './helpers.js'

/**
 * Post-its de una asignatura: funcionan igual que en la pantalla de Asignaturas. Se escriben directamente y, con el
 * botón del tablero, se pueden mover, cambiar de ancho, quitar y añadir más.
 */
export default function SubjectNotes({ update, subject }) {
  const blocks = subject.noteBlocks ?? []
  const notes = subject.quickNotes ?? {}
  const [editing, setEditing] = useState(false)
  const change = (fn) => changeSubject(update, subject.id, fn)

  const add = () => change((s) => ({ ...s, noteBlocks: [...(s.noteBlocks ?? []), { id: crypto.randomUUID(), span: 1 }] }))
  const remove = (id) => change((s) => { const q = { ...(s.quickNotes ?? {}) }; delete q[id]; return { ...s, noteBlocks: (s.noteBlocks ?? []).filter((b) => b.id !== id), quickNotes: q } })
  const setSpan = (id, span) => change((s) => ({ ...s, noteBlocks: (s.noteBlocks ?? []).map((b) => (b.id === id ? { ...b, span } : b)) }))
  const move = (i, dir) => change((s) => { const n = [...(s.noteBlocks ?? [])]; const j = i + dir; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return { ...s, noteBlocks: n } })
  const setNote = (id, note) => change((s) => ({ ...s, quickNotes: { ...(s.quickNotes ?? {}), [id]: note } }))

  return (
    <section className="subject-notes" aria-label="Post-its">
      <div className="head-line unit-head">
        <h2 className="page-h2"><span className="dot-study" aria-hidden="true" />Post-its</h2>
        <button className="icon-btn unit-add" onClick={add} aria-label="Añadir post-it" title="Añadir post-it"><Icon name="plus" size={20} /></button>
        {blocks.length > 0 && (
          <button className={`icon-btn ${editing ? 'on' : ''}`} onClick={() => setEditing(!editing)} aria-label={editing ? 'Terminar de mover los post-its' : 'Mover y ajustar los post-its'} title={editing ? 'Listo' : 'Mover y ajustar'}><Icon name={editing ? 'check' : 'board'} size={20} /></button>
        )}
      </div>
      {blocks.length > 0 && (
        <div className={`plan-grid ${editing ? 'is-editing' : ''}`}>
          {blocks.map((b, i) => (
            <section key={b.id} className={`plan-block is-note span-${b.span}`}>
              {editing && <BlockEdit span={b.span} onSpan={(n) => setSpan(b.id, n)} onRemove={() => remove(b.id)} onMove={(dir) => move(i, dir)} first={i === 0} last={i === blocks.length - 1} name="post-it" />}
              <QuickNote note={notes[b.id] ?? { html: '' }} onChange={(n) => setNote(b.id, n)} onDelete={() => remove(b.id)} />
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
