import BlockEditor from '../../components/BlockEditor.jsx'
import Icon from '../../components/Icon.jsx'
import { formatShort, todayISO } from '../../lib/dates.js'
import { DOC_KINDS } from './docs.js'
import { soft } from './shared.js'

/** Un documento de trabajo a pantalla completa, con el editor por bloques. Se guarda solo. */
export default function DocView({ project, docId, change, back }) {
  const d = (project.docs ?? []).find((x) => x.id === docId)
  if (!d) return null
  const save = (doc) => change((p) => ({ ...p, docs: p.docs.map((x) => (x.id === docId ? { ...x, doc, updatedAt: todayISO() } : x)) }))
  const remove = () => { if (window.confirm('¿Borrar este documento?')) { change((p) => ({ ...p, docs: p.docs.filter((x) => x.id !== docId) })); back() } }
  const k = DOC_KINDS[d.kind] ?? DOC_KINDS.blank

  return (
    <div className="page work doc-view">
      <div className="doc-bar">
        <button className="back-link" onClick={back}><Icon name="back" size={18} /> {project.name}</button>
        <span className="doc-kind" style={{ background: soft(k.color, 40) }}>{k.label}</span>
        <span className="muted doc-date">Editado {formatShort(d.updatedAt ?? todayISO())}</span>
        <button className="icon-btn" onClick={remove} aria-label="Borrar documento" title="Borrar"><Icon name="trash" size={18} /></button>
      </div>
      <div className="doc-sheet">
        <BlockEditor key={docId} label={k.label} value={d.doc} onChange={save} />
      </div>
    </div>
  )
}
