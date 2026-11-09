import { useState } from 'react'
import { formatShort, todayISO } from '../lib/dates.js'
import { TOPIC_STATES, progressOf, subjectsOf } from '../widgets/estudios/study.js'

const CHIP = { todo: { label: 'Sin empezar', bg: '#F1F3F4', bd: '#DADCE0' }, doing: { label: 'En curso', bg: '#DDEBFE', bd: '#3185FC' }, clear: { label: 'Claro', bg: '#DDF8EC', bd: '#3DDC97' } }
const nextState = (s) => TOPIC_STATES[(TOPIC_STATES.findIndex((x) => x.id === s) + 1) % 3].id
const RES_TYPES = { pdf: 'PDF', doc: 'Documentación', video: 'Vídeo', web: 'Web', img: 'Imagen' }
// Solo enlaces http(s): evita que un enlace guardado ejecute código
const safeUrl = (u) => (/^https?:\/\//i.test(u ?? '') ? u : null)
const uid = () => crypto.randomUUID()

/** Cambia una asignatura dentro de los datos del tablero. */
const useSubjectEdit = (data, update, id) => (fn) => update((d) => ({ ...d, subjects: subjectsOf(d).map((s) => (s.id === id ? fn(s) : s)) }))
const mapUnit = (s, uidv, fn) => ({ ...s, units: s.units.map((u) => (u.id === uidv ? fn(u) : u)) })

function Back({ onClick, children }) {
  return <button className="st-back" onClick={onClick}>← {children}</button>
}

function Resources({ subject, change }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('web')
  const list = subject.resources ?? []
  const add = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    change((s) => ({ ...s, resources: [...(s.resources ?? []), { id: uid(), type, title: title.trim(), url: url.trim() }] }))
    setTitle('')
    setUrl('')
  }
  return (
    <>
      <div className="st-grid st-grid-sm">
        {list.map((r) => {
          const href = safeUrl(r.url)
          return (
            <div key={r.id} className="card st-card">
              <span className="st-eyebrow">{RES_TYPES[r.type] ?? 'Web'}</span>
              {href ? <a className="st-res-title" href={href} target="_blank" rel="noreferrer noopener">{r.title}</a> : <span className="st-res-title">{r.title}</span>}
              <button className="pill pill-sm st-end" onClick={() => change((s) => ({ ...s, resources: s.resources.filter((x) => x.id !== r.id) }))}>Quitar</button>
            </div>
          )
        })}
        {list.length === 0 && <p className="muted">Sin recursos todavía.</p>}
      </div>
      <form className="st-form" onSubmit={add}>
        <select className="pill-input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo">
          {Object.entries(RES_TYPES).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <input className="pill-input" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        <input className="pill-input" placeholder="https://… (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} />
        <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!title.trim()}>Añadir recurso</button>
      </form>
    </>
  )
}

