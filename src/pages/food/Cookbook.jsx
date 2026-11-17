import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { MEALS, activeDishOf, dishesOf } from '../../widgets/comida/food.js'
import DishForm from './DishForm.jsx'
import { fmtQty } from './spices.js'
import ImportRecipes from './ImportRecipes.jsx'
import Modal from './Modal.jsx'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const letterOf = (name) => (name ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()

/** Recetario por niveles: abecedario (la letra bajo el ratón crece en ola) → cajitas de recetas → receta abierta. */
export default function Cookbook({ data, update, onPlace }) {
  const dishes = dishesOf(data)
  const active = activeDishOf(data)
  const [letter, setLetter] = useState(null)
  const [hot, setHot] = useState(null) // índice de la letra bajo el ratón (para la onda)
  const [editing, setEditing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false) // arrastrando una receta: aparece la papelera
  const [over, setOver] = useState(false)
  const [q, setQ] = useState(null) // null = sin buscar · texto = buscando
  const searchRef = useRef(null)
  // Al empezar a buscar, el cursor pasa al buscador (al final del texto) para seguir escribiendo
  useEffect(() => { const el = searchRef.current; if (q != null && el && document.activeElement !== el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }, [q != null]) // eslint-disable-line react-hooks/exhaustive-deps
  const norm = (t) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // La búsqueda va por principio de palabra («pe» encuentra «Pepito» y «pescado», no «Ensaladilla»): primero las recetas por su nombre
  // y después las que llevan ese ingrediente (diciendo cuál)
  const words = (t) => norm(t).split(/[^a-z0-9]+/).filter(Boolean)
  const starts = (text, qw) => { const w = words(text); return qw.every((k) => w.some((x) => x.startsWith(k))) }
  const results = q == null ? [] : (() => {
    const qw = words(q)
    if (!qw.length) return []
    const out = []
    for (const x of dishes) {
      if (starts(x.name, qw)) out.push({ ...x, via: null })
      else { const i = [...(x.ingredients ?? []), ...(x.spices ?? [])].find((n) => starts(n, qw)); if (i) out.push({ ...x, via: i }) }
    }
    return out.sort((a, b) => Number(Boolean(a.via)) - Number(Boolean(b.via)))
  })()

  const has = new Set(dishes.map((d) => letterOf(d.name)))
  const shown = letter ?? (active ? letterOf(active.name) : LETTERS.find((l) => has.has(l)))
  const list = dishes.filter((d) => letterOf(d.name) === shown).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  // Receta desplegada: la elegida si es de esta letra; si no, la primera de la letra
  const open = list.find((x) => x.id === active?.id) ?? list[0]
  const select = (id) => update((d) => ({ ...d, activeDish: id }))
  const save = (patch) => { update((d) => ({ ...d, dishes: dishesOf(d).map((x) => (x.id === open.id ? { ...x, ...patch } : x)) })); setEditing(false) }
  // Borra una receta (pide confirmación): también la quita del menú y del plan de cocina
  const removeDish = (dish) => {
    if (!dish || !window.confirm(`¿Eliminar «${dish.name}»? También saldrá del menú.`)) return
    update((d) => {
      const menu = Object.fromEntries(Object.entries(d.menu ?? {}).map(([day, m]) => [day, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === dish.id ? null : v]))]))
      return { ...d, dishes: dishesOf(d).filter((x) => x.id !== dish.id), menu, activeDish: null, batchPlan: (d.batchPlan ?? []).filter((b) => b.dish !== dish.id) }
    })
    setEditing(false)
  }
  const remove = () => removeDish(open)
  const dropOnTrash = (e) => { e.preventDefault(); setOver(false); setDragging(false); const id = e.dataTransfer.getData('text/dish'); removeDish(dishes.find((x) => x.id === id)) }

  return (
    <section className="card fd-card fd-cookbook" aria-label="Recetario" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Escape' && q != null) { setQ(null); return } if (q == null && e.target === e.currentTarget && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setQ(e.key) } }}>
      <div className="fd-title"><span className="dot-food" aria-hidden="true" /><b>Recetario</b><span className="fd-grow" /><button className="fd-ib" onClick={() => setImporting(true)} aria-label="Importar recetas" title="Importar recetas (PDF o foto)"><Icon name="upload" size={16} /></button></div>
      <div className="fd-search">
        <Icon name="search" size={16} />
        <input ref={searchRef} value={q ?? ''} placeholder="Buscar receta o ingrediente" aria-label="Buscar receta" onFocus={() => q == null && setQ('')} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQ(null); e.currentTarget.blur() } }} />
        {q != null && <><span className="fd-hint">{q.trim() ? `${results.length} resultado${results.length === 1 ? '' : 's'}` : ''}</span><button className="fd-ib" onClick={() => setQ(null)} aria-label="Cerrar la búsqueda"><Icon name="close" size={14} /></button></>}
      </div>
      {q != null && q.trim() ? (
        <div className="fd-cards">
          {results.map((x) => (
            <div key={x.id} className="fd-rec-wrap">
              <button className="fd-rec" onClick={() => { select(x.id); setLetter(letterOf(x.name)); setQ(null) }}>
                <span className="fd-rec-name">{x.name}</span>
                {x.via && <span className="fd-via">lleva {x.via.toLowerCase()}</span>}
                <span className="fd-tags">{x.for.map((m) => <span key={m} className="fd-tag">{MEALS[m]}</span>)}</span>
              </button>
              {onPlace && <button type="button" className="fd-rec-place" onClick={() => onPlace(x.id)} aria-label={`Poner «${x.name}» en el planificador`} title="Poner en el planificador: tocas las casillas donde la quieras"><Icon name="book" size={15} /></button>}
            </div>
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
          <div key={x.id} className="fd-rec-wrap">
            <button draggable className={`fd-rec ${open?.id === x.id ? 'is-sel' : ''}`} onClick={() => select(x.id)}
              onDragStart={(e) => { e.dataTransfer.setData('text/dish', x.id); e.dataTransfer.effectAllowed = 'copyMove'; setDragging(true) }} onDragEnd={() => { setDragging(false); setOver(false) }}>
              <span className="fd-rec-name"><Icon name="grip" size={14} color="#9AA0A6" strokeWidth={3} />{x.name}</span>
              <span className="fd-tags">{x.for.map((m) => <span key={m} className="fd-tag">{MEALS[m]}</span>)}</span>
            </button>
            {onPlace && <button type="button" className="fd-rec-place" onClick={() => onPlace(x.id)} aria-label={`Poner «${x.name}» en el planificador`} title="Poner en el planificador: tocas las casillas donde la quieras"><Icon name="book" size={15} /></button>}
          </div>
        ))}
      </div>

      {dragging && (
        <div className={`fd-trash ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true) }} onDragLeave={() => setOver(false)} onDrop={dropOnTrash}>
          <Icon name="trash" size={20} color="#B3261E" />Suelta aquí para borrar
        </div>
      )}

      {open && (
        <div className="fd-detail">
          <div className="fd-detail-head">
            <h2>{open.name}</h2>
            {onPlace && <button className="fd-ib fd-place" onClick={() => onPlace(open.id)} aria-label="Poner en el planificador" title="Poner en el planificador: tocas las casillas donde la quieras"><Icon name="book" size={16} /></button>}
            <button className="fd-ib" onClick={() => setEditing(true)} aria-label="Editar receta" title="Editar receta"><Icon name="pen" size={16} /></button>
            <button className="fd-ib" onClick={remove} aria-label="Borrar receta" title="Borrar receta"><Icon name="trash" size={16} color="#B3261E" /></button>
          </div>
          <div className="fd-tags">
            {open.for.map((m) => <span key={m} className="fd-chip is-on">{MEALS[m]}</span>)}
            {open.time && <span className="fd-chip"><Icon name="clock" size={13} />{open.time} min</span>}
          </div>
          <hr />
          {open.note && <div className="fd-tip"><Icon name="idea" size={18} /><span>{open.note}</span></div>}
          <div className="fd-cols">
            <div><b>Ingredientes</b>{open.ingredients.length ? <ul>{open.ingredients.map((x, i) => <li key={x + i}>{x}{open.amounts?.[x] && <em className="fd-qty">{fmtQty(open.amounts[x])}</em>}</li>)}</ul> : <p className="fd-hint">Sin ingredientes</p>}{(open.spices ?? []).length > 0 && <><b className="fd-spice-t">Especias</b><ul>{open.spices.map((x, i) => <li key={x + i}>{x}{open.amounts?.[x] && <em className="fd-qty">{fmtQty(open.amounts[x])}</em>}</li>)}</ul></>}</div>
            <div><b>Preparación</b>{open.steps.length ? <ol>{open.steps.map((x, i) => <li key={x + i}>{x}</li>)}</ol> : <p className="fd-hint">Sin pasos</p>}</div>
          </div>
        </div>
      )}
      </>)}
      {importing && <ImportRecipes data={data} update={update} onClose={() => setImporting(false)} />}
      {editing && open && (
        <Modal title="Editar receta" icon="pen" onClose={() => setEditing(false)} wide>
          <DishForm initial={open} onSave={save} onRemove={remove} />
        </Modal>
      )}
    </section>
  )
}
