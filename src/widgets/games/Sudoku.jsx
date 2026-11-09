import { useEffect, useMemo, useState } from 'react'
import { clock, seeded, sendScore, shuffle, today } from './common.js'

/** Sudoku del día: se genera a partir de la fecha (igual para todos) quitando casillas de una solución válida. */
function makeSudoku(date) {
  const rnd = seeded('sudoku' + date)
  const pick3 = () => shuffle([0, 1, 2], rnd)
  const rows = pick3().flatMap((b) => pick3().map((r) => b * 3 + r))
  const cols = pick3().flatMap((b) => pick3().map((c) => b * 3 + c))
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)
  const solution = rows.map((r) => cols.map((c) => nums[(3 * (r % 3) + Math.floor(r / 3) + c) % 9]))
  const holes = new Set(shuffle([...Array(81).keys()], rnd).slice(0, 46))
  return { solution, givens: solution.map((row, r) => row.map((v, c) => (holes.has(r * 9 + c) ? 0 : v))) }
}
const valid = (g) => {
  const ok = (xs) => xs.slice().sort().join('') === '123456789'
  for (let i = 0; i < 9; i++) {
    if (!ok(g[i]) || !ok(g.map((r) => r[i]))) return false
    const br = Math.floor(i / 3) * 3; const bc = (i % 3) * 3
    if (!ok([0, 1, 2].flatMap((a) => [0, 1, 2].map((b) => g[br + a][bc + b])))) return false
  }
  return true
}

export default function Sudoku({ data, update }) {
  const date = today()
  const { solution, givens } = useMemo(() => makeSudoku(date), [date])
  const saved = data.games?.sudoku?.date === date ? data.games.sudoku : null
  const grid = saved?.grid ?? givens
  const [sel, setSel] = useState(null)
  const [now, setNow] = useState(Date.now())
  const startedAt = saved?.startedAt ?? null
  const done = Boolean(saved?.done)
  useEffect(() => { if (done || !startedAt) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [done, startedAt])
  const seconds = done ? saved.seconds : startedAt ? Math.round((now - startedAt) / 1000) : 0
  const save = (patch) => update((d) => ({ ...d, games: { ...(d.games ?? {}), sudoku: { date, grid, mistakes: 0, startedAt: startedAt ?? Date.now(), ...(d.games?.sudoku?.date === date ? d.games.sudoku : {}), ...patch } } }))

  const put = (n) => {
    if (!sel || done) return
    const [r, c] = sel
    if (givens[r][c]) return
    const next = grid.map((row) => [...row]); next[r][c] = n
    const wrong = n && n !== solution[r][c]
    const mistakes = (saved?.mistakes ?? 0) + (wrong ? 1 : 0)
    if (next.every((row) => row.every(Boolean)) && valid(next)) {
      const secs = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)
      save({ grid: next, mistakes, done: true, seconds: secs })
      sendScore('sudoku', Math.max(100, 1000 - Math.round(secs / 2) - mistakes * 20))
    } else save({ grid: next, mistakes })
  }
  useEffect(() => {
    const k = (e) => { if (/^[1-9]$/.test(e.key)) put(Number(e.key)); else if (e.key === 'Backspace' || e.key === 'Delete') put(0) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const same = sel ? grid[sel[0]][sel[1]] : 0

  return (
    <div className="sdk">
      <div className="w-row"><span className="w-hint">{done ? `¡Resuelto en ${clock(seconds)}!` : clock(seconds)}</span>{(saved?.mistakes ?? 0) > 0 && <span className="w-hint">{saved.mistakes} fallos</span>}</div>
      <div className="sdk-grid" role="grid" aria-label="Sudoku">
        {grid.map((row, r) => row.map((v, c) => {
          const given = Boolean(givens[r][c])
          const isSel = sel && sel[0] === r && sel[1] === c
          const peer = sel && (sel[0] === r || sel[1] === c || (Math.floor(sel[0] / 3) === Math.floor(r / 3) && Math.floor(sel[1] / 3) === Math.floor(c / 3)))
          const wrong = v && !given && v !== solution[r][c]
          return (
            <button key={r + '-' + c} role="gridcell" className={`sdk-cell ${given ? 'given' : ''} ${isSel ? 'is-sel' : peer ? 'peer' : ''} ${v && v === same ? 'same' : ''} ${wrong ? 'wrong' : ''} ${c % 3 === 2 && c < 8 ? 'br' : ''} ${r % 3 === 2 && r < 8 ? 'bb' : ''}`}
              onClick={() => setSel([r, c])} aria-label={`Fila ${r + 1}, columna ${c + 1}${v ? `: ${v}` : ''}`}>{v || ''}</button>
          )
        }))}
      </div>
      {!done && (
        <div className="sdk-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => put(n)}>{n}</button>)}
          <button onClick={() => put(0)} aria-label="Borrar">⌫</button>
        </div>
      )}
    </div>
  )
}