/** Pantalla de una asignatura: progreso, próximas entregas, unidades y recursos. */
export function SubjectPage({ subject, data, update, nav }) {
  const change = useSubjectEdit(data, update, subject.id)
  const today = todayISO()
  const { total, clear, pct } = progressOf(subject)
  const due = (data.assignments ?? []).filter((a) => !a.done && a.course === subject.short).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4)
  const exercises = subject.units.flatMap((u) => u.exercises ?? [])
  const status = total && clear === total ? 'terminada' : clear || subject.units.some((u) => u.topics.some((t) => t.state === 'doing')) ? 'en curso' : 'sin empezar'
  const [unitName, setUnitName] = useState('')
  const addUnit = (e) => {
    e.preventDefault()
    if (!unitName.trim()) return
    change((s) => ({ ...s, units: [...s.units, { id: uid(), name: unitName.trim(), topics: [], exercises: [] }] }))
    setUnitName('')
  }
  const remove = () => {
    if (!window.confirm(`¿Eliminar ${subject.short} con todos sus temas y apuntes?`)) return
    update((d) => ({ ...d, subjects: subjectsOf(d).filter((s) => s.id !== subject.id), activeSubject: undefined }))
    nav.close()
  }

  return (
    <div className="page st">
      <Back onClick={nav.close}>Estudios</Back>
      <h1 className="st-h1">{subject.name}</h1>
      <input className="pill-input st-desc" aria-label="Descripción" placeholder="Añade una descripción" maxLength={160} value={subject.description ?? ''}
        onChange={(e) => change((s) => ({ ...s, description: e.target.value }))} />

      <div className="st-top">
        <section className="card st-progress" style={{ background: '#DDEBFE', boxShadow: 'none' }}>
          <span className="st-eyebrow" style={{ color: '#174EA6' }}>Progreso general</span>
          <span className="w-row"><span className="st-lead">{clear} de {total} temas claros</span><b className="st-pct">{pct} %</b></span>
          <span className="st-meter"><span style={{ width: `${pct}%`, background: '#3185FC' }} /></span>
          <span>Estado general: {status} · {subject.units.length} {subject.units.length === 1 ? 'unidad' : 'unidades'} · {exercises.length} {exercises.length === 1 ? 'práctica' : 'prácticas'}</span>
        </section>
        <section className="card st-card">
          <h2 className="st-h3">Próximas entregas</h2>
          {due.map((a) => <span key={a.id} className="w-row"><span>{a.title}</span><b className={a.due < today ? 'is-late' : ''}>{formatShort(a.due).replace(/^\S+ /, '')}</b></span>)}
          {due.length === 0 && <span className="muted">Nada pendiente.</span>}
        </section>
      </div>

      <h2 className="page-h2">Unidades</h2>
      <div className="st-grid">
        {subject.units.map((u) => {
          const done = u.topics.filter((t) => t.state === 'clear').length
          return (
            <button key={u.id} className="card st-card st-unit" onClick={() => nav.unit(u.id)}>
              <span className="w-row"><b className="st-h3">{u.name}</b><b>{done} de {u.topics.length}</b></span>
              <span className="st-meter st-meter-sm"><span style={{ width: `${u.topics.length ? (done / u.topics.length) * 100 : 0}%`, background: '#3185FC' }} /></span>
              {u.topics.slice(0, 5).map((t) => <span key={t.id} className="w-row"><span>{t.name}</span><span className="st-chip" style={{ background: CHIP[t.state].bg }}>{CHIP[t.state].label}</span></span>)}
              {u.topics.length > 5 && <span className="muted">y {u.topics.length - 5} más</span>}
              {u.topics.length === 0 && <span className="muted">Sin temas todavía</span>}
              <span className="st-link">Entrar en la unidad →</span>
            </button>
          )
        })}
      </div>
      <form className="st-form" onSubmit={addUnit}>
        <input className="pill-input" placeholder="Nueva unidad (UD3 · Nombre)" value={unitName} onChange={(e) => setUnitName(e.target.value)} maxLength={50} />
        <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!unitName.trim()}>Añadir unidad</button>
      </form>

      <h2 className="page-h2" style={{ marginTop: 32 }}>Recursos complementarios</h2>
      <Resources subject={subject} change={change} />
      <button className="pill st-danger" onClick={remove}>Eliminar asignatura</button>
    </div>
  )
}

