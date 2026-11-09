import { useState } from 'react'
import BlockEditor from '../../components/BlockEditor.jsx'
import FileFrame from '../../components/FileFrame.jsx'
import Icon from '../../components/Icon.jsx'
import NameDialog from '../../components/NameDialog.jsx'
import { toDoc } from '../../lib/docModel.js'
import { useFocusMode, usePanelOpen } from '../../screens/focus.js'
import ResourceFrames from './ResourceFrames.jsx'
import { changeSubject, changeUnit, practicesOf, soft } from './helpers.js'

const NEXT = { todo: 'doing', doing: 'clear', clear: 'todo' }
// Orden de las pestañas: Temario y apuntes · Prácticas · Recursos (al final)
const TABS = [['estudio', 'split', 'Temario y apuntes'], ['practicas', 'code', 'Prácticas'], ['recursos', 'link', 'Recursos']]
const LAYOUTS = [['pdf', 'pdf', 'PDF grande'], ['split', 'split', 'PDF y apuntes'], ['doc', 'doc', 'Apuntes grandes']]

/**
 * Unidad en modo concentración. El panel de la izquierda solo sirve para cambiar de unidad;
 * los temas y las prácticas se crean y cambian aquí, en la pantalla de Temario y apuntes / Prácticas.
 */
