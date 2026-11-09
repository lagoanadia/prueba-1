import { useState } from 'react'
import DocEditor from '../../components/DocEditor.jsx'
import FileFrame from '../../components/FileFrame.jsx'
import Icon from '../../components/Icon.jsx'
import { legacyToHtml } from '../../lib/richText.js'
import { useFocusMode } from '../../screens/focus.js'
import ResourceFrames from './ResourceFrames.jsx'
import { changeSubject, changeUnit, practicesOf, soft } from './helpers.js'

const NEXT = { todo: 'doing', doing: 'clear', clear: 'todo' }
const TABS = [['estudio', 'split', 'Temario y apuntes'], ['recursos', 'link', 'Recursos'], ['practicas', 'code', 'Prácticas']]
const notesHtml = (data, topicId) => { const n = data.notes?.[topicId]; return Array.isArray(n) ? legacyToHtml(n) : (n ?? '') }

/**
 * Unidad en modo concentración: pestañas arriba y, debajo, el PDF a un lado y el documento al otro.
 * El panel de la izquierda (icono del árbol) lista las unidades y sus temas para cambiar sin salir.
 */
export default function UnitWorkspace({ data, update, subject, unit, route, go, back }) {
  useFocusMode(true)
  const [panel, setPanel] = useState(true)
  const [topicName, setTopicName] = useState('')
  const [practiceName, setPracticeName] = useState('')
  const [unitName, setUnitName] = useState('')
  const tab = route.tab ?? 'estudio'
  const practices = practicesOf(unit)
  const topic = unit.topics.find((t) => t.id === route.itemId) ?? unit.topics[0]
  const practice = practices.find((p) => p.id === route.itemId) ?? practices[0]

  const changeU = (fn) => changeUnit(update, subject.id, unit.id, fn)
  const setPractices = (fn) => changeU((u) => ({ ...u, practices: fn(practicesOf(u)) }))
  const patchPractice = (id, patch) => setPractices((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const cycle = (unitId, topicId) => changeUnit(update, subject.id, unitId, (u) => ({ ...u, topics: u.topics.map((t) => (t.id === topicId ? { ...t, state: NEXT[t.state] } : t)) }))
  const addTopic = (e) => {
    e.preventDefault()
    if (!topicName.trim()) return
    const id = crypto.randomUUID()
    changeU((u) => ({ ...u, topics: [...u.topics, { id, name: topicName.trim(), state: 'todo' }] }))
    setTopicName('')
    go({ ...route, tab: 'estudio', itemId: id })
  }
  const addPractice = (e) => {
    e.preventDefault()
    if (!practiceName.trim()) return
    const id = crypto.randomUUID()
    setPractices((l) => [...l, { id, name: practiceName.trim(), done: false }])
    setPracticeName('')
    go({ ...route, tab: 'practicas', itemId: id })
  }
  const addUnit = (e) => {
    e.preventDefault()
    const id = crypto.randomUUID()
    changeSubject(update, subject.id, (s) => ({ ...s, units: [...s.units, { id, name: unitName.trim() || `Bloque ${s.units.length + 1}`, topics: [] }] }))
    setUnitName('')
    go({ ...route, unitId: id, tab: 'estudio', itemId: null })
  }
  const rename = (unitId, name) => changeUnit(update, subject.id, unitId, (u) => ({ ...u, name: name.trim() || u.name }))
  const removeTopic = (id) => { changeU((u) => ({ ...u, topics: u.topics.filter((t) => t.id !== id) })); go({ ...route, itemId: null }) }
  const removePractice = (id) => { setPractices((l) => l.filter((p) => p.id !== id)); go({ ...route, itemId: null }) }

  return (
    <div className="ws">
      <div className="ws-top">
        <button className={`icon-btn ws-toggle ${panel ? 'is-open' : ''}`} onClick={() => setPanel(!panel)} aria-label={panel ? 'Ocultar unidades' : 'Mostrar unidades'} aria-expanded={panel} title={panel ? 'Ocultar unidades' : 'Mostrar unidades'}><Icon name="tree" /></button>
      </div>

      <div className="ws-body">
        {panel && (
          <aside className="card ws-panel" aria-label="Unidades">
            <b className="ws-subject" style={{ borderColor: soft(subject.color) }}>{subject.short}</b>
            {subject.units.map((u) => {
              const on = u.id === unit.id
              return (
                <div key={u.id} className={`ws-unit ${on ? 'is-on' : ''}`}>
                  <input className="ws-unit-name" defaultValue={u.name} maxLength={40} aria-label="Nombre de la unidad" onFocus={() => !on && go({ ...route, unitId: u.id, itemId: null })} onBlur={(e) => rename(u.id, e.target.value)} />
                  {u.topics.map((t) => (
                    <div key={t.id} className={`ws-item ${on && tab === 'estudio' && topic?.id === t.id ? 'is-sel' : ''}`}>
                      <button className="state-btn" onClick={() => cycle(u.id, t.id)} aria-label={`Estado de «${t.name}»: ${t.state === 'clear' ? 'claro' : t.state === 'doing' ? 'en curso' : 'sin empezar'}`} title="Cambiar estado">
                        <Icon name={t.state === 'clear' ? 'check' : 'clock'} size={16} color={t.state === 'clear' ? '#3DDC97' : t.state === 'doing' ? '#3185FC' : '#9AA0A6'} />
                      </button>
                      <button className="ws-item-name w-ellipsis" onClick={() => go({ ...route, unitId: u.id, tab: 'estudio', itemId: t.id })}>{t.name}</button>
                      {on && <button className="prio-x" onClick={() => removeTopic(t.id)} aria-label={`Quitar «${t.name}»`}><Icon name="close" size={14} /></button>}
                    </div>
                  ))}
                  {practicesOf(u).map((p) => (
                    <div key={p.id} className={`ws-item ${on && tab === 'practicas' && practice?.id === p.id ? 'is-sel' : ''}`}>
                      <Icon name="code" size={16} color={p.done ? '#3DDC97' : '#9AA0A6'} />
                      <button className="ws-item-name w-ellipsis" onClick={() => go({ ...route, unitId: u.id, tab: 'practicas', itemId: p.id })}>{p.name}</button>
                    </div>
                  ))}
                  {on && (
                    <>
                      <form className="ws-add" onSubmit={addTopic}><Icon name="plus" size={16} /><input placeholder="Tema" value={topicName} onChange={(e) => setTopicName(e.target.value)} maxLength={80} aria-label="Nuevo tema" /></form>
                      <form className="ws-add" onSubmit={addPractice}><Icon name="code" size={16} /><input placeholder="Práctica" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} maxLength={80} aria-label="Nueva práctica" /></form>
                    </>
                  )}
                </div>
              )
            })}
            <form className="ws-add" onSubmit={addUnit}><Icon name="plus" size={16} /><input placeholder="Nueva unidad" value={unitName} onChange={(e) => setUnitName(e.target.value)} maxLength={40} aria-label="Nueva unidad" /></form>
          </aside>
        )}

        <div className="ws-main">
          <div className="ws-tabs" role="tablist">
            <button className="icon-btn" onClick={back} aria-label="Volver a la asignatura" title="Volver"><Icon name="back" size={20} /></button>
            {TABS.map(([id, icon, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`ws-tab ${tab === id ? 'on' : ''}`} onClick={() => go({ ...route, tab: id, itemId: null })}>
                <Icon name={icon} size={18} />{label}
              </button>
            ))}
          </div>

          {tab === 'estudio' && (
            topic ? (
              <div className="ws-split">
                <FileFrame file={unit.temario ?? null} onChange={(f) => changeU((u) => ({ ...u, temario: f }))} label="Subir el temario (PDF)" />
                <DocEditor key={topic.id} label={`Apuntes de ${topic.name}`} html={notesHtml(data, topic.id)} status="Se guarda solo"
                  onChange={(html) => update((d) => ({ ...d, notes: { ...(d.notes ?? {}), [topic.id]: html } }))} />
              </div>
            ) : <p className="muted ws-empty">Añade un tema en el panel para empezar a tomar apuntes.</p>
          )}

          {tab === 'recursos' && <ResourceFrames data={data} update={update} subjectId={subject.id} unitId={unit.id} />}

          {tab === 'practicas' && (
            practice ? (
              <>
                <div className="ws-practice-bar">
                  <button className={`icon-btn ${practice.done ? 'on' : ''}`} onClick={() => patchPractice(practice.id, { done: !practice.done })} aria-pressed={practice.done} aria-label="Marcar como hecha" title="Marcar como hecha"><Icon name="check" size={20} /></button>
                  <input className="ws-practice-name" value={practice.name} aria-label="Nombre de la práctica" maxLength={80} onChange={(e) => patchPractice(practice.id, { name: e.target.value })} />
                  <button className="icon-btn" onClick={() => removePractice(practice.id)} aria-label="Quitar práctica" title="Quitar"><Icon name="trash" size={20} /></button>
                </div>
                <div className="ws-split">
                  <FileFrame file={practice.statement ?? null} onChange={(f) => patchPractice(practice.id, { statement: f })} label="Subir el enunciado (PDF)" />
                  <DocEditor key={practice.id} label={`Solución de ${practice.name}`} html={practice.doc ?? ''} status="Se guarda solo" onChange={(html) => patchPractice(practice.id, { doc: html })} />
                </div>
              </>
            ) : <p className="muted ws-empty">Añade una práctica en el panel: el enunciado en PDF a un lado y tu solución al otro.</p>
          )}
        </div>
      </div>
    </div>
  )
}
