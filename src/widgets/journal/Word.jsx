import { useRef, useState } from 'react'
import { todayISO } from '../../lib/dates.js'

/*
 * PALABRA DEL DÍA (tipo Wordle)
 * Una palabra de 5 letras al día, 6 intentos. Colores de cada letra:
 *   verde = está y en su sitio · amarillo = está pero en otro sitio · gris = no está
 * Al terminar se enseña el significado (para seguir aprendiendo una palabra cada día).
 * No validamos contra un diccionario: vale cualquier combinación de 5 letras.
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
const KEYS = ['QWERTYUIOP', 'ASDFGHJKLÑ', '↵ZXCVBNM⌫']

const wordOfDay = (today) => WORDS[Math.floor(new Date(`${today}T12:00:00`).getTime() / 86400000) % WORDS.length]

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
  const boardRef = useRef(null)

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
      if (current.length < LEN) { setShake(true); setTimeout(() => setShake(false), 400); return }
      update((d) => ({ ...d, wordle: { date: today, guesses: [...game.guesses, current] } }))
      setCurrent('')
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
    <div className={`wordle-board ${shake ? 'shake' : ''}`}>
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
    <div className={`wordle wordle-${size}`} tabIndex={0} onKeyDown={onKeyDown} ref={boardRef} aria-label="Palabra del día: escribe tu intento">
      <div className="fill">{board}</div>
      {over ? (
        <div className="wordle-end">
          <b>{answer[0] + answer.slice(1).toLowerCase()}</b>
          <span className="w-hint">{meaning}</span>
        </div>
      ) : (size === 'L' || size === 'T') ? (
        <div className="keyboard">
          {KEYS.map((row) => (
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
