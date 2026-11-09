import { useEffect, useRef, useState } from 'react'
import { clock, fetchDaily, sendScore, today } from './common.js'

/** Mini crucigrama del día (en tu idioma). Toca una casilla, escribe; tocarla otra vez cambia de dirección. */
export default function Crossword({ data, update }) {
  const date = today()
  const [cw, setCw] = useState(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState(null) // { r, c, dir }
  const [now, setNow] = useState(Date.now())
  const input = useRef(null)
  useEffect(() => { fetchDaily('crossword').then(setCw).catch((e) => setError(e.message)) }, [date])
  const saved = data.games?.crossword?.date === date ? data.games.crossword : null
  const done = Boolean(saved?.done)
  useEffect(() => { if (done || !saved?.startedAt) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [done, saved?.startedAt])
  if (error) return <p className="w-hint w-center">{error}</p>
  if (!cw) return <div className="spinner" aria-label="Cargando" />

  const fill = saved?.fill ?? cw.solution.map((row) => row.map(() => ''))
  const seconds = done ? saved.seconds : saved?.startedAt ? Math.round((now - saved.startedAt) / 1000) : 0
  const clueAt = (r, c, dir) => cw.clues.find((k) => k.dir === dir && (dir === 'across' ? k.r === r && c >= k.c && c < k.c + k.len : k.c === c && r >= k.r && r < k.r + k.len))
  const active = sel && (clueAt(sel.r, sel.c, sel.dir) ?? clueAt(sel.r, sel.c, sel.dir === 'across' ? 'down' : 'across'))
  const inActive = (r, c) => active && (active.dir === 'across' ? r === active.r && c >= active.c && c < active.c + active.len : c === active.c && r >= active.r && r < active.r + active.len)
  const numAt = Object.fromEntries(cw.clues.map((k) => [`${k.r},${k.c}`, k.n]))

  const save = (next) => {
    const solved = next.every((row, r) => row.every((v, c) => !cw.cells[r][c] || v === cw.solution[r][c]))
    const startedAt = saved?.startedAt ?? Date.now()
    const secs = Math.round((Date.now() - startedAt) / 1000)
    update((d) => ({ ...d, games: { ...(d.games ?? {}), crossword: { date, fill: next, startedAt, ...(solved ? { done: true, seconds: secs } : {}) } } }))
    if (solved) sendScore('crossword', Math.max(100, 1000 - secs))
  }
  const tap = (r, c) => {
    if (!cw.cells[r][c] || done) return
    const dir = sel && sel.r === r && sel.c === c ? (sel.dir === 'across' ? 'down' : 'across') : clueAt(r, c, sel?.dir ?? 'across') ? sel?.dir ?? 'across' : sel?.dir === 'across' ? 'down' : 'across'
    setSel({ r, c, dir: clueAt(r, c, dir) ? dir : dir === 'across' ? 'down' : 'across' })
    input.current?.focus()
  }
  const step = (d) => {
    const k = active
    if (!k || !sel) return
    const i = (k.dir === 'across' ? sel.c - k.c : sel.r - k.r) + d
    if (i < 0 || i >= k.len) return
    setSel({ ...sel, dir: k.dir, r: k.dir === 'down' ? k.r + i : k.r, c: k.dir === 'across' ? k.c + i : k.c })
  }
  const type = (ch) => {
    if (!sel || done) return
    const next = fill.map((row) => [...row]); next[sel.r][sel.c] = ch
    save(next)
    if (ch) step(1)
  }
  const onKey = (e) => {
    if (e.key === 'Backspace') { e.preventDefault(); if (fill[sel?.r]?.[sel?.c]) type(''); else step(-1); return }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') return step(1)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') return step(-1)
    const k = e.key.toUpperCase()
    if (/^[A-ZÑ]$/.test(k)) { e.preventDefault(); type(k) }
  }

  return (
    <div className="cwd">
      <div className="w-row"><span className="w-hint">{done ? `¡Resuelto en ${clock(seconds)}!` : clock(seconds)}</span></div>
      <div className="cwd-clue">{active ? <><b>{active.n} {active.dir === 'across' ? '→' : '↓'}</b> {active.clue}</> : <span className="muted">Toca una casilla para empezar</span>}</div>
      <div className="cwd-grid" style={{ '--w': cw.w }} onKeyDown={onKey}>
        {cw.cells.map((row, r) => row.map((on, c) => on ? (
          <button key={r + '-' + c} className={`cwd-cell ${sel && sel.r === r && sel.c === c ? 'sel' : inActive(r, c) ? 'word' : ''} ${done ? 'ok' : ''}`} onClick={() => tap(r, c)} aria-label={`Casilla ${r + 1}, ${c + 1}`}>
            {numAt[`${r},${c}`] && <i>{numAt[`${r},${c}`]}</i>}{fill[r][c]}
          </button>
        ) : <span key={r + '-' + c} className="cwd-block" />))}
      </div>
      {/* Campo invisible para que en el móvil salga el teclado */}
      <input ref={input} className="cwd-input" onKeyDown={onKey} onChange={(e) => { const v = e.target.value.toUpperCase().slice(-1); e.target.value = ''; if (/^[A-ZÑ]$/.test(v)) type(v) }} aria-label="Escribe una letra" autoCapitalize="characters" autoComplete="off" />
      <ol className="cwd-list">
        {cw.clues.map((k) => <li key={k.dir + k.n} className={active === k ? 'on' : ''} onClick={() => { setSel({ r: k.r, c: k.c, dir: k.dir }); input.current?.focus() }}><b>{k.n}{k.dir === 'across' ? '→' : '↓'}</b> {k.clue}</li>)}
      </ol>
    </div>
  )
}
