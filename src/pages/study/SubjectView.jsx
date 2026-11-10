import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import { TOPIC_STATES } from '../../widgets/estudios/study.js'
import Deliveries from './Deliveries.jsx'
import OrganizeDrop from './OrganizeDrop.jsx'
import OrganizeReview from './OrganizeReview.jsx'
import ResourceFrames from './ResourceFrames.jsx'
import { applyReview, buildReview, countReview, fallbackProposal } from './organize.js'
import { deleteFile } from '../../lib/fileStore.js'
import { proposeOrganization } from '../../services/organizeService.js'
import { METRICS, SUBJECT_PALETTE, changeSubject, metricsOf, practicesOf, progressFor, soft, unitProgress } from './helpers.js'

/** Estado de una unidad según sus temas. */
function unitState(u) {
  const { clear, total } = unitProgress(u)
  if (total && clear === total) return { label: 'Terminada', color: '#3DDC97' }
  if (clear || u.topics.some((t) => t.state === 'doing')) return { label: 'En curso', color: '#3185FC' }
  return { label: 'Sin empezar', color: '#DADCE0' }
}

/** Página de una asignatura: progreso a tu medida, entregas, unidades y recursos. */
export default function SubjectView({ data, update, subject, back, openUnit, onDelete }) {
  const [dialog, setDialog] = useState(null) // null | 'new' | { rename: unitId }
  const [review, setReview] = useState(null) // propuesta de organización en revisión
  const [reviewMsg, setReviewMsg] = useState('')
  const [docsText, setDocsText] = useState([]) // lo leído de cada documento (para «Rehacer propuesta»)
  const [busy, setBusy] = useState(false)
  const [palette, setPalette] = useState(false) // selector de color de la asignatura
  const [banner, setBanner] = useState('')
  const subjects = data.subjects ?? []
  const p = progressFor(subject, data.assignments)
  const toggleMetric = (k) => changeSubject(update, subject.id, (s) => ({ ...s, metrics: { ...metricsOf(s), [k]: !metricsOf(s)[k] } }))
  const addUnit = (name) => { changeSubject(update, subject.id, (s) => ({ ...s, units: [...s.units, { id: crypto.randomUUID(), name, topics: [] }] })); setDialog(null) }
  const removeUnit = (id) => { changeSubject(update, subject.id, (s) => ({ ...s, units: s.units.filter((u) => u.id !== id) })); setDialog(null) }
  const renameUnit = (id, name) => { changeSubject(update, subject.id, (s) => ({ ...s, units: s.units.map((u) => (u.id === id ? { ...u, name } : u)) })); setDialog(null) }
  const startReview = (r, msg, docs) => { setReview(r); setReviewMsg(msg); setDocsText(docs) }
  const cancelReview = () => { Object.values(review.docs).forEach((d) => deleteFile(d.file.id).catch(() => {})); setReview(null) }
  const redo = async () => {
    setBusy(true)
    const docs = docsText.filter((d) => review.docs[d.id])
    let result
    let msg = ''
    try { result = await proposeOrganization(subject.name, docs.map((d) => ({ id: d.id, name: d.file.name, pages: d.pages, text: d.text }))); if (!result?.units) throw new Error('bad') } catch { result = fallbackProposal(docs); msg = 'La IA no está disponible ahora: organización básica por los nombres de los archivos.' }
    setReview(buildReview(result, docs)); setReviewMsg(msg); setBusy(false)
  }
  const create = () => {
    const { units, resources } = applyReview(review, subject.id)
    const c = countReview(review)
    changeSubject(update, subject.id, (s) => {
      const empty = s.units.every((u) => !u.topics.length && !practicesOf(u).length && !u.temario) // solo unidades vacías: se sustituyen
      return units.length ? { ...s, units: empty ? units : [...s.units, ...units] } : s
    })
    if (resources.length) update((d) => ({ ...d, resources: [...(d.resources ?? []), ...resources] }))
    setReview(null)
    setBanner(`Creado: ${c.units} unidades, ${c.topics} temas y ${c.docs} documentos${c.loose ? ` (+ ${c.loose} en Recursos)` : ''}.`)
    setTimeout(() => setBanner(''), 9000)
  }
  const R = 46
  const C = 2 * Math.PI * R

  return (
    <div className="page study">
      <header className="page-head">
        <div className="head-line">
          <button className="icon-btn" onClick={back} aria-label="Volver a Estudios" title="Volver"><Icon name="back" /></button>
          <h1>{subject.name}</h1>
          <div className="sc-wrap">
            <button className="sc-dot" style={{ background: subject.color, '--c': subject.color }} onClick={() => setPalette(!palette)} aria-expanded={palette} aria-label="Cambiar el color de la asignatura" title="Cambiar color" />
            {palette && (
              <>
                <div className="sc-back" onClick={() => setPalette(false)} />
                <div className="card sc-pop" role="listbox" aria-label="Colores">
                  {SUBJECT_PALETTE.map((c) => (
                    <button key={c} role="option" aria-selected={c === subject.color} className={`sc-opt ${c === subject.color ? 'on' : ''}`} style={{ background: c }} aria-label={`Color ${c}`}
                      onClick={() => { changeSubject(update, subject.id, (x) => ({ ...x, color: c })); setPalette(false) }}>
                      {c === subject.color && <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3.2} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <button className="icon-btn" onClick={() => { if (window.confirm(`¿Eliminar ${subject.short} con todo su contenido?`)) onDelete() }} aria-label="Eliminar asignatura" title="Eliminar asignatura"><Icon name="trash" /></button>
      </header>

      {banner && <p className="og-banner" role="status"><Icon name="check" size={20} color="#0F6B45" strokeWidth={3} />{banner}</p>}
      {review ? <OrganizeReview review={review} setReview={setReview} message={reviewMsg} busy={busy} onCreate={create} onRedo={redo} onCancel={cancelReview} /> : (<>
      <div className="study-mid subject-top">
        <section className="card progress-card" style={{ background: soft(subject.color, 28), boxShadow: 'none' }}>
          <svg className="ring-svg" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Progreso ${p.pct} %`}>
            <circle cx="60" cy="60" r={R} fill="none" stroke={soft(subject.color, 40)} strokeWidth="14" />
            {p.pct > 0 && <circle cx="60" cy="60" r={R} fill="none" stroke={subject.color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(p.pct / 100) * C} ${C}`} transform="rotate(-90 60 60)" />}
            <text x="60" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="#202124">{p.pct} %</text>
          </svg>
          <div className="progress-def">
            <span className="muted">¿Qué cuenta en tu progreso?</span>
            <div className="metric-chips">
              {Object.entries(METRICS).map(([k, m]) => (
                <button key={k} className={`seg-chip ${p.on[k] ? 'on' : ''}`} aria-pressed={p.on[k]} onClick={() => toggleMetric(k)}>{m.label}</button>
              ))}
            </div>
          </div>
        </section>
        <section className="card deliv-card"><Deliveries data={data} update={update} subjects={subjects} course={subject.short} /></section>
      </div>

      <OrganizeDrop subjectName={subject.name} onReview={startReview} />

      <div className="head-line unit-head">
        <h2 className="page-h2">Unidades</h2>
        <button className="icon-btn on" onClick={() => setDialog('new')} aria-label="Añadir unidad" title="Añadir unidad"><Icon name="plus" size={20} /></button>
      </div>
      <div className="unit-cards">
        {subject.units.map((u, i) => {
          const up = unitProgress(u)
          const st = unitState(u)
          return (
            <div key={u.id} className="unit-wrap" style={{ '--i': i }}>
            <button className="card unit-card unit-btn" onClick={() => openUnit(u.id)}>
              <span className="w-row"><b className="unit-title">{u.name}</b><b>{up.clear} de {up.total}</b></span>
              <span className="bar"><span style={{ width: `${up.total ? (up.clear / up.total) * 100 : 0}%`, background: subject.color }} /></span>
              <span className="state-chip" style={{ background: soft(st.color, 35) }}>{st.label}</span>
              {u.topics.slice(0, 4).map((t) => <span key={t.id} className="w-row unit-topic"><span className="w-ellipsis">{t.name}</span><Icon name={t.state === 'clear' ? 'check' : 'clock'} size={16} color={TOPIC_STATES.find((x) => x.id === t.state)?.id === 'clear' ? '#3DDC97' : '#9AA0A6'} /></span>)}
            </button>
            <button className="icon-btn unit-edit" onClick={() => setDialog({ rename: u.id })} aria-label={`Cambiar el nombre de ${u.name}`} title="Editar unidad"><Icon name="pen" size={16} /></button>
            </div>
          )
        })}
      </div>
      {dialog === 'new' && <NameDialog title="Nombre de la unidad" placeholder="Hilos y concurrencia" onSubmit={addUnit} onClose={() => setDialog(null)} />}
      {dialog?.rename && <NameDialog title="Nombre de la unidad" initial={subject.units.find((u) => u.id === dialog.rename)?.name} onSubmit={(n) => renameUnit(dialog.rename, n)} onDelete={() => removeUnit(dialog.rename)} deleteLabel="Eliminar unidad" deleteWarning="Se borrarán todos sus temas, apuntes y prácticas. No se puede deshacer." onClose={() => setDialog(null)} />}

      <h2 className="page-h2 page-gap">Recursos</h2>
      <ResourceFrames data={data} update={update} subjectId={subject.id} />
      </>)}
    </div>
  )
}
