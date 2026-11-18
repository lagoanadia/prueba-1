import { useState } from 'react'
import BlockEditor from '../../components/BlockEditor.jsx'
import ShareButton from '../../components/ShareButton.jsx'
import Select from '../../components/Select.jsx'
import Icon from '../../components/Icon.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import { newBlock, toBlocks, toDoc } from '../../lib/docModel.js'
import { practicesOf } from './helpers.js'

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const plain = (h) => String(h ?? '').replace(/<[^>]*>/g, '').trim()
const hasContent = (doc) => { try { return toBlocks(doc).some((b) => (b.type === 'text' ? plain(b.html) : true)) } catch { return false } }

/**
 * Apuntes de un tema o práctica. Pueden ser propios, nuevos, o seguir un documento que ya existe en la unidad:
 * `notesLink[id]` = el documento que usa este tema; `notesAnchor[id]` = el título donde empieza (se salta a él al abrir).
 * Si el tema aún no tiene apuntes y hay otros documentos en la unidad, primero se elige qué usar.
 */
export default function NotesPane({ item, kind, unit, subject, data, update, notesIn, label }) {
  const [mode, setMode] = useState('new') // 'new' | 'use' en la pantalla de elegir
  const [src, setSrc] = useState(null)
  const [withTitle, setWithTitle] = useState(true)
  const [skipped, setSkipped] = useState(false) // eligió «apuntes nuevos»
  const [renaming, setRenaming] = useState(false)

  const all = [
    ...unit.topics.map((t) => ({ id: t.id, name: t.name, kind: 'topic', doc: undefined })),
    ...practicesOf(unit).map((p) => ({ id: p.id, name: p.name, kind: 'practice', doc: p.doc })),
  ]
  const docOf = (x) => data.notes?.[x.id] ?? x.doc
  const nameOf = (x) => data.notesName?.[x.id] || x.name // nombre elegido para los apuntes, o el del tema
  const sources = all.filter((x) => x.id !== item.id && hasContent(docOf(x)))
  const ownDoc = data.notes?.[item.id] ?? item.doc
  const linked = data.notesLink?.[item.id]
  const linkedItem = linked ? all.find((x) => x.id === linked) : null
  const docId = linkedItem ? linked : item.id
  const current = linkedItem ? docOf(linkedItem) : ownDoc

  // Seguir un documento: se añade al final un título con el nombre del tema (y un hueco para escribir) y se enlaza.
  // Si ese documento ya tiene el título de este tema (porque ya se siguió antes), se reutiliza y no se duplica.
  const follow = (srcId, titled = true) => {
    const from = all.find((x) => x.id === srcId)
    if (!from) return
    update((d) => {
      const base = toBlocks(d.notes?.[from.id] ?? from.doc)
      const existing = base.find((x) => x.type === 'h1' && plain(x.html) === item.name)
      let anchor = existing?.id ?? null
      let blocks = base
      if (!existing && titled) {
        const trimmed = base.length && base[base.length - 1].type === 'text' && !plain(base[base.length - 1].html) ? base.slice(0, -1) : base
        const extra = [newBlock('h1', esc(item.name)), newBlock()]
        anchor = extra[0].id
        blocks = [...trimmed, ...extra]
      }
      const anc = { ...(d.notesAnchor ?? {}) }
      if (anchor) anc[item.id] = anchor; else delete anc[item.id]
      return { ...d, notes: blocks === base ? (d.notes ?? {}) : { ...(d.notes ?? {}), [from.id]: toDoc(blocks) }, notesLink: { ...(d.notesLink ?? {}), [item.id]: from.id }, notesAnchor: anc }
    })
  }
  const unlink = () => update((d) => {
    const link = { ...(d.notesLink ?? {}) }; const anc = { ...(d.notesAnchor ?? {}) }
    delete link[item.id]; delete anc[item.id]
    return { ...d, notesLink: link, notesAnchor: anc }
  })

  const choosing = !linkedItem && data.notes?.[item.id] === undefined && !item.doc && sources.length > 0 && !skipped
  if (choosing) {
    return (
      <div className="card np-choose">
        <b className="np-title">Apuntes de este {kind === 'topic' ? 'tema' : 'práctica'}</b>
        <div className="np-cards" role="radiogroup" aria-label="Qué apuntes usar">
          <button type="button" role="radio" aria-checked={mode === 'new'} className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}><b>Apuntes nuevos</b><small>Un documento en blanco</small></button>
          <button type="button" role="radio" aria-checked={mode === 'use'} className={mode === 'use' ? 'on' : ''} onClick={() => { setMode('use'); setSrc((s) => s ?? sources[0].id) }}><b>Usar un documento de este apartado</b><small>Seguir uno que ya tengo</small></button>
        </div>
        {mode === 'use' && (
          <>
            <div className="np-list" role="radiogroup" aria-label="Documentos de este apartado">
              {sources.map((s) => (
                <button type="button" key={s.id} role="radio" aria-checked={src === s.id} className={src === s.id ? 'on' : ''} onClick={() => setSrc(s.id)}>
                  <i aria-hidden="true" /><Icon name={s.kind === 'topic' ? 'doc' : 'code'} size={15} /><span>{nameOf(s)}</span>
                </button>
              ))}
            </div>
            <label className="np-opt"><input type="checkbox" checked={withTitle} onChange={(e) => setWithTitle(e.target.checked)} />Empezar con un título al final del documento</label>
          </>
        )}
        <button type="button" className="btn-primary np-go" disabled={mode === 'use' && !src} onClick={() => (mode === 'use' ? follow(src, withTitle) : setSkipped(true))}>{mode === 'use' ? 'Seguir aquí' : 'Empezar'}<span className="btn-arrow"><Icon name="arrow" size={16} strokeWidth={2.6} /></span></button>
      </div>
    )
  }

  const shown = linkedItem ?? item // el documento que se está viendo
  const rename = (name) => { update((d) => ({ ...d, notesName: { ...(d.notesName ?? {}), [shown.id]: name } })); setRenaming(false) }
  const switcher = (
    <>
      {sources.length > 0 || linkedItem ? (
        <Select className="np-switch" label="Documento de apuntes" value={linkedItem ? linked : 'own'} placeholder="Apuntes"
          options={[{ value: 'own', label: data.notesName?.[item.id] || 'Apuntes de este ' + (kind === 'topic' ? 'tema' : 'práctica') }, ...sources.map((s) => ({ value: s.id, label: nameOf(s) })), ...(linkedItem && !sources.some((s) => s.id === linked) ? [{ value: linked, label: nameOf(linkedItem) }] : [])]}
          onChange={(v) => (v === 'own' ? unlink() : follow(v, true))} />
      ) : <span className="np-switch np-name">{nameOf(item)}</span>}
      <button type="button" className="icon-btn np-rename" onClick={() => setRenaming(true)} aria-label="Cambiar el nombre de los apuntes" title="Cambiar el nombre de los apuntes"><Icon name="pen" size={16} /></button>
      {renaming && <NameDialog title="Nombre de los apuntes" initial={nameOf(shown)} placeholder="Apuntes del tema" onSubmit={rename} onClose={() => setRenaming(false)} />}
    </>
  )

  const shareName = nameOf(shown)
  return (
    <BlockEditor key={docId} appendRef={notesIn} scrollToId={linkedItem ? data.notesAnchor?.[item.id] : null}
      exportAs={{ title: shareName, subtitle: `${subject.short} · ${unit.name}` }} label={label} value={current}
      bar={<>{switcher}{current ? <ShareButton kind="doc" title={`Apuntes de ${shareName}`} className="pill pill-sm" data={{ title: `${subject.short} · ${shareName}`, subtitle: unit.name, blocks: current?.blocks ?? [] }} /> : null}</>}
      onChange={(doc) => update((d) => ({ ...d, notes: { ...(d.notes ?? {}), [docId]: doc } }))} />
  )
}
