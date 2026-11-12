import { useId, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { addDays, daysUntil, formatShort, todayISO } from '../../lib/dates.js'
import { fromMin, toMin } from './healthUtils.js'

// Un color por medicamento (se reparte solo; se puede cambiar al crearlo)
export const PILL_COLORS = ['#2F6FED', '#E5383B', '#1FA463', '#8B5CF6', '#F97316', '#EAB308', '#EC4899', '#06B6D4', '#92400E', '#64748B'] // los mismos 10 colores que las asignaturas y los deportes
const KINDS = [['treatment', 'Tratamiento'], ['daily', 'Diario'], ['supplement', 'Suplemento']]

/** Horas de toma: desde la primera, cada N horas (da la vuelta al día) o repartidas en N veces al día. */
const timesEvery = (first, every) => { const out = []; for (let k = 0; k * every < 24; k++) out.push(fromMin(toMin(first) + k * every * 60)); return out.sort() }
const timesPer = (first, n) => Array.from({ length: n }, (_, k) => fromMin(toMin(first) + Math.round((k * 1440) / n / 5) * 5)).sort()
// Los medicamentos guardados antes solo tenían `first` y `every`
const timesOfPill = (p) => p.times ?? timesEvery(p.first ?? '08:00', p.every ?? 8)
// Un tratamiento puede llevar varias pastillas (`items`); lo guardado antes es una sola, con sus horas en el propio medicamento
// Un medicamento o tratamiento = un solo color en toda su tarjeta; los guardados con colores antiguos toman el de su posición
const colorOf = (p, i) => (PILL_COLORS.includes(p.color) ? p.color : PILL_COLORS[i % PILL_COLORS.length])
// Cada pastilla de un tratamiento lleva su propio color (de la paleta), distinto del del tratamiento
const itemColor = (p, pi, k) => (p.kind === 'treatment' ? PILL_COLORS[(pi + 1 + k) % PILL_COLORS.length] : colorOf(p, pi))
const itemsOf = (p) => p.items ?? [{ id: '_', name: p.name, color: p.color ?? PILL_COLORS[0], times: timesOfPill(p), legacy: true }]
const keyOf = (it, t) => (it.legacy ? t : `${it.id}@${t}`)
const endOf = (p) => addDays(p.start ?? todayISO(), Math.max(0, (p.days ?? 1) - 1))
/** Días que le quedan a un tratamiento (contando hoy); null si es diario o suplemento. */
const daysLeft = (p) => (p.kind === 'treatment' && p.days ? Math.max(0, daysUntil(endOf(p)) + 1) : null)

/** Cápsula plana (como las botellas de los mensajes): dos mitades, brillo y algo inclinada; entera y suave al tomarla. */
function Capsule({ done }) {
  const id = useId().replace(/:/g, '')
  const half = done ? 'color-mix(in srgb, var(--c) 62%, #FFFFFF)' : '#FFFFFF'
  return (
    <svg className="pl-capsule" width="62" height="31" viewBox="0 0 64 32" aria-hidden="true">
      <defs><clipPath id={id}><rect x="2" y="4" width="60" height="24" rx="12" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect x="2" y="4" width="32" height="24" style={{ fill: 'color-mix(in srgb, var(--c) 62%, #FFFFFF)' }} />
        <rect x="32" y="4" width="30" height="24" style={{ fill: half }} />
        <rect x="32" y="4" width="2.5" height="24" style={{ fill: 'color-mix(in srgb, var(--c) 30%, #FFFFFF)', opacity: 0.55 }} />
      </g>
      <rect x="2" y="4" width="60" height="24" rx="12" fill="none" style={{ stroke: 'color-mix(in srgb, var(--c) 55%, #FFFFFF)' }} strokeWidth="1.5" />
      <path d="M9 10.5h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}

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
  const toggle = (p, it, t) => change(p.id, (x) => {
    const k = keyOf(it, t)
    const taken = x.taken?.[today] ?? []
    return { ...x, taken: { ...(x.taken ?? {}), [today]: taken.includes(k) ? taken.filter((y) => y !== k) : [...taken, k] } }
  })
  const remove = (p) => { if (window.confirm(`¿Quitar «${p.name}» del pastillero?`)) update((d) => ({ ...d, pills: (d.pills ?? []).filter((x) => x.id !== p.id) })) }
  const add = (p) => { update((d) => ({ ...d, pills: [...(d.pills ?? []), { id: crypto.randomUUID(), taken: {}, start: today, ...p }] })); setAdding(false) }
  const setView = (v) => update((d) => ({ ...d, pillsView: v }))
  const isDone = (p, it, t) => (p.taken?.[today] ?? []).includes(keyOf(it, t))

  // Para la vista del día: solo lo activo hoy, ordenado por hora
  const eventsOf = (p) => itemsOf(p).flatMap((it) => it.times.map((t) => ({ p, it, t }))).sort((a, b) => a.t.localeCompare(b.t) || a.it.name.localeCompare(b.it.name))
  const rows = pills.filter((p) => p.kind !== 'treatment' || daysLeft(p) !== 0 || !p.days)
    .flatMap(eventsOf).sort((a, b) => a.t.localeCompare(b.t) || a.it.name.localeCompare(b.it.name))

  return (
    <div className="pl">
      <button className="w-add-btn" onClick={(e) => { e.stopPropagation(); setAdding(!adding) }} onPointerDown={(e) => e.stopPropagation()} aria-label={adding ? 'Cerrar' : 'Nuevo medicamento'} aria-expanded={adding} title={adding ? 'Cerrar' : 'Nuevo medicamento'}><Icon name={adding ? 'close' : 'plus'} size={16} /></button>
      {adding && <PillForm baseIndex={pills.length} onSave={add} />}
      {pills.length === 0 && !adding && <p className="sa-hint">Añade un medicamento con el + y te enseño sus horas de hoy.</p>}
      {pills.length > 0 && (
        <div className="pl-switch" role="group" aria-label="Vista">
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'} aria-label="Tarjetas" title="Tarjetas"><GridIcon /></button>
          <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')} aria-pressed={view === 'day'} aria-label="El día" title="El día"><Icon name="list" size={15} /></button>
        </div>
      )}
      {view === 'cards' && pills.length > 0 && (
        <div className="pl-cards">
          {pills.some((p) => p.kind !== 'treatment') && (
            <div className="pl-dailybox">
              <div className="pl-lab">Cada día</div>
            <div className="pl-shelf">
              {pills.map((p, pi) => [p, pi]).filter(([p]) => p.kind !== 'treatment').map(([p, pi]) => {
                const it = itemsOf(p)[0]
                const all = it.times.every((t) => isDone(p, it, t))
                return (
                  <div key={p.id} className="pl-med" style={{ '--c': colorOf(p, pi) }}>
                    <button className="pl-del" onClick={() => remove(p)} aria-label={`Quitar ${p.name}`} title="Quitar"><Icon name="trash" size={13} /></button>
                    <span className="pl-capwrap"><Capsule done={all} /></span>
                    <b className={`pl-medname ${all ? 'is-done' : ''}`}>{p.name}</b>
                    <span className="pl-chips2">{it.times.map((t) => <button key={t} className={`pl-chip ${isDone(p, it, t) ? 'is-done' : ''}`} onClick={() => toggle(p, it, t)} aria-pressed={isDone(p, it, t)} title={isDone(p, it, t) ? 'Tomada' : 'Toca cuando la tomes'}>{t}</button>)}</span>
                  </div>
                )
              })}
            </div>
            </div>
          )}
          {pills.some((p) => p.kind === 'treatment') && (
            <div className="pl-treats">
          {pills.map((p, pi) => [p, pi]).filter(([p]) => p.kind === 'treatment').map(([p, pi]) => {
            const color = colorOf(p, pi)
            const left = daysLeft(p)
            const frac = left == null ? 0 : Math.min(1, Math.max(0, ((p.days ?? 1) - left) / (p.days ?? 1)))
            const ev = eventsOf(p)
              return (
                <div key={p.id} className="pl-tcard" style={{ '--c': color, '--tc': color }}>
                  <button className="pl-del" onClick={() => remove(p)} aria-label={`Quitar ${p.name}`} title="Quitar"><Icon name="trash" size={13} /></button>
                  <div className="pl-thead">
                    <div><b>{p.name}</b><span>{itemsOf(p).length === 1 ? '1 pastilla' : `${itemsOf(p).length} pastillas`}{p.days ? ` · acabas el ${formatShort(endOf(p))}` : ''}</span></div>
                    {left != null && <div className="pl-tcount"><b>{left || '–'}</b><i>{left === 1 ? 'día' : left ? 'días' : 'fin'}</i></div>}
                  </div>
                  {left != null && <div className="pl-bar"><i style={{ width: `${frac * 100}%` }} /></div>}
                  <div className="pl-day">
                    {ev.map(({ it, t }, i) => {
                      const done = isDone(p, it, t)
                      return (
                        <button key={`${it.id}${t}`} className={`pl-row ${done ? 'is-done' : ''}`} style={{ '--c': itemColor(p, pi, itemsOf(p).findIndex((x) => x.id === it.id)) }} onClick={() => toggle(p, it, t)} aria-pressed={done} title={done ? 'Tomada' : 'Toca cuando la tomes'}>
                          <span className="pl-time">{t}</span>
                          <span className="pl-line"><i />{i < ev.length - 1 && <u />}</span>
                          <span className="pl-what">{it.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
          })}
            </div>
          )}
        </div>
      )}
      {view === 'day' && pills.length > 0 && (
        <div className="pl-day">
          {rows.length === 0 && <p className="sa-hint">Hoy no toca nada.</p>}
          {rows.map(({ p, it, t }, i) => {
            const done = isDone(p, it, t)
            return (
              <button key={`${p.id}${it.id}${t}`} className={`pl-row ${done ? 'is-done' : ''}`} style={{ '--c': itemColor(p, pills.indexOf(p), itemsOf(p).findIndex((x) => x.id === it.id)) }} onClick={() => toggle(p, it, t)} aria-pressed={done}>
                <span className="pl-time">{t}</span>
                <span className="pl-line"><i />{i < rows.length - 1 && <u />}</span>
                <span className="pl-what">{it.name}</span>
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

function PillForm({ baseIndex, onSave }) {
  const colorAt = (i) => PILL_COLORS[(baseIndex + i) % PILL_COLORS.length]
  const blank = (i) => ({ id: crypto.randomUUID(), name: '', per: 3, first: '08:00', color: colorAt(i) })
  const [f, setF] = useState({ kind: 'treatment', name: '', per: 3, first: '08:00', days: 7, color: colorAt(0), items: [blank(0)] })
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setItem = (id, patch) => setF((x) => ({ ...x, items: x.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }))
  const isT = f.kind === 'treatment'
  const times = timesPer(f.first, f.per)
  const perDay = isT ? f.items.reduce((n, it) => n + it.per, 0) : f.per
  const ok = f.name.trim() && (!isT || (f.days > 0 && f.items.every((it) => it.name.trim())))
  const save = () => {
    if (!ok) return
    if (isT) onSave({ kind: 'treatment', name: f.name.trim(), color: f.color, days: f.days, items: f.items.map((it) => ({ id: it.id, name: it.name.trim(), color: f.color, times: timesPer(it.first, it.per) })) })
    else onSave({ kind: f.kind, name: f.name.trim(), color: f.color, times })
  }

  return (
    <div className="pl-form" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save() } }}>
      <div className="pl-chips">{KINDS.map(([k, l]) => <button key={k} type="button" className={f.kind === k ? 'on' : ''} onClick={() => set('kind', k)} aria-pressed={f.kind === k}>{l}</button>)}</div>
      <input className="pl-in" autoFocus placeholder={isT ? 'Nombre del tratamiento (Infección de garganta)' : 'Nombre y dosis (Magnesio 300 mg)'} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} aria-label="Nombre" />
      {isT ? (
        <>
          <Stepper label="Durante" value={f.days} onChange={(v) => set('days', v)} max={365} suffix={f.days === 1 ? ' día' : ' días'} />
          <div className="pl-items">
            <span className="pl-items-t">Pastillas</span>
            {f.items.map((it, i) => (
              <div key={it.id} className="pl-item" style={{ '--c': f.color }}>
                <div className="pl-item-top">
                  <input className="pl-in" placeholder="Pastilla y dosis (Amoxicilina 500 mg)" value={it.name} onChange={(e) => setItem(it.id, { name: e.target.value })} maxLength={40} aria-label={`Pastilla ${i + 1}`} />
                  {f.items.length > 1 && <button type="button" className="pl-item-x" onClick={() => setF((x) => ({ ...x, items: x.items.filter((y) => y.id !== it.id) }))} aria-label="Quitar esta pastilla" title="Quitar"><Icon name="close" size={13} /></button>}
                </div>
                <Stepper label="Tomas al día" value={it.per} onChange={(v) => setItem(it.id, { per: v })} max={6} />
                <label className="pl-step"><span>Primera toma</span><input className="pl-time" type="time" value={it.first} onChange={(e) => setItem(it.id, { first: e.target.value })} aria-label="Primera toma" /></label>
              </div>
            ))}
            {f.items.length < 5 && <button type="button" className="pl-additem" onClick={() => setF((x) => ({ ...x, items: [...x.items, blank(x.items.length)] }))}><Icon name="plus" size={13} strokeWidth={2.8} /> Añadir otra pastilla</button>}
          </div>
        </>
      ) : (
        <>
          <Stepper label="Tomas al día" value={f.per} onChange={(v) => set('per', v)} max={6} />
          <label className="pl-step"><span>Primera toma</span><input className="pl-time" type="time" value={f.first} onChange={(e) => set('first', e.target.value)} aria-label="Primera toma" /></label>
        </>
      )}
      <div className="pl-calc"><b>{perDay} {perDay === 1 ? 'toma' : 'tomas'} al día</b>{isT ? <> · acabas el {formatShort(addDays(todayISO(), f.days - 1))}</> : <> · {times.join(' · ')}</>}</div>
      <div className="pl-colors" role="group" aria-label="Color">{PILL_COLORS.map((c) => <button key={c} type="button" className={f.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('color', c)} aria-label={`Color ${c}`} aria-pressed={f.color === c} />)}</div>
      <button type="button" className="sa-btn" disabled={!ok} onClick={save}>{isT ? 'Empezar tratamiento' : 'Añadir'}</button>
    </div>
  )
}
