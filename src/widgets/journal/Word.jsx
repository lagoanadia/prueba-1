import { useEffect, useRef, useState } from 'react'
import useBox from '../../hooks/useBox.js'
import { todayISO } from '../../lib/dates.js'
import { getLang } from '../../i18n/index.js'
import { sendScore } from '../games/common.js'

/*
 * PALABRA DEL DÍA (tipo Wordle)
 * Una palabra de 5 letras al día, 6 intentos. Colores de cada letra:
 *   verde = está y en su sitio · amarillo = está pero en otro sitio · gris = no está
 * Al terminar se enseña el significado (para seguir aprendiendo una palabra cada día).
 * En español solo se aceptan palabras que existan en el diccionario (src/data/words5-es.txt: las de 5 letras, sin tildes);
 * se carga aparte, la primera vez que se abre el widget. En inglés vale cualquier combinación de 5 letras.
 */
// Palabras de nivel avanzado: para aprender una palabra culta cada día (todas están en el diccionario)
const WORDS = [
  ['AJADO', 'Estropeado o gastado por el uso o el tiempo.'], ['CENIT', 'Punto más alto del cielo; momento de máximo esplendor.'],
  ['EGIDA', 'Protección, amparo: «bajo la égida de…».'], ['ESTRO', 'Inspiración del artista o del poeta.'],
  ['FATUO', 'Necio y engreído; vano, sin sustancia.'], ['GARBO', 'Elegancia y soltura al moverse o actuar.'],
  ['HOSCO', 'Áspero y poco sociable.'], ['LABIL', 'Que cambia o se altera con facilidad; inestable.'],
  ['LAUDO', 'Decisión que dicta un árbitro para resolver un conflicto.'], ['MAGRO', 'Con poca grasa; escaso, pobre.'],
  ['MOHIN', 'Mueca o gesto de enfado, a veces fingido.'], ['NIMIO', 'Insignificante, sin importancia.'],
  ['NIVEO', 'De nieve, o blanco como ella.'], ['OBICE', 'Obstáculo, impedimento.'],
  ['OBOLO', 'Pequeña cantidad con que se contribuye a algo.'], ['ORATE', 'Persona que ha perdido el juicio.'],
  ['PUGIL', 'Boxeador.'], ['RAUDO', 'Rápido, veloz.'],
  ['RECIO', 'Fuerte, robusto; duro.'], ['SOLAZ', 'Placer, descanso y alivio de los trabajos.'],
  ['SOPOR', 'Somnolencia, modorra.'], ['UFANO', 'Orgulloso, satisfecho de sí mismo.'],
  ['VERAZ', 'Que dice o contiene la verdad.'], ['VIGIA', 'Persona que vigila desde un lugar alto.'],
  ['ZAFIO', 'Grosero, tosco en el trato.'], ['AGAPE', 'Banquete o comida entre amigos.'],
  ['ALBUR', 'Azar, contingencia de la que depende un resultado.'], ['ASCUA', 'Trozo de materia sólida que arde sin llama.'],
  ['CETRO', 'Bastón que simboliza la dignidad real; supremacía.'], ['FALAZ', 'Engañoso, que induce a error.'],
  ['FUTIL', 'De poca importancia, inútil.'], ['INANE', 'Vano, fútil, sin sentido.'],
  ['PROBO', 'Honrado, íntegro.'], ['SAGAZ', 'Astuto y avispado; que prevé las cosas.'],
  ['TENAZ', 'Firme y constante en un propósito.'], ['TORVO', 'De mirada fiera y amenazante.'],
  ['VORAZ', 'Que come mucho y con ansia; que destruye rápido.'], ['YERTO', 'Tieso, rígido, especialmente por el frío o la muerte.'],
  ['ALIJO', 'Conjunto de géneros de contrabando.'], ['OPIMO', 'Rico, abundante, fértil.'],
  ['NIMBO', 'Aureola; nube gris y baja que trae lluvia.'], ['CAUTO', 'Que actúa con precaución.'],
  ['DOCTO', 'Que tiene muchos conocimientos.'], ['ATROZ', 'Cruel, inhumano; enorme, desmesurado.'],
]
const TRIES = 6
const LEN = 5
// En inglés: otra lista de palabras y teclado sin Ñ (según el idioma de la app)
const WORDS_EN = [
  ['ABHOR', 'To regard with disgust and hatred.'], ['ADEPT', 'Very skilled or proficient.'],
  ['ALOOF', 'Distant and cool in manner.'], ['ASKEW', 'Not straight; at an angle.'],
  ['AUGUR', 'To be a sign of a future outcome.'], ['BANAL', 'So lacking in originality as to be boring.'],
  ['CHIDE', 'To scold or rebuke gently.'], ['COVET', 'To yearn to possess something.'],
  ['CRASS', 'Lacking sensitivity or intelligence.'], ['DECRY', 'To publicly denounce.'],
  ['DEIGN', 'To do something one thinks is beneath one.'], ['DIRGE', 'A mournful song for the dead.'],
  ['DROLL', 'Curious or unusual in an amusing way.'], ['EPOCH', 'A distinctive period of history.'],
  ['EXALT', 'To praise highly; to raise in rank.'], ['FEIGN', 'To pretend to be affected by a feeling.'],
  ['FERAL', 'Wild, especially after escaping captivity.'], ['FLOUT', 'To openly disregard a rule.'],
  ['GAUNT', 'Lean and haggard.'], ['GLEAN', 'To gather information bit by bit.'],
  ['GUILE', 'Sly or cunning intelligence.'], ['IRATE', 'Feeling great anger.'],
  ['KNAVE', 'A dishonest or unscrupulous man.'], ['LITHE', 'Thin, supple and graceful.'],
  ['LUCID', 'Clear and easy to understand.'], ['MIRTH', 'Amusement expressed in laughter.'],
  ['NADIR', 'The lowest point of something.'], ['OPINE', "To state one's opinion."],
  ['QUELL', 'To put an end to, typically by force.'], ['QUIRK', 'A peculiar behavioural habit.'],
  ['SATED', 'Fully satisfied.'], ['SNIDE', 'Derogatory in an indirect way.'],
  ['STAID', 'Sedate, respectable and unadventurous.'], ['SURLY', 'Bad-tempered and unfriendly.'],
  ['TACIT', 'Understood without being stated.'], ['TERSE', 'Sparing in the use of words; abrupt.'],
  ['TRITE', 'Overused and lacking originality.'], ['USURP', 'To take a position illegally or by force.'],
  ['VAPID', 'Offering nothing stimulating; dull.'], ['WRATH', 'Extreme anger.'],
]
const KEYS_ES = ['QWERTYUIOP', 'ASDFGHJKLÑ', '↵ZXCVBNM⌫']
const KEYS_EN = ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫']

