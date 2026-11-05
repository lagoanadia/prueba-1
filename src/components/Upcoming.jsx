import { AREAS } from '../data/areas.js'
import { formatShort } from '../lib/dates.js'

/** "Lo que viene": lo pendiente de los próximos días, una tarjeta por área. */
export default function Upcoming({ entries }) {
  const groups = AREAS.map((a) => ({
    ...a,
    items: entries.filter((e) => e.area === a.id).sort((x, y) => (x.date + (x.time ?? '')).localeCompare(y.date + (y.time ?? ''))).slice(0, 3),
  })).filter((g) => g.items.length)

  return (
    <section className="upcoming" aria-labelledby="lo-que-viene">
      <h2 id="lo-que-viene">Lo que viene</h2>
      {groups.length === 0 ? (
        <div className="card upcoming-empty">
          <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" fill="#F9DC5C" />
            <path className="sun-rays" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </svg>
          <div>
            <strong>¡Horizonte despejado!</strong>
            <p className="muted">No hay nada a la vista. Disfruta del momento.</p>
          </div>
        </div>
      ) : (
        <div className="upcoming-grid">
          {groups.map((g, i) => (
            <article key={g.id} className="card upcoming-card" style={{ '--i': i }}>
              <h3><span className="dot" style={{ background: g.color }} />{g.label}</h3>
              <ul>
                {g.items.map((e) => (
                  <li key={e.id}><span>{e.title}</span><b>{formatShort(e.date)}{e.time ? ` ${e.time}` : ''}</b></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
