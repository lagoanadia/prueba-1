import { useState } from 'react'
import Icon from '../components/Icon.jsx'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Varias palabras: sugerencias que se tocan para elegir + campo para añadir las tuyas. */
function Tags({ step, value = [], onChange }) {
  const [text, setText] = useState('')
  const toggle = (t) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])
  const add = (e) => {
    e.preventDefault()
    const t = text.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setText('')
  }
  const options = [...new Set([...step.suggestions, ...value])]
  return (
    <>
      <div className="ob-chips">
        {options.map((t, i) => <button key={t} type="button" className={`chip ob-chip ${value.includes(t) ? 'chip-on' : ''}`} style={{ '--i': i }} onClick={() => toggle(t)}>{t}</button>)}
      </div>
      <form className="w-form" onSubmit={add}><input placeholder={`+ ${step.placeholder}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={40} /></form>
    </>
  )
}

/** Lista de cosas con varios campos (p. ej. proyecto + fecha). Siempre hay una fila vacía al final. */
function Items({ step, value = [], onChange }) {
  const rows = [...value, {}]
  const set = (i, key, v) => {
    const next = rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)).filter((r) => Object.values(r).some(Boolean))
    onChange(next)
  }
  return (
    <div className="ob-items">
      {rows.map((r, i) => (
        <div key={i} className="w-form ob-row">
          {step.fields.map((f) => (
            <input key={f.key} type={f.type ?? 'text'} placeholder={f.placeholder} value={r[f.key] ?? ''} min={f.type === 'number' ? 1 : undefined}
              onChange={(e) => set(i, f.key, e.target.value)} style={f.width ? { width: f.width, flex: 'none' } : f.type === 'date' ? { flex: 'none' } : undefined}
              aria-label={f.placeholder ?? f.key} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Preguntas iniciales de un área: una pregunta por pantalla, con puntos de progreso.
 * «Saltar» deja el área vacía (se puede rellenar después desde los widgets).
 */
export default function Onboarding({ area, flow, onDone }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState(() => Object.fromEntries(flow.steps.filter((s) => s.initial !== undefined).map((s) => [s.id, s.initial])))
  const step = flow.steps[i]
  const last = i === flow.steps.length - 1
  const set = (v) => setAnswers((a) => ({ ...a, [step.id]: v }))
  const finish = (a) => onDone({ ...flow.build(a), onboarded: true })

  return (
    <div className="onboarding">
      <div className="ob-card">
        <div className="ob-top">
          <span className="ic ic-on" style={{ background: area.color }}><Icon name={area.id} /></span>
          <div className="ob-dots">{flow.steps.map((s, j) => <span key={s.id} className={j === i ? 'on' : j < i ? 'past' : ''} />)}</div>
          <button className="text-link ob-skip" onClick={() => finish({})}>Saltar</button>
        </div>

        <div className="ob-step" key={step.id}>
          <h2>{step.title}</h2>
          {step.type === 'tags' && <Tags step={step} value={answers[step.id]} onChange={set} />}
          {step.type === 'items' && <Items step={step} value={answers[step.id]} onChange={set} />}
          {(step.type === 'choice' || step.type === 'multi') && (
            <div className="ob-chips">
              {step.options.map((o, j) => {
                const on = step.type === 'multi' ? (answers[step.id] ?? []).includes(o.value) : answers[step.id] === o.value
                const pick = () => (step.type === 'multi'
                  ? set(on ? answers[step.id].filter((x) => x !== o.value) : [...(answers[step.id] ?? []), o.value])
                  : set(o.value))
                return <button key={String(o.value)} type="button" className={`chip ob-chip ob-big ${on ? 'chip-on' : ''}`} style={{ '--i': j }} onClick={pick}>{o.label}</button>
              })}
            </div>
          )}
          {step.type === 'days' && (
            <div className="ob-days">
              {DAYS.map((d, j) => {
                const on = (answers[step.id] ?? []).includes(j)
                return <button key={d} type="button" className={`ob-day ${on ? 'on' : ''}`} style={{ '--i': j }} aria-label={DAY_NAMES[j]} aria-pressed={on}
                  onClick={() => set(on ? answers[step.id].filter((x) => x !== j) : [...(answers[step.id] ?? []), j].sort())}>{d}</button>
              })}
            </div>
          )}
        </div>

        <div className="ob-nav">
          {i > 0 ? <button className="pill" onClick={() => setI(i - 1)}>Atrás</button> : <span />}
          <button className="btn-primary ob-next" onClick={() => (last ? finish(answers) : setI(i + 1))}>
            {last ? 'Empezar' : 'Siguiente'}<span className="btn-arrow"><Icon name="arrow" size={16} strokeWidth={2.6} /></span>
          </button>
        </div>
      </div>
    </div>
  )
}
