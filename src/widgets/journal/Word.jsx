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
const WORDS = [
  ['ALBOR', 'Luz del alba; comienzo de algo.'], ['BRUMA', 'Niebla ligera, sobre todo en el mar.'],
  ['CALMA', 'Tranquilidad, ausencia de agitación.'], ['DICHA', 'Felicidad, buena suerte.'],
  ['FAROL', 'Caja de cristal con una luz dentro.'], ['GOZNE', 'Bisagra de una puerta.'],
  ['HUMOR', 'Estado de ánimo; capacidad de ver lo gracioso.'], ['LAPSO', 'Espacio de tiempo.'],
  ['OASIS', 'Lugar con agua y vegetación en el desierto; descanso.'], ['PLUMA', 'Cada pieza que cubre a las aves.'],
  ['RUMBO', 'Dirección que se sigue.'], ['SENDA', 'Camino estrecho.'],
  ['TERSO', 'Liso, sin arrugas.'], ['VUELO', 'Acción de volar.'],
  ['YERMO', 'Terreno sin cultivar.'], ['ZARPA', 'Mano de algunos animales, con uñas.'],
  ['ARDOR', 'Calor intenso; entusiasmo.'], ['BRISA', 'Viento suave.'],
  ['CANTO', 'Acción de cantar; borde de algo.'], ['FERIA', 'Fiesta popular con atracciones.'],
  ['GESTA', 'Hazaña, hecho heroico.'], ['HIELO', 'Agua congelada.'],
  ['JUNCO', 'Planta de tallos largos que crece en zonas húmedas.'], ['MECER', 'Mover suavemente de un lado a otro.'],
  ['PAUSA', 'Breve interrupción.'], ['TIBIO', 'Templado, ni frío ni caliente.'],
  ['VALLE', 'Llanura entre montañas.'], ['NIEVE', 'Agua helada que cae en copos.'],
]
const TRIES = 6
const LEN = 5
// En inglés: otra lista de palabras y teclado sin Ñ (según el idioma de la app)
const WORDS_EN = [
  ['BRAVE', 'Ready to face danger or pain.'], ['CHARM', 'The power of delighting others.'], ['DREAM', 'Images in the mind while sleeping; a hope.'],
  ['EARTH', 'The planet we live on.'], ['FLAME', 'Hot glowing gas from a fire.'], ['GRACE', 'Elegance of movement; kindness.'],
  ['HONEY', 'Sweet food made by bees.'], ['IVORY', 'Hard white material; a creamy white.'], ['JOLLY', 'Happy and cheerful.'],
  ['KNEEL', 'To go down on your knees.'], ['LEMON', 'A sour yellow citrus fruit.'], ['MAPLE', 'A tree with sweet sap.'],
  ['NOBLE', 'Having fine personal qualities.'], ['OCEAN', 'A very large body of salt water.'], ['PIANO', 'An instrument with black and white keys.'],
  ['QUIET', 'Making little or no noise.'], ['RIVER', 'A large natural stream of water.'], ['SPARK', 'A tiny bit of fire; the start of something.'],
  ['TIGER', 'A large striped wild cat.'], ['UNITY', 'Being joined together as one.'], ['VIVID', 'Bright and intense.'],
  ['WHEAT', 'A grain used to make flour.'], ['YOUTH', 'The time of being young.'], ['ZEBRA', 'A striped African horse.'],
  ['BLOOM', 'A flower; to flourish.'], ['CLOUD', 'Visible water vapour in the sky.'], ['FROST', 'Ice crystals on cold surfaces.'], ['GLOBE', 'A sphere showing a map of the world.'],
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