/** Pantalla de una unidad: temario, apuntes, recursos y ejercicios. */
export function UnitPage({ subject, unit, data, update, nav }) {
  const change = useSubjectEdit(data, update, subject.id)
  const [tab, setTab] = useState('tem')
  const [topic, setTopic] = useState('')
  const [exercise, setExercise] = useState('')
  const exercises = unit.exercises ?? []
  const clear = unit.topics.filter((t) => t.state === 'clear').length
  const cycle = (tid) => change((s) => mapUnit(s, unit.id, (u) => ({ ...u, topics: u.topics.map((t) => (t.id === tid ? { ...t, state: nextState(t.state) } : t)) })))
  const addTopic = (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    change((s) => mapUnit(s, unit.id, (u) => ({ ...u, topics: [...u.topics, { id: uid(), name: topic.trim(), state: 'todo' }] })))
    setTopic('')
  }
  const removeTopic = (tid) => change((s) => mapUnit(s, unit.id, (u) => ({ ...u, topics: u.topics.filter((t) => t.id !== tid) })))
  const setExercises = (fn) => change((s) => mapUnit(s, unit.id, (u) => ({ ...u, exercises: fn(u.exercises ?? []) })))
  const TABS = [['tem', 'Temario'], ['apu', 'Apuntes'], ['rec', 'Recursos'], ['eje', 'Ejercicios']]
  const withNotes = unit.topics.filter((t) => t.notes?.length)

  return (
    <div className="page st">
      <div className="page-head">
        <div>
          <Back onClick={nav.subject}>{subject.name}</Back>
          <h1 className="st-h1">{unit.name}</h1>
          <p className="muted page-sub">{clear} de {unit.topics.length} temas claros · {exercises.filter((e) => e.done).length} de {exercises.length} ejercicios hechos</p>
        </div>
        <button className="btn-solid" style={{ '--c': '#3185FC' }} onClick={() => nav.editor(unit.topics[0]?.id)} disabled={unit.topics.length === 0}>Abrir editor de apuntes</button>
      </div>

      <div className="st-tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={`pill ${tab === id ? 'pill-soft' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'tem' && (
        <section className="card st-list">
          <p className="muted">Pulsa el estado de un tema para cambiarlo.</p>
          {unit.topics.map((t, i) => (
            <div key={t.id} className="st-row">
              <span className="st-n">{i + 1}</span>
              <span className="st-name">{t.name}</span>
              <button className="pill" style={{ background: CHIP[t.state].bg, borderColor: CHIP[t.state].bd }} onClick={() => cycle(t.id)}>{CHIP[t.state].label}</button>
              <button className="prio-x" onClick={() => removeTopic(t.id)} aria-label={`Quitar ${t.name}`}>×</button>
            </div>
          ))}
          <form className="st-form" onSubmit={addTopic}>
            <input className="pill-input" placeholder="Nuevo tema" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} />
            <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!topic.trim()}>Añadir tema</button>
          </form>
        </section>
      )}

      {tab === 'apu' && (
        <div className="st-notes">
          {withNotes.map((t) => (
            <section key={t.id} className="card st-note">
              <span className="st-eyebrow">Mis apuntes · Tema {unit.topics.indexOf(t) + 1}</span>
              <Blocks blocks={t.notes} />
              <button className="pill st-end" onClick={() => nav.editor(t.id)}>Editar</button>
            </section>
          ))}
          {withNotes.length === 0 && <p className="muted">Aún no tienes apuntes en esta unidad. Abre el editor para empezar.</p>}
        </div>
      )}

      {tab === 'rec' && <Resources subject={subject} change={change} />}

      {tab === 'eje' && (
        <section className="card st-list">
          {exercises.map((e) => (
            <label key={e.id} className="st-row st-check">
              <input type="checkbox" checked={e.done} onChange={() => setExercises((l) => l.map((x) => (x.id === e.id ? { ...x, done: !x.done } : x)))} />
              <span className="st-name" style={{ textDecoration: e.done ? 'line-through' : 'none' }}>{e.name}</span>
              <span className="muted">{e.done ? 'Hecho' : 'Pendiente'}</span>
              <button type="button" className="prio-x" onClick={() => setExercises((l) => l.filter((x) => x.id !== e.id))} aria-label={`Quitar ${e.name}`}>×</button>
            </label>
          ))}
          {exercises.length === 0 && <p className="muted">Sin ejercicios todavía.</p>}
          <form className="st-form" onSubmit={(ev) => { ev.preventDefault(); if (!exercise.trim()) return; setExercises((l) => [...l, { id: uid(), name: exercise.trim(), done: false }]); setExercise('') }}>
            <input className="pill-input" placeholder="Nuevo ejercicio o práctica" value={exercise} onChange={(e) => setExercise(e.target.value)} maxLength={90} />
            <button className="btn-solid" style={{ '--c': '#3185FC' }} disabled={!exercise.trim()}>Añadir</button>
          </form>
        </section>
      )}
    </div>
  )
}

