import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { fromMin, toMin } from './healthUtils.js'

// Un color por medicamento (se reparte solo; se puede cambiar al crearlo)
export const PILL_COLORS = ['#2FA36B', '#8B5CF6', '#F29D38', '#E0457B', '#2F6FED', '#5F6368']
const KINDS = [['treatment', 'Tratamiento'], ['daily', 'Diario'], ['supplement', 'Suplemento']]

/** Horas de toma: desde la primera, cada N horas (da la vuelta al día) o repartidas en N veces al día. */
const timesEvery = (first, every) => { const out = []; for (let k = 0; k * every < 24; k++) out.push(fromMin(toMin(first) + k * every * 60)); return out.sort() }
const timesPer = (first, n) => Array.from({ length: n }, (_, k) => fromMin(toMin(first) + Math.round((k * 1440) / n / 5) * 5)).sort()
// Los medicamentos guardados antes solo tenían `first` y `every`
const timesOfPill = (p) => p.times ?? timesEvery(p.first ?? '08:00', p.every ?? 8)
const endOf = (p) => addDays(p.start ?? todayISO(), Math.max(0, (p.days ?? 1) - 1))
/** Días que le quedan a un tratamiento (contando hoy); null si es diario o suplemento. */
const daysLeft = (p) => (p.kind === 'treatment' && p.days ? Math.max(0, daysUntil(endOf(p)) + 1) : null)

const GridIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>

/**
 * Pastillero: tratamientos (con cuenta atrás de días), medicación diaria y suplementos.
 * Dos vistas: tarjetas (una por medicamento) o el día en orden (qué toca y cuándo). El + despliega el formulario aquí mismo.
 */
