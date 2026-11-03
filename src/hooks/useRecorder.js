import { useRef } from 'react'

/**
 * Grabar audio con el micrófono usando MediaRecorder (API del navegador).
 *   await start()  -> pide permiso de micro (la 1ª vez) y empieza a grabar
 *   await stop()   -> para y devuelve el audio como Blob
 *
 * Ojo: el micro solo funciona en HTTPS o en localhost.
 */
export default function useRecorder() {
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    // El navegador va entregando trozos de audio; los juntamos al parar.
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
    recorder.start()
    recorderRef.current = recorder
  }

  const stop = () =>
    new Promise((resolve) => {
      const recorder = recorderRef.current
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop()) // apaga el micro (y el icono rojo del navegador)
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }))
      }
      recorder.stop()
    })

  return { start, stop }
}
