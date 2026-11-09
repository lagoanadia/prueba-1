import { createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

// La fila de arriba de la vista portátil (alineada con «Inicio» y el botón de hablar).
// Cada pantalla pinta ahí su título y sus botones con <TopBar>…</TopBar>.
export const TopBarCtx = createContext(null)
export const useTopBar = () => useContext(TopBarCtx)

export default function TopBar({ children }) {
  const slot = useTopBar()
  return slot ? createPortal(children, slot) : null
}