export default function UnitWorkspace({ data, update, subject, unit, route, go, back }) {
  useFocusMode(true)
  const panel = usePanelOpen()
  const [dialog, setDialog] = useState(null) // 'topic' | 'practice' | 'unit' | { rename: unitId }
  const [layout, setLayout] = useState('split')
  const tab = route.tab ?? 'estudio'
  const practices = practicesOf(unit)
  const topic = unit.topics.find((t) => t.id === route.itemId) ?? unit.topics[0]
  const practice = practices.find((p) => p.id === route.itemId) ?? practices[0]

  const changeU = (fn) => changeUnit(update, subject.id, unit.id, fn)
  const setPractices = (fn) => changeU((u) => ({ ...u, practices: fn(practicesOf(u)) }))
  const patchPractice = (id, patch) => setPractices((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const cycle = (topicId) => changeU((u) => ({ ...u, topics: u.topics.map((t) => (t.id === topicId ? { ...t, state: NEXT[t.state] } : t)) }))
  const addTopic = (name) => { const id = crypto.randomUUID(); changeU((u) => ({ ...u, topics: [...u.topics, { id, name, state: 'todo' }] })); setDialog(null); go({ ...route, tab: 'estudio', itemId: id }) }
  const addPractice = (name) => { const id = crypto.randomUUID(); setPractices((l) => [...l, { id, name, done: false }]); setDialog(null); go({ ...route, tab: 'practicas', itemId: id }) }
  const addUnit = (name) => { const id = crypto.randomUUID(); changeSubject(update, subject.id, (s) => ({ ...s, units: [...s.units, { id, name, topics: [] }] })); setDialog(null); go({ ...route, unitId: id, tab: 'estudio', itemId: null }) }
  const renameUnit = (id, name) => { changeUnit(update, subject.id, id, (u) => ({ ...u, name })); setDialog(null) }
  const removeTopic = (id) => { if (!window.confirm('¿Quitar este tema y sus apuntes?')) return; changeU((u) => ({ ...u, topics: u.topics.filter((t) => t.id !== id) })); go({ ...route, itemId: null }) }
  const removePractice = (id) => { if (!window.confirm('¿Quitar esta práctica?')) return; setPractices((l) => l.filter((p) => p.id !== id)); go({ ...route, itemId: null }) }

  // Son funciones (no componentes): así React no vuelve a montar el editor cada vez que se pinta
  const layouts = () => (
    <div className="layouts" role="radiogroup" aria-label="Tamaño de las ventanas">
      {LAYOUTS.map(([id, icon, label]) => (
        <button key={id} role="radio" aria-checked={layout === id} className={`icon-btn ${layout === id ? 'on' : ''}`} title={label} aria-label={label} onClick={() => setLayout(id)}><Icon name={icon} size={18} /></button>
      ))}
    </div>
  )
  const split = (left, right) => (
    <div className={`ws-split ws-${layout}`}>
      {layout !== 'doc' && left}
      {layout !== 'pdf' && right}
    </div>
  )

  return (
    <div className="ws">
      <div className="ws-body">
        {panel && (
          <aside className="card ws-panel" aria-label="Unidades">
            <b className="ws-subject" style={{ borderColor: soft(subject.color) }}>{subject.short}</b>
            {subject.units.map((u) => (
              <div key={u.id} className={`ws-unit-row ${u.id === unit.id ? 'is-on' : ''}`}>
                <button className="ws-unit-btn w-ellipsis" aria-current={u.id === unit.id ? 'true' : undefined} onClick={() => go({ ...route, unitId: u.id, itemId: null })}>{u.name}</button>
                <button className="prio-x" onClick={() => setDialog({ rename: u.id })} aria-label={`Cambiar el nombre de ${u.name}`}><Icon name="pen" size={14} /></button>
              </div>
            ))}
            <button className="ws-new" onClick={() => setDialog('unit')}><Icon name="plus" size={16} /><span>Nueva unidad</span></button>
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
            {tab !== 'recursos' && layouts()}
          </div>

          {tab === 'estudio' && (
            <>
              <div className="chip-strip" aria-label="Temas">
                {unit.topics.map((t) => (
                  <span key={t.id} className={`topic-chip ${topic?.id === t.id ? 'is-sel' : ''}`}>
                    <button className="state-btn" onClick={() => cycle(t.id)} aria-label={`Estado de «${t.name}»: ${t.state === 'clear' ? 'claro' : t.state === 'doing' ? 'en curso' : 'sin empezar'}`} title="Cambiar estado">
                      <Icon name={t.state === 'clear' ? 'check' : 'clock'} size={16} color={t.state === 'clear' ? '#3DDC97' : t.state === 'doing' ? '#3185FC' : '#9AA0A6'} />
                    </button>
                    <button className="chip-name" onClick={() => go({ ...route, itemId: t.id })}>{t.name}</button>
                    {topic?.id === t.id && <button className="prio-x" onClick={() => removeTopic(t.id)} aria-label={`Quitar «${t.name}»`}><Icon name="trash" size={14} /></button>}
                  </span>
                ))}
                <button className="topic-chip chip-add" onClick={() => setDialog('topic')} aria-label="Añadir tema" title="Añadir tema"><Icon name="plus" size={16} /><span>Tema</span></button>
              </div>
              {topic
                ? split(<FileFrame key="pdf" file={unit.temario ?? null} onChange={(f) => changeU((u) => ({ ...u, temario: f }))} label="Subir el temario (PDF)" />,
                    <BlockEditor key={topic.id} label={`Apuntes de ${topic.name}`} value={data.notes?.[topic.id]} onChange={(doc) => update((d) => ({ ...d, notes: { ...(d.notes ?? {}), [topic.id]: doc } }))} />)
                : <p className="muted ws-empty">Añade un tema con + para empezar a tomar apuntes.</p>}
            </>
          )}

          {tab === 'practicas' && (
            <>
              <div className="chip-strip" aria-label="Prácticas">
                {practices.map((p) => (
                  <span key={p.id} className={`topic-chip ${practice?.id === p.id ? 'is-sel' : ''}`}>
                    <button className="state-btn" onClick={() => patchPractice(p.id, { done: !p.done })} aria-pressed={p.done} aria-label={`«${p.name}» hecha`} title="Marcar como hecha"><Icon name={p.done ? 'check' : 'clock'} size={16} color={p.done ? '#3DDC97' : '#9AA0A6'} /></button>
                    <button className="chip-name" onClick={() => go({ ...route, itemId: p.id })}>{p.name}</button>
                    {practice?.id === p.id && <button className="prio-x" onClick={() => removePractice(p.id)} aria-label={`Quitar «${p.name}»`}><Icon name="trash" size={14} /></button>}
                  </span>
                ))}
                <button className="topic-chip chip-add" onClick={() => setDialog('practice')} aria-label="Añadir práctica" title="Añadir práctica"><Icon name="plus" size={16} /><span>Práctica</span></button>
              </div>
              {practice
                ? split(<FileFrame key="pdf" file={practice.statement ?? null} onChange={(f) => patchPractice(practice.id, { statement: f })} label="Subir el enunciado (PDF)" />,
                    <BlockEditor key={practice.id} label={`Solución de ${practice.name}`} value={practice.doc} onChange={(doc) => patchPractice(practice.id, { doc })} />)
                : <p className="muted ws-empty">Añade una práctica con +: el enunciado en PDF a un lado y tu solución al otro.</p>}
            </>
          )}

          {tab === 'recursos' && <ResourceFrames data={data} update={update} subjectId={subject.id} unitId={unit.id} />}
        </div>
      </div>

      {dialog === 'topic' && <NameDialog title="Nombre del tema" placeholder="Estados de un proceso" onSubmit={addTopic} onClose={() => setDialog(null)} />}
      {dialog === 'practice' && <NameDialog title="Nombre de la práctica" placeholder="Práctica 1" onSubmit={addPractice} onClose={() => setDialog(null)} />}
      {dialog === 'unit' && <NameDialog title="Nombre de la unidad" placeholder="Hilos y concurrencia" onSubmit={addUnit} onClose={() => setDialog(null)} />}
      {dialog?.rename && <NameDialog title="Nombre de la unidad" initial={subject.units.find((u) => u.id === dialog.rename)?.name} onSubmit={(n) => renameUnit(dialog.rename, n)} onClose={() => setDialog(null)} />}
    </div>
  )
}
