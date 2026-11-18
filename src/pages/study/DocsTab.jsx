import { useState } from 'react'
import BlockEditor from '../../components/BlockEditor.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import Icon from '../../components/Icon.jsx'
import { newBlock, toBlocks, toDoc } from '../../lib/docModel.js'
import { practicesOf } from './helpers.js'

const plain = (h) => String(h ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
const contentOf = (doc) => { try { return toBlocks(doc).filter((b) => (b.type === 'text' ? plain(b.html) : true)) } catch { return [] } }
const preview = (doc) => contentOf(doc).filter((b) => plain(b.html)).slice(0, 2).map((b) => plain(b.html).slice(0, 90))
const KIND = { topic: { label: 'Tema', tint: '#DDEBFF', ink: '#2F6FED' }, practice: { label: 'Práctica', tint: '#FFE2C2', ink: '#F08A24' }, free: { label: 'Documento', tint: '#DFF5E4', ink: '#1FA463' } }

/**
 * Pestaña «Documentos»: todos los apuntes de la asignatura en un solo sitio (los de los temas y prácticas, y los documentos sueltos).
 * Un documento de un tema o práctica se abre en su sitio (con su PDF al lado); los sueltos se abren aquí mismo.
 */
export default function DocsTab({ data, update, subject, route, go, onNewPractice }) {
  const [filter, setFilter] = useState('todos') // todos | apuntes | practicas
  const [openId, setOpenId] = useState(null)
  const [dialog, setDialog] = useState(null) // 'new' | { rename: id } | { del: id }
  const nameOf = (id, fallback) => data.notesName?.[id] || fallback

  // Documentos de temas y prácticas (un documento seguido por varios temas sale una sola vez)
  const docs = []
  subject.units.forEach((u) => {
    const items = [...u.topics.map((t) => ({ ...t, kind: 'topic' })), ...practicesOf(u).map((p) => ({ ...p, kind: 'practice' }))]
    items.forEach((it) => {
      const doc = data.notes?.[it.id] ?? it.doc
      if (it.kind === 'topic' && contentOf(doc).length === 0) return // un tema sin apuntes no es un documento todavía; una práctica sí (tiene su PDF)
      const users = items.concat(subject.units.flatMap((x) => [...x.topics, ...practicesOf(x)])).filter((x, k, a) => data.notesLink?.[x.id] === it.id && a.findIndex((y) => y.id === x.id) === k)
      docs.push({ id: it.id, name: nameOf(it.id, it.name), kind: it.kind, unitId: u.id, doc, users: users.length, blocks: contentOf(doc).length })
    })
  })
  const free = (data.freeDocs ?? []).map((f) => ({ id: f.id, name: f.name, kind: 'free', doc: data.notes?.[f.id], users: 0, blocks: contentOf(data.notes?.[f.id]).length }))
  const all = [...docs, ...free].filter((d) => filter === 'todos' || (filter === 'practicas' ? d.kind === 'practice' : d.kind !== 'practice'))

  const open = (d) => {
    if (d.kind === 'free') { setOpenId(d.id); return }
    go({ ...route, unitId: d.unitId, tab: d.kind === 'topic' ? 'estudio' : 'practicas', itemId: d.id })
  }
  const create = (name, kind) => {
    if (kind === 'practica') { setDialog(null); onNewPractice(name); return }
    const id = crypto.randomUUID()
    update((d) => ({ ...d, freeDocs: [...(d.freeDocs ?? []), { id, name }], notes: { ...(d.notes ?? {}), [id]: toDoc([newBlock()]) } }))
    setDialog(null)
    setOpenId(id)
  }
  const rename = (id, name) => { update((d) => ({ ...d, freeDocs: (d.freeDocs ?? []).map((f) => (f.id === id ? { ...f, name } : f)) })); setDialog(null) }
  const remove = (id) => { update((d) => { const notes = { ...(d.notes ?? {}) }; delete notes[id]; return { ...d, notes, freeDocs: (d.freeDocs ?? []).filter((f) => f.id !== id) } }); setDialog(null); setOpenId(null) }

  const cur = openId ? (data.freeDocs ?? []).find((f) => f.id === openId) : null
  if (cur) {
    return (
      <div className="dt-open">
        <div className="dt-bar">
          <button className="icon-btn" onClick={() => setOpenId(null)} aria-label="Volver a Documentos" title="Volver"><Icon name="back" size={18} /></button>
          <b className="w-ellipsis">{cur.name}</b>
          <button className="icon-btn" onClick={() => setDialog({ rename: cur.id })} aria-label="Cambiar el nombre" title="Cambiar el nombre"><Icon name="pen" size={16} /></button>
          <button className="icon-btn" onClick={() => setDialog({ del: cur.id })} aria-label="Eliminar el documento" title="Eliminar"><Icon name="trash" size={16} /></button>
        </div>
        <BlockEditor key={cur.id} label={`Documento ${cur.name}`} value={data.notes?.[cur.id]} exportAs={{ title: cur.name, subtitle: subject.short }}
          onChange={(doc) => update((d) => ({ ...d, notes: { ...(d.notes ?? {}), [cur.id]: doc } }))} />
        {dialog?.rename && <NameDialog title="Nombre del documento" initial={cur.name} onSubmit={(n) => rename(cur.id, n)} onClose={() => setDialog(null)} />}
        {dialog?.del && <NameDialog title="Eliminar documento" initial={cur.name} onSubmit={() => remove(cur.id)} onDelete={() => remove(cur.id)} deleteLabel="Eliminar documento" deleteWarning="Se borrará con todo su contenido. No se puede deshacer." onClose={() => setDialog(null)} />}
      </div>
    )
  }

  return (
    <div className="dt">
      <div className="dt-chips" role="group" aria-label="Filtrar">
        {[['todos', 'Todos'], ['apuntes', 'Apuntes'], ['practicas', 'Prácticas']].map(([id, l]) => <button type="button" key={id} className={`dt-chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>{l}</button>)}
      </div>
      <div className="dt-grid">
        {all.map((d) => {
          const k = KIND[d.kind]
          const pv = preview(d.doc)
          return (
            <button type="button" key={d.id} className="dt-card" onClick={() => open(d)}>
              <span className="dt-top">
                <span className="dt-ic" style={{ background: k.tint, color: k.ink }}><Icon name="doc" size={20} color={k.ink} /></span>
                <span className="dt-nm"><b>{d.name}</b><small>{d.kind === 'practice' ? `${d.blocks} ${d.blocks === 1 ? 'bloque' : 'bloques'} · con PDF` : `${d.blocks} ${d.blocks === 1 ? 'bloque' : 'bloques'}`}</small></span>
              </span>
              <span className="dt-pv">{pv.length ? pv.map((t, i) => <span key={i}>{t}</span>) : <span className="muted">Vacío</span>}</span>
              <span className="dt-pill" style={{ background: k.tint, color: k.ink }}>{d.users > 1 ? `${k.label} · lo siguen ${d.users}` : k.label}</span>
            </button>
          )
        })}
        <button type="button" className="dt-new" onClick={() => setDialog('new')}><Icon name="plus" size={18} strokeWidth={2.6} />Documento nuevo</button>
      </div>
      {all.length === 0 && <p className="muted dt-empty">Aquí se juntan todos tus apuntes. Los de los temas y prácticas salen solos en cuanto escribas algo; también puedes crear documentos sueltos.</p>}
      {dialog === 'new' && <NameDialog title="Documento nuevo" placeholder="Nombre del documento" onSubmit={create} onClose={() => setDialog(null)} choices={[{ id: 'apuntes', label: 'Apuntes', hint: 'Texto libre, como tus apuntes', icon: 'doc', tint: '#DFF5E4', ink: '#1FA463' }, { id: 'practica', label: 'Práctica', hint: 'Con su PDF al lado', icon: 'code', tint: '#FFE2C2', ink: '#F08A24' }]} />}
    </div>
  )
}