/** Apuntes de solo lectura. */
function Blocks({ blocks }) {
  return blocks.map((b) => {
    if (b.type === 'title') return <h2 key={b.id} className="st-b-title">{b.text}</h2>
    if (b.type === 'sub') return <h3 key={b.id} className="st-b-sub">{b.text}</h3>
    if (b.type === 'text') return <p key={b.id} className="st-b-text">{b.text}</p>
    if (b.type === 'list') return <ul key={b.id} className="st-b-list">{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    if (b.type === 'high') return <div key={b.id} className="st-b-high">{b.text}</div>
    if (b.type === 'image') return <Figure key={b.id} b={b} />
    if (b.type === 'scheme') return <Figure key={b.id} b={b}><Scheme nodes={b.nodes} /></Figure>
    return null
  })
}
function Figure({ b, children, bare }) {
  const src = safeUrl(b.url)
  return <figure className="st-fig">{children ?? (src ? <img src={src} alt={b.text} /> : <div className="st-img-empty">Sin imagen</div>)}{!bare && <figcaption>{b.text}</figcaption>}</figure>
}
/** Esquema: cajas unidas por flechas. */
function Scheme({ nodes = [] }) {
  return <div className="st-scheme" role="img" aria-label={`Esquema: ${nodes.join(', ')}`}>{nodes.map((n, i) => <span key={i} className="st-scheme-row"><span className="st-node">{n}</span>{i < nodes.length - 1 && <span className="st-arrow" aria-hidden="true">→</span>}</span>)}</div>
}

/** Texto editable: guarda al salir del campo. */
function Editable({ as: Tag = 'p', value, onCommit, label, ...rest }) {
  return <Tag {...rest} contentEditable suppressContentEditableWarning role="textbox" aria-label={label} onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v !== value) onCommit(v) }}>{value}</Tag>
}

const NEW_BLOCK = {
  title: () => ({ type: 'title', text: 'Nuevo título' }),
  sub: () => ({ type: 'sub', text: 'Nuevo subtítulo' }),
  text: () => ({ type: 'text', text: 'Escribe aquí tus apuntes.' }),
  list: () => ({ type: 'list', items: ['Primer punto', 'Segundo punto', 'Tercer punto'] }),
  high: () => ({ type: 'high', text: 'Idea clave: escribe aquí lo más importante.' }),
  image: () => ({ type: 'image', text: 'Pie de imagen: describe lo que se ve.', url: '' }),
  scheme: () => ({ type: 'scheme', text: 'Esquema: añade una explicación breve.', nodes: ['Inicio', 'Paso', 'Final'] }),
}
const ADD = [['title', 'Título'], ['sub', 'Subtítulo'], ['text', 'Texto'], ['list', 'Lista'], ['high', 'Destacado'], ['image', 'Imagen'], ['scheme', 'Esquema']]

