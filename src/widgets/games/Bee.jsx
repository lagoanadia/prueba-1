import { useEffect, useMemo, useRef, useState } from 'react'
import { getLang } from '../../i18n/index.js'
import { defineWord, fetchDaily, sendScore, shuffle, today } from './common.js'

const pointsOf = (w, isPan) => (w.length === 4 ? 1 : w.length) + (isPan(w) ? 7 : 0)
const RANKS = [[0, 'Empezando'], [0.08, 'Bien'], [0.2, 'Muy bien'], [0.4, 'Genial'], [0.7, 'Experta'], [1, 'Reina del panal']]

// Diccionario español (4–10 letras, sin tildes): un archivo aparte que solo se descarga al abrir este juego.
// Sirve para dar por buena CUALQUIER palabra que exista, no solo las de la lista que prepara el servidor.
let dictPromise = null
const loadDict = () => (dictPromise ??= import('../../data/words-bee-es.txt?raw').then((m) => new Set(m.default.split('\n'))))
// La tecla pulsada como letra del juego: sin tildes (á → A) y con la Ñ aparte
const letterOf = (key) => (key.length !== 1 ? '' : key.toLowerCase() === 'ñ' ? 'Ñ' : key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase())

/** Spelling Bee: forma palabras con las 7 letras; la del centro siempre. Palabras en tu idioma. */
export default function Bee({ data, update }) {
  const date = today()
  const [puzzle, setPuzzle] = useState(null)
  const [error, setError] = useState('')
  const [word, setWord] = useState('')
  const [order, setOrder] = useState(0)
  const [msg, setMsg] = useState('')
  const [dict, setDict] = useState(null)
  const [open, setOpen] = useState(false) // lista de palabras encontradas desplegada (como en el Spelling Bee del NYT)
  const [defFor, setDefFor] = useState(null) // palabra de la que se ve la definición
  const [defText, setDefText] = useState(undefined) // undefined = buscando · null = no se encontró
  const keyRef = useRef(null)
  useEffect(() => { fetchDaily('bee').then(setPuzzle).catch((e) => setError(e.message)) }, [date])
  useEffect(() => { if (getLang() !== 'en') loadDict().then(setDict).catch(() => {}) }, [])
  // El teclado funciona sin tener que tocar antes el juego: se escucha en toda la ventana (menos si estás escribiendo en un campo)
  useEffect(() => {
    const h = (e) => { if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return; keyRef.current?.(e) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const found = data.games?.bee?.date === date ? data.games.bee.found : []
  const outer = useMemo(() => (puzzle ? shuffle(puzzle.letters, () => ((order * 9301 + 49297) % 233280) / 233280 || Math.random()) : []), [puzzle, order])
  const letters = useMemo(() => (puzzle ? new Set([puzzle.center, ...puzzle.letters]) : new Set()), [puzzle])
  // Palabras válidas: las de la lista del servidor y todas las del diccionario que se forman con estas letras
  const valid = useMemo(() => {
    const all = new Set(puzzle?.words ?? [])
    if (puzzle && dict) for (const w of dict) if (w.length >= 4 && w.includes(puzzle.center) && [...w].every((ch) => letters.has(ch))) all.add(w)
    return all
  }, [puzzle, dict, letters])
  if (error) return <p className="w-hint w-center">{error}</p>
  if (!puzzle) return <div className="spinner" aria-label="Cargando" />

  const isPan = (w) => [...letters].every((l) => w.includes(l))
  const total = puzzle.words.reduce((a, w) => a + pointsOf(w, isPan), 0) // el rango se mide contra la lista del servidor; las del diccionario suman igual
  const scoreOf = (list) => list.reduce((a, w) => a + pointsOf(w, isPan), 0)
  const score = scoreOf(found)
  const rank = [...RANKS].reverse().find(([p]) => score >= p * total)[1]
  const showDef = (w) => {
    setDefFor(w); setDefText(undefined)
    defineWord(w).then((t) => setDefText((cur) => (t === undefined ? null : t)))
  }
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 1400) }
  const submit = () => {
    const w = word.toUpperCase()
    setWord('')
    if (w.length < 4) return flash('Muy corta')
    if (!w.includes(puzzle.center)) return flash('Falta la letra del centro')
    if (found.includes(w)) return flash('Ya la tienes')
    if (!valid.has(w)) return flash(dict || getLang() === 'en' ? 'No está en el diccionario' : 'No está en la lista')
    const next = [...found, w]
    update((d) => ({ ...d, games: { ...(d.games ?? {}), bee: { date, found: next } } }))
    flash(isPan(w) ? '¡Pangrama!' : `+${pointsOf(w, isPan)}`)
    sendScore('bee', scoreOf(next))
  }
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); return submit() }
    if (e.key === 'Backspace') { e.preventDefault(); return setWord((x) => x.slice(0, -1)) }
    const k = letterOf(e.key)
    if (k && letters.has(k)) { e.preventDefault(); setWord((x) => x + k) }
  }
  keyRef.current = onKey

  return (
    <div className="bee" onKeyDown={onKey} aria-label="Spelling Bee: escribe palabras con estas letras">
      <div className="w-row"><b className="bee-rank">{rank}</b><span className="w-hint">{score} puntos · {found.length} palabras</span></div>
      <div className="bar"><span style={{ width: `${Math.min(100, (score / total) * 100)}%`, background: '#F9DC5C' }} /></div>
      <div className="bee-found-bar">
        <button type="button" className="bee-found-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="bee-found-title">{found.length ? `Has encontrado ${found.length} ${found.length === 1 ? 'palabra' : 'palabras'}` : 'Aún no has encontrado palabras'}</span>
          {!open && found.length > 0 && <span className="bee-found-peek">{[...found].slice(-4).reverse().map((w) => w.toLowerCase()).join(' · ')}</span>}
          <svg className="bee-found-chev" width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {open && (
          <div className="bee-found-panel" role="region" aria-label="Palabras encontradas">
            {found.length === 0 ? <p className="w-hint">Todavía no hay ninguna. ¡Prueba con una!</p> : (
              <div className="bee-found-grid">
                {[...found].sort().map((w) => (
                  <button type="button" key={w} className={`bee-w ${isPan(w) ? 'pan' : ''} ${defFor === w ? 'on' : ''}`} onClick={() => showDef(w)} aria-pressed={defFor === w}>{w.toLowerCase()}{isPan(w) && <i aria-hidden="true">★</i>}</button>
                ))}
              </div>
            )}
            <div className="bee-def" aria-live="polite">
              {defFor ? <><b>{defFor.toLowerCase()}</b>{defText === undefined ? <span className="muted"> · buscando…</span> : defText ? <span> · {defText}</span> : <span className="muted"> · no he encontrado su definición</span>}</> : found.length > 0 && <span className="muted">Toca una palabra para ver su definición</span>}
            </div>
          </div>
        )}
      </div>
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
    </div>
  )
}
