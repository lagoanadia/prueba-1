import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { MEALS, activeDishOf, dishesOf } from '../../widgets/comida/food.js'
import DishForm from './DishForm.jsx'
import Modal from './Modal.jsx'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const letterOf = (name) => (name ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()

/** Recetario por niveles: abecedario (la letra bajo el ratón crece en ola) → cajitas de recetas → receta abierta. */
export default function Cookbook({ data, update }) {
  const dishes = dishesOf(data)
  const active = activeDishOf(data)
  const [letter, setLetter] = useState(null)
  const [hot, setHot] = useState(null) // índice de la letra bajo el ratón (para la onda)
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState(null) // null = sin buscar · texto = buscando
  const searchRef = useRef(null)
  // Al empezar a buscar, el cursor pasa al buscador (al final del texto) para seguir escribiendo
  useEffect(() => { const el = searchRef.current; if (q != null && el && document.activeElement !== el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }, [q != null]) // eslint-disable-line react-hooks/exhaustive-deps
  const norm = (t) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const results = q == null ? [] : dishes.filter((x) => { const n = norm(q).trim(); return n && (norm(x.name).includes(n) || (x.ingredients ?? []).some((i) => norm(i).includes(n))) })

  const has = new Set(dishes.map((d) => letterOf(d.name)))
  const shown = letter ?? (active ? letterOf(active.name) : LETTERS.find((l) => has.has(l)))
  const list = dishes.filter((d) => letterOf(d.name) === shown).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  // Receta desplegada: la elegida si es de esta letra; si no, la primera de la letra
  const open = list.find((x) => x.id === active?.id) ?? list[0]
  const select = (id) => update((d) => ({ ...d, activeDish: id }))
  const save = (patch) => { update((d) => ({ ...d, dishes: dishesOf(d).map((x) => (x.id === open.id ? { ...x, ...patch } : x)) })); setEditing(false) }
  const remove = () => {
    if (!window.confirm(`¿Eliminar «${open.name}»? También saldrá del menú.`)) return
    update((d) => {
      const menu = Object.fromEntries(Object.entries(d.menu ?? {}).map(([day, m]) => [day, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === open.id ? null : v]))]))
      return { ...d, dishes: dishesOf(d).filter((x) => x.id !== open.id), menu, activeDish: null, batchPlan: (d.batchPlan ?? []).filter((b) => b.dish !== open.id) }
    })
    setEditing(false)
  }

  return (
    <section className="card fd-card fd-cookbook" aria-label="Recetario" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Escape' && q != null) { setQ(null); return } if (q == null && e.target === e.currentTarget && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setQ(e.key) } }}>
      <div className="fd-title"><span className="dot-food" aria-hidden="true" /><b>Recetario</b></div>
      <div className="fd-search">
        <Icon name="search" size={16} />
        <input ref={searchRef} value={q ?? ''} placeholder="Buscar receta o ingrediente" aria-label="Buscar receta" onFocus={() => q == null && setQ('')} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQ(null); e.currentTarget.blur() } }} />
        {q != null && <><span className="fd-hint">{q.trim() ? `${results.length} resultado${results.length === 1 ? '' : 's'}` : ''}</span><button className="fd-ib" onClick={() => setQ(null)} aria-label="Cerrar la búsqueda"><Icon name="close" size={14} /></button></>}
      </div>
      {q != null && q.trim() ? (
        <div className="fd-cards">
          {results.map((x) => (
            <button key={x.id} className="fd-rec" onClick={() => { select(x.id); setLetter(letterOf(x.name)); setQ(null) }}>
              <span className="fd-rec-name">{x.name}</span>
              <span className="fd-tags">{x.for.map((m) => <span key={m} className="fd-tag">{MEALS[m]}</span>)}</span>
            </button>
          ))}
          {results.length === 0 && <p className="fd-empty">Sin resultados para «{q}»</p>}
        </div>
      ) : (<>
      <div className="fd-abc" role="tablist" aria-label="Letras" onMouseLeave={() => setHot(null)}>
        {LETTERS.map((l, i) => {
          const d = hot == null ? 9 : Math.abs(i - hot)
          const sel = hot == null ? l === shown : d === 0
          return (
            <button key={l} role="tab" aria-selected={l === shown} className={`fd-l ${has.has(l) ? 'has' : ''} ${hot == null && l === shown ? 'is-sel' : ''} d${Math.min(d, 3)}`}
              onMouseEnter={() => { setHot(i); setLetter(l) }} onFocus={() => setLetter(l)} onClick={() => setLetter(l)} data-sel={sel}>{l}</button>
          )
        })}
      </div>

      {dishes.length === 0 && <p className="fd-empty">Guarda tu primera comida y aparecerá aquí.</p>}
      {dishes.length > 0 && list.length === 0 && <p className="fd-empty">Sin recetas con la {shown}</p>}
      <div className="fd-cards">
        {list.map((x) => (
          <button key={x.id} draggable className={`fd-rec ${open?.id === x.id ? 'is-sel' : ''}`} onClick={() => select(x.id)}
            onDragStart={(e) => { e.dataTransfer.setData('text/dish', x.id); e.dataTransfer.effectAllowed = 'copy' }}>
            <span className="fd-rec-name"><Icon name="grip" size={14} color="#9AA0A6" strokeWidth={3} />{x.name}</span>
            <span className="fd-tags">{x.for.map((m) => <span key={m} className="fd-tag">{MEALS[m]}</span>)}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fd-detail">
          <div className="fd-detail-head">
            <h2>{open.name}</h2>
            <button className="fd-ib" onClick={() => setEditing(true)} aria-label="Editar receta" title="Editar receta"><Icon name="pen" size={16} /></button>
          </div>
          <div className="fd-tags">
            {open.for.map((m) => <span key={m} className="fd-chip is-on">{MEALS[m]}</span>)}
            {open.time && <span className="fd-chip"><Icon name="clock" size={13} />{open.time} min</span>}
          </div>
          <hr />
          <div className="fd-cols">
            <div><b>Ingredientes</b>{open.ingredients.length ? <ul>{open.ingredients.map((x, i) => <li key={x + i}>{x}</li>)}</ul> : <p className="fd-hint">Sin ingredientes</p>}</div>
            <div><b>Preparación</b>{open.steps.length ? <ol>{open.steps.map((x, i) => <li key={x + i}>{x}</li>)}</ol> : <p className="fd-hint">Sin pasos</p>}</div>
          </div>
        </div>
      )}
      </>)}
      {editing && open && (
        <Modal title="Editar receta" icon="pen" onClose={() => setEditing(false)} wide>
          <DishForm initial={open} onSave={save} onRemove={remove} />
        </Modal>
      )}
    </section>
  )
}
