import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { DOC_KINDS, docPreview, docTitle, templateFor } from './docs.js'
import { soft } from './shared.js'

/** Documentos de un proyecto: tarjetas y un + que abre las plantillas. */
export default function DocsBlock({ project, change, openDoc }) {
  const [choosing, setChoosing] = useState(false)
  const docs = [...(project.docs ?? [])].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
  const create = (kind) => {
    const doc = { id: crypto.randomUUID(), kind, doc: templateFor(kind, project), updatedAt: todayISO() }
    change((p) => ({ ...p, docs: [...(p.docs ?? []), doc] }))
    setChoosing(false)
    openDoc(doc.id)
  }

  return (
    <div className="docs">
      <div className="ms-head">
        <span className="wk-badge" title="Documentos"><Icon name="doc" size={18} /></span>
        <span className="ms-summary">{docs.length ? `${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}` : <span className="muted">Actas, briefing, presupuestos…</span>}</span>
        <button className="icon-btn ms-plus" onClick={() => setChoosing(true)} aria-label="Nuevo documento" title="Nuevo documento"><Icon name="plus" size={20} /></button>
      </div>
      <div className="doc-cards">
        {docs.map((d, i) => (
          <button key={d.id} className="doc-card" style={{ '--i': i, '--k': DOC_KINDS[d.kind]?.color ?? '#F1F3F4' }} onClick={() => openDoc(d.id)}>
            <span className="doc-kind" style={{ background: soft(DOC_KINDS[d.kind]?.color ?? '#F1F3F4', 40) }}>{DOC_KINDS[d.kind]?.label ?? 'Documento'}</span>
            <b>{docTitle(d)}</b>
            <span className="doc-preview">{docPreview(d) || 'Vacío'}</span>
            <span className="muted doc-date">{d.updatedAt ? formatShort(d.updatedAt) : ''}</span>
          </button>
        ))}
      </div>

      {choosing && createPortal(
        <div className="popup" role="dialog" aria-modal="true" aria-label="Nuevo documento" onKeyDown={(e) => e.key === 'Escape' && setChoosing(false)}>
          <div className="popup-backdrop" onClick={() => setChoosing(false)} />
          <div className="popup-panel doc-templates">
            <b className="name-dialog-title">Nuevo documento</b>
            <div className="doc-template-grid">
              {Object.entries(DOC_KINDS).map(([kind, k], i) => (
                <button key={kind} className="doc-template" style={{ '--i': i, background: soft(k.color, kind === 'blank' ? 100 : 30) }} onClick={() => create(kind)} autoFocus={i === 0}>
                  <b>{k.label}</b><span>{k.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
