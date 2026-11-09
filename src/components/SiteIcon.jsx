import { useState } from 'react'

const COLORS = ['#3185FC', '#E84855', '#3DDC97', '#EFABFF', '#F9DC5C', '#FF9F43', '#8E7CFF']
// Iconos grandes primero (apple-touch-icon suele ser 180 px); el de Google solo si viene en buena resolución
const sourcesFor = (host) => [
  `https://${host}/apple-touch-icon.png`,
  `https://${host.replace(/^www\./, '')}/apple-touch-icon.png`,
  `https://www.google.com/s2/favicons?domain=${host}&sz=256`,
]
const MIN = 96 // por debajo se estiraría y se vería borroso: se muestra pequeño y centrado, o la inicial

/**
 * Icono de una web en buena resolución. Prueba varias fuentes y descarta las pequeñas;
 * si ninguna sirve, pinta la inicial sobre un color (nunca un icono borroso).
 */
export default function SiteIcon({ url, name }) {
  const host = (() => { try { return new URL(url).hostname } catch { return '' } })()
  const sources = sourcesFor(host)
  const [i, setI] = useState(0)
  const [small, setSmall] = useState(null) // mejor icono pequeño encontrado (se muestra a su tamaño, sin estirar)
  const next = () => setI((x) => x + 1)
  const label = (name || host).replace(/^www\./, '')

  if (host && i >= sources.length && small) return <span className="site-small"><img src={small} alt="" referrerPolicy="no-referrer" /></span>
  if (!host || i >= sources.length) {
    const c = COLORS[[...label].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length]
    return <span className="site-letter" style={{ background: `color-mix(in srgb, ${c} 35%, #FFFFFF)` }}>{label[0]?.toUpperCase()}</span>
  }
  return (
    <img key={i} className="site-img" src={sources[i]} alt="" referrerPolicy="no-referrer"
      onError={next} onLoad={(e) => {
        const w = e.currentTarget.naturalWidth
        if (w >= MIN) return
        if (w >= 24 && !small) setSmall(sources[i])
        next()
      }} />
  )
}