// Diccionario español de 5 letras: un archivo aparte que solo se descarga al abrir este widget
let dictPromise = null
const loadDict = () => (dictPromise ??= import('../../data/words5-es.txt?raw').then((m) => new Set(m.default.split('\n'))))

const wordOfDay = (today) => { const list = getLang() === 'en' ? WORDS_EN : WORDS; return list[Math.floor(new Date(`${today}T12:00:00`).getTime() / 86400000) % list.length] }

/** Compara un intento con la solución. Tiene en cuenta letras repetidas (como el Wordle original). */
export function score(guess, answer) {
  const res = Array(LEN).fill('absent')
  const left = {}
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct'
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] !== 'correct' && left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]-- }
  }
  return res
}

export default function Word({ size, data, update }) {
  const today = todayISO()
  const [answer, meaning] = wordOfDay(today)
  const game = data.wordle?.date === today ? data.wordle : { date: today, guesses: [] }
  const [current, setCurrent] = useState('')
  const [shake, setShake] = useState(false)
  const [msg, setMsg] = useState('') // aviso breve («no está en el diccionario»)
  const [dict, setDict] = useState(null)
  useEffect(() => { if (getLang() !== 'en') loadDict().then(setDict).catch(() => {}) }, []) // si no carga, se deja jugar sin comprobar
  const reject = (text) => { setShake(true); setMsg(text); setTimeout(() => setShake(false), 400); setTimeout(() => setMsg(''), 1800) }
  const areaRef = useRef(null)
  const area = useBox(areaRef)
  // Tamaño de casilla = el mayor que quepa en el hueco medido (5 de ancho, 6 de alto), con margen
  const GAP = 5
  const tile = Math.max(4, Math.floor(Math.min((area.w - GAP * 4) / 5, (area.h - GAP * 5) / 6, 46) * 0.94))

  const won = game.guesses.includes(answer)
  const over = won || game.guesses.length >= TRIES
  const scores = game.guesses.map((g) => score(g, answer))

  // Estado de cada letra para colorear el teclado (la mejor información que tengamos de ella)
  const keyState = {}
  const rank = { absent: 1, present: 2, correct: 3 }
  game.guesses.forEach((g, r) => [...g].forEach((ch, i) => {
    if ((rank[scores[r][i]] ?? 0) > (rank[keyState[ch]] ?? 0)) keyState[ch] = scores[r][i]
  }))

  const press = (k) => {
    if (over) return
    if (k === '⌫') return setCurrent((c) => c.slice(0, -1))
    if (k === '↵') {
      if (current.length < LEN) return reject('Faltan letras')
      if (dict && !dict.has(current) && current !== answer) return reject('No está en el diccionario')
      const guesses = [...game.guesses, current]
      update((d) => ({ ...d, wordle: { date: today, guesses } }))
      setCurrent('')
      // Al terminar, puntos para el ranking con amigos: 6 si aciertas a la primera … 1 a la sexta, 0 si no
      if (current === answer) sendScore('wordle', TRIES + 1 - guesses.length)
      else if (guesses.length >= TRIES) sendScore('wordle', 0)
      return
    }
    if (current.length < LEN) setCurrent((c) => c + k)
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter') press('↵')
    else if (e.key === 'Backspace') press('⌫')
    else if (/^[a-zñ]$/i.test(e.key)) press(e.key.toUpperCase())
    else return
    e.preventDefault()
  }

  const rows = Array.from({ length: TRIES }, (_, r) => {
    if (r < game.guesses.length) return { letters: [...game.guesses[r]], states: scores[r] }
    if (r === game.guesses.length && !over) return { letters: [...current.padEnd(LEN)], states: [], current: true }
    return { letters: Array(LEN).fill(' '), states: [] }
  })

  // S: solo el progreso (cuadraditos de colores) y el estado
  if (size === 'S') {
    return (
      <div className="w-center">
        <div className="wordle-mini">
          {rows.map((row, r) => row.letters.map((_, i) => <span key={r + '-' + i} className={`wm ${row.states[i] ?? ''}`} />))}
        </div>
        <span className="w-hint">{won ? '¡Acertada!' : over ? answer : `${game.guesses.length}/${TRIES}`}</span>
      </div>
    )
  }

  const board = (
    <div className={`wordle-board ${shake ? 'shake' : ''}`} style={{ '--t': `${tile}px` }}>
      {rows.map((row, r) => (
        <div key={r} className="wordle-row">
          {row.letters.map((ch, i) => (
            <span key={i} className={`tile ${row.states[i] ?? ''} ${row.current && ch.trim() ? 'filled' : ''}`} style={{ '--d': `${i * 90}ms` }}>
              {ch.trim()}
            </span>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className={`wordle wordle-${size}`} tabIndex={0} onKeyDown={onKeyDown} aria-label="Palabra oculta: escribe tu intento">
      <div className="wordle-area" ref={areaRef}>{board}</div>
      {msg && <div className="wordle-msg" role="status">{msg}</div>}
      {over ? (
        <div className={`wordle-end ${won ? 'is-won' : 'is-lost'}`}>
          <span className="we-kicker">{won ? `¡Acertada en ${game.guesses.length}/${TRIES}!` : 'Hoy no ha podido ser'}</span>
          <div className="we-word" aria-label={answer}>{[...answer].map((ch, i) => <span key={i} style={{ '--d': `${i * 90}ms` }}>{ch}</span>)}</div>
          <p className="we-meaning">{meaning}</p>
          {won && <span className="we-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--x': `${(i * 7 + 3) % 100}%`, '--d': `${(i % 5) * 120}ms`, '--c': ['#3DDC97', '#F9DC5C', '#3185FC', '#EFABFF', '#E84855'][i % 5] }} />)}</span>}
        </div>
      ) : (size === 'L' || size === 'T') ? (
        <div className="keyboard">
          {(getLang() === 'en' ? KEYS_EN : KEYS_ES).map((row) => (
            <div key={row} className="kb-row">
              {[...row].map((k) => (
                <button key={k} className={`key ${keyState[k] ?? ''} ${k === '↵' || k === '⌫' ? 'key-wide' : ''}`} onClick={() => press(k)}
                  aria-label={k === '↵' ? 'Enviar' : k === '⌫' ? 'Borrar' : k}>{k}</button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <span className="w-hint">Toca y escribe con el teclado</span>
      )}
    </div>
  )
}
