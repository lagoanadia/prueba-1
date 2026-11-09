import { useEffect, useRef, useState } from 'react'

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'
let scriptPromise = null // una sola carga del script aunque el componente se monte varias veces

export function loadGoogleScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT
    script.async = true
    script.onload = resolve
    script.onerror = () => { scriptPromise = null; reject(new Error('No se ha podido cargar el login de Google')) }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Botón oficial "Sign in with Google" (Google Identity Services).
 * Cuando el usuario elige su cuenta, Google llama a nuestro callback con un
 * "credential": un ID token (JWT) firmado por Google con su nombre, email y foto.
 */
export default function GoogleSignInButton({ onCredential }) {
  const containerRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const [error, setError] = useState('')
  callbackRef.current = onCredential // siempre la versión más reciente del callback

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Falta VITE_GOOGLE_CLIENT_ID (mira .env.example)')
      return
    }
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          locale: 'es',
        })
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <div ref={containerRef} />
      {error && <p className="error">{error}</p>}
    </>
  )
}
