import { useState } from 'react'
import { SECTIONS } from '../data/sections.js'

/**
 * Las secciones como líneas de color "escondidas".
 *  1er toque en una línea -> se despliega y muestra el nombre
 *  toque en "Open"        -> abre la sección
 */
export default function SectionLines({ entries, onOpen }) {
  const [revealed, setRevealed] = useState(null)

  return (
    <div className="wf-lines">
      {SECTIONS.map((s) => {
        const isOpen = revealed === s.id
        return (
          <div
            key={s.id}
            className={`wf-line ${isOpen ? 'wf-line-open' : ''}`}
            style={{ '--line-color': s.color }}
            onClick={() => setRevealed(isOpen ? null : s.id)}
            role="button"
            aria-label={s.label}
          >
            {isOpen && (
              <>
                <span>{s.icon} {s.label} · {entries[s.id]?.length ?? 0}</span>
                <button className="wf-link" onClick={(e) => { e.stopPropagation(); onOpen(s.id) }}>Open →</button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
