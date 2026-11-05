import { todayISO } from '../../lib/dates.js'

const WORDS = [
  ['Sosiego', 'Quietud, tranquilidad.', '«Tras la entrega llegó el sosiego».'],
  ['Efímero', 'Que dura poco.', '«Un momento efímero, pero bonito».'],
  ['Resiliencia', 'Capacidad de superar lo difícil.', '«Su resiliencia la sacó adelante».'],
  ['Serendipia', 'Hallazgo afortunado e inesperado.', '«Lo encontré por pura serendipia».'],
  ['Inefable', 'Que no se puede explicar con palabras.', '«Una alegría inefable».'],
  ['Arrebol', 'Color rojizo de las nubes al atardecer.', '«El cielo se llenó de arrebol».'],
  ['Limerencia', 'Enamoramiento intenso.', '«Vivía en plena limerencia».'],
  ['Petricor', 'Olor de la lluvia sobre tierra seca.', '«Abrí la ventana y olía a petricor».'],
  ['Ataraxia', 'Serenidad, ausencia de turbación.', '«Buscaba la ataraxia en la montaña».'],
  ['Melifluo', 'Dulce y suave.', '«Una voz meliflua».'],
  ['Acendrado', 'Puro, sin mancha.', '«Un cariño acendrado».'],
  ['Elocuente', 'Que se expresa con eficacia.', '«Un silencio elocuente».'],
  ['Alba', 'Primera luz del día.', '«Salió a correr al alba».'],
  ['Quimera', 'Ilusión imposible.', '«Aquel plan no era una quimera».'],
]

// La misma palabra todo el día: elegimos por número de día desde 1970.
const wordOfDay = () => WORDS[Math.floor(new Date(`${todayISO()}T12:00:00`).getTime() / 86400000) % WORDS.length]

/** Palabra del día. S: palabra · M: + significado · L: + ejemplo y guardar. */
export default function Word({ size, data, update }) {
  const [word, meaning, example] = wordOfDay()
  const saved = data.savedWords ?? []
  const isSaved = saved.includes(word)
  const toggle = () => update((d) => ({ ...d, savedWords: isSaved ? saved.filter((w) => w !== word) : [...saved, word] }))

  return (
    <div className={size === 'S' ? 'w-center' : ''}>
      <p className={`word word-${size}`}>{word}</p>
      {size !== 'S' && <p className="w-text">{meaning}</p>}
      {size === 'L' && (
        <>
          <p className="w-hint w-quote">{example}</p>
          <div className="w-actions">
            <button className={`pill ${isSaved ? 'pill-on' : ''}`} onClick={toggle}>{isSaved ? 'Guardada' : 'Guardar'}</button>
            <span className="w-hint">{saved.length} guardadas</span>
          </div>
        </>
      )}
    </div>
  )
}
