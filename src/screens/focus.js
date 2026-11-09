import { createContext, useContext, useEffect } from 'react'

// Modo concentración: una pantalla pide al menú general que se pueda plegar (casa) mientras está abierta.
// También comparte si el panel de unidades está abierto (su botón vive en la primera línea, junto a la casa).
export const FocusCtx = createContext({ setFocus() {}, panelOpen: true, setPanelOpen() {} })

export function useFocusMode(on) {
  const { setFocus } = useContext(FocusCtx)
  useEffect(() => {
    setFocus(on)
    return () => setFocus(false)
  }, [on, setFocus])
}
export const usePanelOpen = () => useContext(FocusCtx).panelOpen
export const usePanel = () => { const c = useContext(FocusCtx); return [c.panelOpen, c.setPanelOpen] }
