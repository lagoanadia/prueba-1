import { createContext, useContext, useEffect } from 'react'

// Modo concentración: una pantalla pide al menú general que se pueda plegar (casa) mientras está abierta.
export const FocusCtx = createContext({ setFocus() {} })

export function useFocusMode(on) {
  const { setFocus } = useContext(FocusCtx)
  useEffect(() => {
    setFocus(on)
    return () => setFocus(false)
  }, [on, setFocus])
}
