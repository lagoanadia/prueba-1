import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import Bee from './Bee.jsx'
import Crossword from './Crossword.jsx'
import Sudoku from './Sudoku.jsx'
import { clock, today } from './common.js'

// Ilustraciones de cada juego (dibujadas, con el trazo de la app)
const ART = {
  sudoku: (
    <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="6" width="52" height="52" rx="8" fill="#FFFFFF" stroke="#202124" strokeWidth="3" />
      <path d="M23.3 6v52M40.6 6v52M6 23.3h52M6 40.6h52" stroke="#202124" strokeWidth="2" /><rect x="24.3" y="24.3" width="15.3" height="15.3" fill="#9CC5FF" />
      <text x="14.6" y="19.5" fontSize="11" fontWeight="700" textAnchor="middle">7</text><text x="32" y="36.5" fontSize="11" fontWeight="700" textAnchor="middle">3</text><text x="49.3" y="53.5" fontSize="11" fontWeight="700" textAnchor="middle">9</text></svg>
  ),
  bee: (
    <svg viewBox="0 0 64 64" aria-hidden="true">{[[32, 32, '#F9DC5C'], [32, 14, '#FFFFFF'], [47.6, 23, '#FFFFFF'], [47.6, 41, '#FFFFFF'], [32, 50, '#FFFFFF'], [16.4, 41, '#FFFFFF'], [16.4, 23, '#FFFFFF']].map(([x, y, f]) => (
      <path key={x + '-' + y} d={`M${x - 9} ${y}l4.5-7.8h9l4.5 7.8-4.5 7.8h-9Z`} fill={f} stroke="#202124" strokeWidth="2.4" strokeLinejoin="round" />))}</svg>
  ),
  crossword: (
    <svg viewBox="0 0 64 64" aria-hidden="true">{[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => {
      const black = (r === 0 && c === 3) || (r === 3 && c === 0); const hot = r === 1
      return <rect key={r + '-' + c} x={6 + c * 13} y={6 + r * 13} width="13" height="13" fill={black ? '#202124' : hot ? '#FFC9CF' : '#FFFFFF'} stroke="#202124" strokeWidth="2" />
    }))}<text x="12.5" y="29" fontSize="8" fontWeight="700" textAnchor="middle">P</text><text x="25.5" y="29" fontSize="8" fontWeight="700" textAnchor="middle">A</text><text x="38.5" y="29" fontSize="8" fontWeight="700" textAnchor="middle">Z</text></svg>
  ),
}
const GAMES = {
  sudoku: { name: 'Sudoku', color: '#3185FC', Game: Sudoku },
  bee: { name: 'Spelling Bee', color: '#F9DC5C', Game: Bee },
  crossword: { name: 'Mini crucigrama', color: '#E84855', Game: Crossword },
}

/** Estado de hoy de cada juego, para la portada. */
function statusOf(game, data) {
  const g = data.games?.[game]
  if (!g || g.date !== today()) return 'Sin empezar'
  if (game === 'bee') return `${g.found.length} palabras`
  return g.done ? `Resuelto en ${clock(g.seconds)}` : 'A medias'
}

/**
 * Portada del juego (como en los juegos del periódico): estado de hoy y «Jugar».
 * El juego se abre a pantalla grande, así se juega cómodo con el widget del tamaño que sea.
 */
function Launcher({ game, size, data, update }) {
  const { name, color, Game } = GAMES[game]
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!open) return; const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open])
  const status = statusOf(game, data)
  return (
    <>
      <button className={`game-cover game-${size}`} style={{ '--c': color }} onClick={() => setOpen(true)} onPointerDown={(e) => e.stopPropagation()} aria-label={`${name}: ${status}`}>
        <span className="game-art">{ART[game]}</span>
        <span className="game-text">
          <b className="game-name">{name}</b>
          <span className="game-status">{status}</span>
        </span>
        <span className="game-go">{status === 'Sin empezar' ? 'Jugar' : status.startsWith('Resuelto') ? 'Ver' : 'Seguir'}</span>
      </button>
      {open && createPortal(
        <div className="popup game-popup" role="dialog" aria-modal="true" aria-label={name}>
          <div className="popup-backdrop" onClick={() => setOpen(false)} />
          <div className="popup-panel game-panel" style={{ '--c': color }}>
            <header className="area-head"><h2>{name}</h2><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><Icon name="close" /></button></header>
            <Game data={data} update={update} />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export const SudokuWidget = (p) => <Launcher game="sudoku" {...p} />
export const BeeWidget = (p) => <Launcher game="bee" {...p} />
export const CrosswordWidget = (p) => <Launcher game="crossword" {...p} />
