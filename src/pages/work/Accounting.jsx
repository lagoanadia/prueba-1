import { useState } from 'react'
import { undoable, insertAt } from '../../lib/undo.js'
import Icon from '../../components/Icon.jsx'
import { todayISO } from '../../lib/dates.js'
import Modal from '../food/Modal.jsx'

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('es', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
const monthShort = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('es', { month: 'short' }).replace('.', '')
const shift = (ym, n) => { const d = new Date(`${ym}-15T12:00:00`); d.setMonth(d.getMonth() + n); return d.toLocaleDateString('en-CA').slice(0, 7) }
const EMPTY = { kind: 'in', concept: '', amount: '', date: todayISO() }

/**
 * Contabilidad de un proyecto: ingresos y gastos, beneficio y lo que cobras de verdad por hora
 * (beneficio del mes ÷ horas del cronómetro de ese mes), con gráfica y un informe mensual.
 */
export default function Accounting({ project, change }) {
  const [ym, setYm] = useState(todayISO().slice(0, 7))
  const [form, setForm] = useState(null) // null = cerrado · movimiento nuevo o que se edita
  const [report, setReport] = useState(false)
  const money = project.money ?? []
  const sums = (m) => {
    const list = money.filter((x) => x.date.startsWith(m))
    const inn = list.filter((x) => x.kind === 'in').reduce((a, x) => a + x.amount, 0)
    const out = list.filter((x) => x.kind === 'out').reduce((a, x) => a + x.amount, 0)
    return { list, inn, out, profit: inn - out }
  }
  const hoursOf = (m) => Object.entries(project.time ?? {}).filter(([d]) => d.startsWith(m)).reduce((a, [, min]) => a + min, 0) / 60
  const cur = sums(ym)
  const hours = hoursOf(ym)
  const rate = hours > 0 ? cur.profit / hours : null
  const months = Array.from({ length: 6 }, (_, i) => shift(ym, i - 5))
  const bars = months.map((m) => ({ m, ...sums(m) }))
  const max = Math.max(1, ...bars.flatMap((b) => [b.inn, b.out]))
  const items = [...cur.list].sort((a, b) => b.date.localeCompare(a.date))

  const save = (e) => {
    e.preventDefault()
    const amount = Math.abs(Number(String(form.amount).replace(',', '.')))
    if (!form.concept.trim() || !amount || !form.date) return
    const mv = { id: form.id ?? crypto.randomUUID(), kind: form.kind, concept: form.concept.trim().slice(0, 60), amount: Math.round(amount * 100) / 100, date: form.date }
    change((p) => ({ ...p, money: (p.money ?? []).some((x) => x.id === mv.id) ? p.money.map((x) => (x.id === mv.id ? mv : x)) : [...(p.money ?? []), mv] }))
    setYm(form.date.slice(0, 7)); setForm(null)
  }
  const remove = (id) => {
    const list = project.money ?? []
    const mv = list.find((x) => x.id === id)
    const idx = list.findIndex((x) => x.id === id)
    change((p) => ({ ...p, money: (p.money ?? []).filter((x) => x.id !== id) }))
    setForm(null)
    if (mv) undoable(`Movimiento «${mv.concept}» eliminado`, () => change((p) => ({ ...p, money: insertAt(p.money, mv, idx) })))
  }
  const summaryText = () => `${project.name} · ${monthName(ym)}\nIngresos: ${eur(cur.inn)}\nGastos: ${eur(cur.out)}\nBeneficio: ${eur(cur.profit)}\nHoras: ${hours.toFixed(1)} h${rate != null ? ` · ${eur(rate)}/h` : ''}\n\n${items.map((x) => `${x.date} ${x.kind === 'in' ? '+' : '-'}${eur(x.amount)} ${x.concept}`).join('\n')}`

  return (
    <div className="ac">
      <div className="ac-stats">
        <div className="ac-st"><span>Ingresos</span><b className="is-in">{eur(cur.inn)}</b></div>
        <div className="ac-st"><span>Gastos</span><b>{eur(cur.out)}</b></div>
        <div className="ac-st"><span>Beneficio</span><b className={cur.profit < 0 ? 'is-neg' : ''}>{eur(cur.profit)}</b></div>
        <div className="ac-st is-rate"><span>Cobras de verdad</span><b>{rate != null ? `${eur(rate)}/h` : '—'}</b><span>{hours > 0 ? `${hours.toFixed(1)} h reales` : 'sin horas en el cronómetro'}</span></div>
      </div>
      <div className="ac-body">
        <div className="ac-box">
          <div className="ac-nav">
            <button className="icon-btn" onClick={() => setYm(shift(ym, -1))} aria-label="Mes anterior"><Icon name="left" size={16} /></button>
            <b>{monthName(ym)}</b>
            <button className="icon-btn" onClick={() => setYm(shift(ym, 1))} aria-label="Mes siguiente"><Icon name="right" size={16} /></button>
            <span className="ac-grow" />
            <button className="pill pill-sm" onClick={() => setReport(true)}><Icon name="chart" size={14} />Informe mensual</button>
          </div>
          <div className="ac-leg"><span><i className="in" />Ingresos</span><span><i className="out" />Gastos</span></div>
          <div className="ac-chart" role="img" aria-label="Ingresos y gastos de los últimos seis meses">
            {bars.map((b) => (
              <button key={b.m} className={`ac-m ${b.m === ym ? 'on' : ''}`} onClick={() => setYm(b.m)} title={`${monthName(b.m)}: ${eur(b.inn)} / ${eur(b.out)}`}>
                <span className="ac-bars"><i className="in" style={{ height: `${(b.inn / max) * 100}%` }} /><i className="out" style={{ height: `${(b.out / max) * 100}%` }} /></span>
                <span className="ac-ml">{monthShort(b.m)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ac-box">
          <div className="ac-nav"><b>Movimientos</b><span className="ac-grow" /><button className="pill sh-save" onClick={() => setForm({ ...EMPTY, date: ym === todayISO().slice(0, 7) ? todayISO() : `${ym}-01` })}><Icon name="plus" size={14} color="#fff" />Añadir</button></div>
          {form && (
            <form className="ac-form" onSubmit={save}>
              <span className="ac-kind" role="radiogroup" aria-label="Tipo">
                <button type="button" role="radio" aria-checked={form.kind === 'in'} className={form.kind === 'in' ? 'on in' : ''} onClick={() => setForm({ ...form, kind: 'in' })}>Ingreso</button>
                <button type="button" role="radio" aria-checked={form.kind === 'out'} className={form.kind === 'out' ? 'on out' : ''} onClick={() => setForm({ ...form, kind: 'out' })}>Gasto</button>
              </span>
              <input autoFocus placeholder="Concepto" value={form.concept} maxLength={60} onChange={(e) => setForm({ ...form, concept: e.target.value })} aria-label="Concepto" />
              <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="Importe €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label="Importe" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Fecha" />
              <span className="ac-form-actions">
                {form.id && <button type="button" className="icon-btn" onClick={() => remove(form.id)} aria-label="Borrar"><Icon name="trash" size={16} /></button>}
                <button type="button" className="pill" onClick={() => setForm(null)}>Cancelar</button>
                <button className="pill sh-save" disabled={!form.concept.trim() || !Number(String(form.amount).replace(',', '.'))}>{form.id ? 'Guardar' : 'Añadir'}</button>
              </span>
            </form>
          )}
          <ul className="ac-list">
            {items.map((x) => (
              <li key={x.id}>
                <span className={`ac-dot ${x.kind}`}><Icon name={x.kind === 'in' ? 'plus' : 'minus'} size={13} strokeWidth={3} /></span>
                <button className="ac-concept" onClick={() => setForm({ ...x, amount: String(x.amount) })} title="Tocar para editar">{x.concept}</button>
                <span className="ac-date">{new Date(`${x.date}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')}</span>
                <b className={`ac-am ${x.kind}`}>{x.kind === 'in' ? '+' : '−'}{eur(x.amount)}</b>
                <button className="icon-btn ac-x" onClick={() => remove(x.id)} aria-label={`Borrar ${x.concept}`}><Icon name="close" size={12} /></button>
              </li>
            ))}
            {items.length === 0 && !form && <li className="ac-empty">Sin movimientos en {monthName(ym).toLowerCase()}. Apunta el primero con «Añadir».</li>}
          </ul>
        </div>
      </div>
      {report && (
        <Modal title={`Informe de ${monthName(ym)}`} icon="chart" onClose={() => setReport(false)}>
          <div className="ac-report">
            <div className="ac-stats">
              <div className="ac-st"><span>Ingresos</span><b className="is-in">{eur(cur.inn)}</b></div>
              <div className="ac-st"><span>Gastos</span><b>{eur(cur.out)}</b></div>
              <div className="ac-st"><span>Beneficio</span><b>{eur(cur.profit)}</b></div>
              <div className="ac-st is-rate"><span>Por hora real</span><b>{rate != null ? `${eur(rate)}/h` : '—'}</b><span>{hours.toFixed(1)} h</span></div>
            </div>
            <ul className="ac-list">{items.map((x) => <li key={x.id}><span className={`ac-dot ${x.kind}`}><Icon name={x.kind === 'in' ? 'plus' : 'minus'} size={13} strokeWidth={3} /></span><span className="ac-concept is-static">{x.concept}</span><span className="ac-date">{x.date.slice(8)}/{x.date.slice(5, 7)}</span><b className={`ac-am ${x.kind}`}>{x.kind === 'in' ? '+' : '−'}{eur(x.amount)}</b></li>)}</ul>
            {items.length === 0 && <p className="ac-empty">No hay movimientos este mes.</p>}
            <div className="ac-form-actions"><button className="pill sh-save" onClick={() => navigator.clipboard?.writeText(summaryText())}><Icon name="copy" size={14} color="#fff" />Copiar resumen</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
