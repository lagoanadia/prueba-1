import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/Icon.jsx'
import Bee from './Bee.jsx'
import Crossword from './Crossword.jsx'
import Sudoku from './Sudoku.jsx'
import { clock, today } from './common.js'

const GAMES = {
  sudoku: { name: 'Sudoku', color: '#3185FC', Game: Sudoku, art: '9×9' },
  bee: { name: 'Spelling Bee', color: '#F9DC5C', Game: Bee, art: '⬡' },
  crossword: { name: 'Mini crucigrama', color: '#E84855', Game: Crossword, art: '✎' },
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
  const { name, color, Game, art } = GAMES[game]
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!open) return; const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open])
  const status = statusOf(game, data)
  return (
    <>
      <button className={`game-cover game-${size}`} style={{ '--c': color }} onClick={() => setOpen(true)} onPointerDown={(e) => e.stopPropagation()}>
        <span className="game-art" aria-hidden="true">{art}</span>
        {size !== 'S' && <span className="game-status">{status}</span>}
        <span className="pill pill-on game-play">{status === 'Sin empezar' ? 'Jugar' : status.startsWith('Resuelto') ? 'Ver' : 'Seguir'}</span>
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
