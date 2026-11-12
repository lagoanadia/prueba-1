import { useEffect, useMemo, useState } from 'react'
import { checkBeeWord, fetchDaily, sendScore, shuffle, today } from './common.js'

const pointsOf = (w, pangrams) => (w.length === 4 ? 1 : w.length) + (pangrams.includes(w) ? 7 : 0)
const RANKS = [[0, 'Empezando'], [0.08, 'Bien'], [0.2, 'Muy bien'], [0.4, 'Genial'], [0.7, 'Experta'], [1, 'Reina del panal']]

/** Spelling Bee: forma palabras con las 7 letras; la del centro siempre. Palabras en tu idioma. */
export default function Bee({ data, update }) {
  const date = today()
  const [puzzle, setPuzzle] = useState(null)
  const [error, setError] = useState('')
  const [word, setWord] = useState('')
  const [order, setOrder] = useState(0)
  const [msg, setMsg] = useState('')
  useEffect(() => { fetchDaily('bee').then(setPuzzle).catch((e) => setError(e.message)) }, [date])
  const found = data.games?.bee?.date === date ? data.games.bee.found : []
  const outer = useMemo(() => (puzzle ? shuffle(puzzle.letters, () => ((order * 9301 + 49297) % 233280) / 233280 || Math.random()) : []), [puzzle, order])
  if (error) return <p className="w-hint w-center">{error}</p>
  if (!puzzle) return <div className="spinner" aria-label="Cargando" />

  const total = puzzle.words.reduce((a, w) => a + pointsOf(w, puzzle.pangrams), 0)
  const score = found.reduce((a, w) => a + pointsOf(w, puzzle.pangrams), 0)
  const rank = [...RANKS].reverse().find(([p]) => score >= p * total)[1]
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 1400) }
  const accept = (w) => {
    const next = [...found, w]
    update((d) => ({ ...d, games: { ...(d.games ?? {}), bee: { date, found: [...new Set([...(d.games?.bee?.date === date ? d.games.bee.found : []), w])] } } }))
    flash(puzzle.pangrams.includes(w) ? '¡Pangrama!' : `+${pointsOf(w, puzzle.pangrams)}`)
    sendScore('bee', next.reduce((a, x) => a + pointsOf(x, puzzle.pangrams), 0))
  }
  const submit = () => {
    const w = word.toUpperCase()
    setWord('')
    if (w.length < 4) return flash('Muy corta')
    if (!w.includes(puzzle.center)) return flash('Falta la letra del centro')
    if (found.includes(w)) return flash('Ya la tienes')
    if (puzzle.words.includes(w)) return accept(w)
    // La lista del día no tiene todas las palabras: si no está, se comprueba en el diccionario
    setMsg('Comprobando…')
    checkBeeWord(w).then((r) => (r.valid ? accept(w) : flash('No es una palabra válida'))).catch(() => flash('No se ha podido comprobar'))
  }
  const onKey = (e) => {
    if (e.key === 'Enter') return submit()
    if (e.key === 'Backspace') return setWord((x) => x.slice(0, -1))
    const k = e.key.toUpperCase()
    if ([puzzle.center, ...puzzle.letters].includes(k)) setWord((x) => x + k)
  }

  return (
    <div className="bee" tabIndex={0} onKeyDown={onKey} aria-label="Spelling Bee: escribe palabras con estas letras">
      <div className="w-row"><b className="bee-rank">{rank}</b><span className="w-hint">{score} puntos · {found.length} palabras</span></div>
      <div className="bar"><span style={{ width: `${Math.min(100, (score / total) * 100)}%`, background: '#F9DC5C' }} /></div>
      <div className="bee-word" aria-live="polite">{msg ? <span className="bee-msg">{msg}</span> : word ? [...word].map((ch, i) => <span key={i} className={ch === puzzle.center ? 'c' : ''}>{ch}</span>) : <span className="muted">Escribe…</span>}</div>
      <div className="hive">
        <button className="hex center" onClick={() => setWord(word + puzzle.center)}>{puzzle.center}</button>
        {outer.map((l, i) => <button key={l} className={`hex h${i}`} onClick={() => setWord(word + l)}>{l}</button>)}
      </div>
      <div className="bee-actions">
        <button className="pill" onClick={() => setWord(word.slice(0, -1))}>Borrar</button>
        <button className="pill" onClick={() => setOrder(order + 1)} aria-label="Mezclar letras">Mezclar</button>
        <button className="pill pill-on" onClick={submit}>Enviar</button>
      </div>
      {found.length > 0 && <p className="bee-found">{[...found].sort().map((w) => <span key={w} className={puzzle.pangrams.includes(w) ? 'pan' : ''}>{w.toLowerCase()}</span>)}</p>}
    </div>
  )
}
