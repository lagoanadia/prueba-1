import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import { deleteFile } from '../../lib/fileStore.js'
import { countReview } from './organize.js'

/**
 * Revisión de la propuesta: unidades → temas → documentos, todo editable (renombrar, mover, quitar, añadir).
 * Lo que no se pueda clasificar queda en «Sin clasificar» y, al crear, va a los Recursos de la asignatura.
 */
export default function OrganizeReview({ review, setReview, message, busy, onCreate, onRedo, onCancel }) {
  const [dialog, setDialog] = useState(null) // 'unit' | { topicIn: unitId }
  const [menu, setMenu] = useState(null) // id del documento con el menú «mover» abierto
  const [dragId, setDragId] = useState(null)
  const [closed, setClosed] = useState(() => new Set())
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])

  const c = countReview(review)
  const edit = (fn) => setReview((r) => fn(structuredClone(r)))
  const take = (r, id) => { r.units.forEach((u) => u.topics.forEach((t) => { t.docs = t.docs.filter((x) => x !== id) })); r.loose = r.loose.filter((x) => x !== id) }
  const move = (id, dest) => { edit((r) => { take(r, id); if (dest === 'loose') r.loose.push(id); else r.units.find((u) => u.id === dest.unit)?.topics.find((t) => t.id === dest.topic)?.docs.push(id); return r }); setMenu(null) }
  const removeDoc = (id) => { deleteFile(review.docs[id].file.id).catch(() => {}); edit((r) => { take(r, id); delete r.docs[id]; return r }) }
  const renameUnit = (uid, v) => edit((r) => { r.units.find((u) => u.id === uid).name = v; return r })
  const renameTopic = (uid, tid, v) => edit((r) => { r.units.find((u) => u.id === uid).topics.find((t) => t.id === tid).name = v; return r })
  const removeTopic = (uid, tid) => edit((r) => { const u = r.units.find((x) => x.id === uid); const t = u.topics.find((x) => x.id === tid); r.loose.push(...t.docs); u.topics = u.topics.filter((x) => x.id !== tid); return r })
  const removeUnit = (uid) => edit((r) => { const u = r.units.find((x) => x.id === uid); u.topics.forEach((t) => r.loose.push(...t.docs)); r.units = r.units.filter((x) => x.id !== uid); return r })
  const addUnit = (name) => { edit((r) => { r.units.push({ id: crypto.randomUUID(), name, topics: [] }); return r }); setDialog(null) }
  const addTopic = (uid, name) => { edit((r) => { r.units.find((u) => u.id === uid).topics.push({ id: crypto.randomUUID(), name, docs: [] }); return r }); setDialog(null) }
  const drop = (dest) => { if (dragId) move(dragId, dest); setDragId(null) }

  const docRow = (id) => {
    const d = review.docs[id]
    return (
      <div key={id} className={`og-doc ${dragId === id ? 'is-drag' : ''}`} draggable onDragStart={() => setDragId(id)} onDragEnd={() => setDragId(null)}>
        <Icon name="pdf" size={22} color="#E84855" />
        <div className="og-doc-body"><b className="w-ellipsis">{d.file.name}</b><span className="og-why">{d.why || (d.readable ? '' : 'No se ha podido leer el texto (¿escaneado?).')}</span></div>
        <span className={`og-tag ${d.conf === 'revisar' ? 'is-check' : ''}`}>{d.conf === 'revisar' ? 'Revisar' : 'Seguro'}</span>
        <span className="og-move" ref={menu === id ? menuRef : null}>
          <button className="icon-btn" onClick={() => setMenu(menu === id ? null : id)} aria-haspopup="menu" aria-expanded={menu === id} aria-label={`Mover ${d.file.name}`} title="Mover a otro tema"><Icon name="right" size={16} /></button>
          {menu === id && (
            <div className="card og-menu" role="menu">
              {review.units.map((u) => u.topics.length > 0 && (
                <div key={u.id}><span className="og-menu-h">{u.name}</span>{u.topics.map((t) => <button key={t.id} role="menuitem" onClick={() => move(id, { unit: u.id, topic: t.id })}>{t.name}</button>)}</div>
              ))}
              <button role="menuitem" onClick={() => move(id, 'loose')}>Sin clasificar</button>
            </div>
          )}
        </span>
        <button className="icon-btn" onClick={() => removeDoc(id)} aria-label={`Quitar ${d.file.name}`} title="Quitar documento"><Icon name="close" size={16} /></button>
      </div>
    )
  }

  return (
    <div className="og-review">
      {message && <p className="og-note" role="status">{message}</p>}
      <div className="og-cols">
        <div className="og-main">
          {review.units.map((u) => (
            <section key={u.id} className="card og-unit">
              <div className="og-uhead">
                <button className="icon-btn" onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n })} aria-expanded={!closed.has(u.id)} aria-label={`${closed.has(u.id) ? 'Desplegar' : 'Plegar'} ${u.name}`}><Icon name={closed.has(u.id) ? 'right' : 'down'} size={18} /></button>
                <input className="og-input og-uname" value={u.name} maxLength={80} onChange={(e) => renameUnit(u.id, e.target.value)} aria-label="Nombre de la unidad" />
                <button className="icon-btn" onClick={() => removeUnit(u.id)} aria-label={`Quitar la unidad ${u.name}`} title="Quitar unidad"><Icon name="close" size={16} /></button>
              </div>
              {!closed.has(u.id) && (
                <>
                  {u.topics.map((t) => (
                    <div key={t.id} className="og-topic" onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => drop({ unit: u.id, topic: t.id })}>
                      <div className="og-thead">
                        <Icon name="grip" size={16} color="#9AA0A6" />
                        <input className="og-input og-tname" value={t.name} maxLength={80} onChange={(e) => renameTopic(u.id, t.id, e.target.value)} aria-label="Nombre del tema" />
                        <button className="icon-btn" onClick={() => removeTopic(u.id, t.id)} aria-label={`Quitar el tema ${t.name}`} title="Quitar tema"><Icon name="close" size={16} /></button>
                      </div>
                      {t.docs.map(docRow)}
                      {!t.docs.length && <span className="og-empty">Arrastra aquí un documento o muévelo con la flecha.</span>}
                    </div>
                  ))}
                  <button className="og-add" onClick={() => setDialog({ topicIn: u.id })}><Icon name="plus" size={16} />Tema</button>
                </>
              )}
            </section>
          ))}
          <button className="og-add og-add-unit" onClick={() => setDialog('unit')}><Icon name="plus" size={18} />Unidad</button>
        </div>

        <aside className="og-side">
          <div className="card og-sum">
            <div className="og-stats"><div><b>{c.units}</b>unidades</div><div><b>{c.topics}</b>temas</div><div><b>{c.docs + c.loose}</b>docs</div></div>
            <button className="og-create" onClick={onCreate} disabled={busy || (!c.docs && !c.loose)}><Icon name="check" size={20} color="#FFFFFF" strokeWidth={3} />Crear organización</button>
            <button className="og-sec" onClick={onRedo} disabled={busy}><Icon name="restore" size={18} />Rehacer propuesta</button>
            <button className="og-sec og-cancel" onClick={onCancel} disabled={busy}>Cancelar</button>
          </div>
          <div className="og-loose" onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => drop('loose')}>
            <b>Sin clasificar</b>
            <span className="muted og-loose-hint">Irán a los Recursos de la asignatura.</span>
            {review.loose.map(docRow)}
            {!review.loose.length && <span className="og-empty">Nada por clasificar.</span>}
          </div>
        </aside>
      </div>

      {dialog === 'unit' && <NameDialog title="Nombre de la unidad" placeholder="Fundamentos" onSubmit={addUnit} onClose={() => setDialog(null)} />}
      {dialog?.topicIn && <NameDialog title="Nombre del tema" placeholder="Introducción" onSubmit={(n) => addTopic(dialog.topicIn, n)} onClose={() => setDialog(null)} />}
    </div>
  )
}