export default function Pills({ data, update }) {
  const today = todayISO()
  const pills = data.pills ?? []
  const view = data.pillsView === 'day' ? 'day' : 'cards'
  const [adding, setAdding] = useState(false)
  const change = (id, fn) => update((d) => ({ ...d, pills: (d.pills ?? []).map((p) => (p.id === id ? fn(p) : p)) }))
  const toggle = (p, t) => change(p.id, (x) => {
    const taken = x.taken?.[today] ?? []
    return { ...x, taken: { ...(x.taken ?? {}), [today]: taken.includes(t) ? taken.filter((y) => y !== t) : [...taken, t] } }
  })
  const remove = (p) => { if (window.confirm(`¿Quitar «${p.name}» del pastillero?`)) update((d) => ({ ...d, pills: (d.pills ?? []).filter((x) => x.id !== p.id) })) }
  const add = (p) => { update((d) => ({ ...d, pills: [...(d.pills ?? []), { id: crypto.randomUUID(), taken: {}, start: today, ...p }] })); setAdding(false) }
  const setView = (v) => update((d) => ({ ...d, pillsView: v }))
  const isDone = (p, t) => (p.taken?.[today] ?? []).includes(t)

  // Para la vista del día: solo lo activo hoy, ordenado por hora
  const rows = pills.filter((p) => p.kind !== 'treatment' || daysLeft(p) !== 0 || !p.days)
    .flatMap((p) => timesOfPill(p).map((t) => ({ p, t }))).sort((a, b) => a.t.localeCompare(b.t) || a.p.name.localeCompare(b.p.name))

  return (
    <div className="pl">
      <button className="w-add-btn" onClick={(e) => { e.stopPropagation(); setAdding(!adding) }} onPointerDown={(e) => e.stopPropagation()} aria-label={adding ? 'Cerrar' : 'Nuevo medicamento'} aria-expanded={adding} title={adding ? 'Cerrar' : 'Nuevo medicamento'}><Icon name={adding ? 'close' : 'plus'} size={16} /></button>
      {adding && <PillForm color={PILL_COLORS[pills.length % PILL_COLORS.length]} onSave={add} />}
      {pills.length === 0 && !adding && <p className="sa-hint">Añade un medicamento con el + y te enseño sus horas de hoy.</p>}
      {pills.length > 0 && (
        <div className="pl-switch" role="group" aria-label="Vista">
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'} aria-label="Tarjetas" title="Tarjetas"><GridIcon /></button>
          <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')} aria-pressed={view === 'day'} aria-label="El día" title="El día"><Icon name="list" size={15} /></button>
        </div>
      )}
      {view === 'cards' && pills.length > 0 && (
        <div className="pl-grid">
          {pills.map((p) => {
            const left = daysLeft(p)
            const frac = left == null ? 0 : Math.min(1, Math.max(0, ((p.days ?? 1) - left) / (p.days ?? 1)))
            return (
              <div key={p.id} className="pl-card" style={{ '--c': p.color ?? PILL_COLORS[0] }}>
                <button className="pl-del" onClick={() => remove(p)} aria-label={`Quitar ${p.name}`} title="Quitar"><Icon name="trash" size={13} /></button>
                <b className="pl-name">{p.name}</b>
                {left != null && (
                  <>
                    <div className="pl-big">{left || '–'}</div>
                    <div className="pl-sub">{left === 1 ? 'día restante' : left ? 'días restantes' : 'tratamiento terminado'}</div>
                    <div className="pl-bar"><i style={{ width: `${frac * 100}%` }} /></div>
                  </>
                )}
                <div className="pl-slots">{timesOfPill(p).map((t) => <button key={t} className={`pl-slot ${isDone(p, t) ? 'is-done' : ''}`} onClick={() => toggle(p, t)} aria-pressed={isDone(p, t)} title={isDone(p, t) ? 'Tomada' : 'Toca cuando la tomes'}>{t}</button>)}</div>
              </div>
            )
          })}
          <button type="button" className="pl-addcard" onClick={() => setAdding(true)}><Icon name="plus" size={14} strokeWidth={2.8} /> Añadir otro</button>
        </div>
      )}
      {view === 'day' && pills.length > 0 && (
        <div className="pl-day">
          {rows.length === 0 && <p className="sa-hint">Hoy no toca nada.</p>}
          {rows.map(({ p, t }, i) => {
            const done = isDone(p, t)
            return (
              <button key={`${p.id}${t}`} className={`pl-row ${done ? 'is-done' : ''}`} style={{ '--c': p.color ?? PILL_COLORS[0] }} onClick={() => toggle(p, t)} aria-pressed={done}>
                <span className="pl-time">{t}</span>
                <span className="pl-line"><i />{i < rows.length - 1 && <u />}</span>
                <span className="pl-what">{p.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stepper({ label, value, onChange, min = 1, max = 99, suffix = '' }) {
  return (
    <div className="pl-step">
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Menos ${label}`}>−</button>
        <b>{value}{suffix}</b>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Más ${label}`}>+</button>
      </div>
    </div>
  )
}

function PillForm({ color: initialColor, onSave }) {
  const [f, setF] = useState({ kind: 'treatment', name: '', per: 3, first: '08:00', days: 7, color: initialColor })
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const times = timesPer(f.first, f.per)
  const isT = f.kind === 'treatment'
  const ok = f.name.trim() && (!isT || f.days > 0)
  const save = () => { if (ok) onSave({ kind: f.kind, name: f.name.trim(), color: f.color, times, ...(isT ? { days: f.days } : {}) }) }

  return (
    <div className="pl-form" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save() } }}>
      <div className="pl-chips">{KINDS.map(([k, l]) => <button key={k} type="button" className={f.kind === k ? 'on' : ''} onClick={() => set('kind', k)} aria-pressed={f.kind === k}>{l}</button>)}</div>
      <input className="pl-in" autoFocus placeholder="Nombre y dosis (Ibuprofeno 400 mg)" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} aria-label="Nombre" />
      <Stepper label="Tomas al día" value={f.per} onChange={(v) => set('per', v)} max={6} />
      {isT && <Stepper label="Durante" value={f.days} onChange={(v) => set('days', v)} max={365} suffix={f.days === 1 ? ' día' : ' días'} />}
      <label className="pl-step"><span>Primera toma</span><input className="pl-time" type="time" value={f.first} onChange={(e) => set('first', e.target.value)} aria-label="Primera toma" /></label>
      <div className="pl-calc"><b>{times.join(' · ')}</b>{isT && <><br />{f.per * f.days} pastillas · acabas el {formatShort(addDays(todayISO(), f.days - 1))}</>}</div>
      <div className="pl-colors" role="group" aria-label="Color">{PILL_COLORS.map((c) => <button key={c} type="button" className={f.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('color', c)} aria-label={`Color ${c}`} aria-pressed={f.color === c} />)}</div>
      <button type="button" className="sa-btn" disabled={!ok} onClick={save}>{isT ? 'Empezar tratamiento' : 'Añadir'}</button>
    </div>
  )
}