/** Editor de apuntes por bloques de un tema. Se guarda con «Guardar apuntes». */
export function EditorPage({ subject, unit, topicId, data, update, nav }) {
  const change = useSubjectEdit(data, update, subject.id)
  const topic = unit.topics.find((t) => t.id === topicId) ?? unit.topics[0]
  const [blocks, setBlocks] = useState(topic?.notes ?? [])
  const [saved, setSaved] = useState(true)
  if (!topic) return <div className="page st"><Back onClick={() => nav.unit(unit.id)}>{unit.name}</Back><p className="muted">Esta unidad aún no tiene temas.</p></div>

  const edit = (fn) => { setBlocks(fn); setSaved(false) }
  const set = (id, patch) => edit((l) => l.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const move = (i, d) => edit((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n })
  const save = () => { change((s) => mapUnit(s, unit.id, (u) => ({ ...u, topics: u.topics.map((t) => (t.id === topic.id ? { ...t, notes: blocks } : t)) }))); setSaved(true) }
  const pickTopic = (id) => {
    if (!saved && !window.confirm('Hay cambios sin guardar. ¿Cambiar de tema y descartarlos?')) return
    nav.editor(id)
  }

  return (
    <div className="page st" key={topic.id}>
      <div className="page-head">
        <div>
          <Back onClick={() => nav.unit(unit.id)}>{unit.name}</Back>
          <h1 className="st-h1">Editor de apuntes</h1>
          <p className="muted page-sub">{subject.name} · <select className="st-select" value={topic.id} onChange={(e) => pickTopic(e.target.value)} aria-label="Tema">{unit.topics.map((t, i) => <option key={t.id} value={t.id}>Tema {i + 1}: {t.name}</option>)}</select></p>
        </div>
        <div className="page-actions"><span className="muted" role="status">{saved ? 'Guardado' : 'Cambios sin guardar'}</span><button className="btn-solid" style={{ '--c': '#3185FC' }} onClick={save} disabled={saved}>Guardar apuntes</button></div>
      </div>

      <div className="card st-toolbar">
        <span className="st-eyebrow">Añadir</span>
        {ADD.map(([type, label]) => <button key={type} className="pill pill-sm" style={type === 'high' ? { background: '#FDF5CE', borderColor: '#F9DC5C' } : undefined} onClick={() => edit((l) => [...l, { id: uid(), ...NEW_BLOCK[type]() }])}>{label}</button>)}
      </div>

      <section className="card st-note" aria-label="Apuntes">
        {blocks.length === 0 && <p className="muted">Vacío. Añade un bloque con los botones de arriba.</p>}
        {blocks.map((b, i) => (
          <div key={b.id} className="st-block">
            <div className="st-block-tools">
              <button className="pill pill-sm" onClick={() => move(i, -1)} disabled={i === 0}>Subir</button>
              <button className="pill pill-sm" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>Bajar</button>
              <button className="pill pill-sm" onClick={() => edit((l) => l.filter((x) => x.id !== b.id))}>Quitar</button>
            </div>
            {b.type === 'title' && <Editable as="h2" className="st-b-title" label="Título" value={b.text} onCommit={(text) => set(b.id, { text })} />}
            {b.type === 'sub' && <Editable as="h3" className="st-b-sub" label="Subtítulo" value={b.text} onCommit={(text) => set(b.id, { text })} />}
            {b.type === 'text' && <Editable className="st-b-text" label="Texto" value={b.text} onCommit={(text) => set(b.id, { text })} />}
            {b.type === 'high' && <Editable as="div" className="st-b-high" label="Destacado" value={b.text} onCommit={(text) => set(b.id, { text })} />}
            {b.type === 'list' && (
              <>
                <ul className="st-b-list">{b.items.map((t, k) => <Editable key={k} as="li" label={`Punto ${k + 1}`} value={t} onCommit={(v) => set(b.id, { items: v ? b.items.map((x, n) => (n === k ? v : x)) : b.items.filter((_, n) => n !== k) })} />)}</ul>
                <button className="pill pill-sm st-end" onClick={() => set(b.id, { items: [...b.items, 'Nuevo punto'] })}>+ Punto</button>
              </>
            )}
            {b.type === 'image' && (
              <>
                <input className="pill-input" placeholder="Enlace de la imagen (https://…)" aria-label="Enlace de la imagen" value={b.url ?? ''} onChange={(e) => set(b.id, { url: e.target.value })} maxLength={400} />
                <Figure b={b} bare />
                <Editable as="p" className="st-cap" label="Pie de imagen" value={b.text} onCommit={(text) => set(b.id, { text })} />
              </>
            )}
            {b.type === 'scheme' && (
              <>
                <Figure b={b} bare><Scheme nodes={b.nodes} /></Figure>
                <div className="st-nodes">
                  {b.nodes.map((n, k) => <input key={k} className="pill-input" aria-label={`Caja ${k + 1}`} value={n} maxLength={30} onChange={(e) => set(b.id, { nodes: b.nodes.map((x, m) => (m === k ? e.target.value : x)) })} />)}
                  <button className="pill pill-sm" onClick={() => set(b.id, { nodes: [...b.nodes, 'Nueva caja'] })}>+ Caja</button>
                  {b.nodes.length > 1 && <button className="pill pill-sm" onClick={() => set(b.id, { nodes: b.nodes.slice(0, -1) })}>− Caja</button>}
                </div>
                <Editable as="p" className="st-cap" label="Explicación" value={b.text} onCommit={(text) => set(b.id, { text })} />
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
