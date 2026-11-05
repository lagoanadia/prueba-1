import { useRef } from 'react'

/**
 * Grabar audio con el micrófono usando MediaRecorder (API del navegador).
 *   await start()  -> pide permiso de micro (la 1ª vez) y empieza a grabar
 *   await stop()   -> para y devuelve el audio como Blob
 *   cancel()       -> para sin devolver nada (p. ej. al cerrar la pantalla)
 * Ojo: el micro solo funciona en HTTPS o en localhost.
 */
export default function useRecorder() {
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
    recorder.start()
    recorderRef.current = recorder
  }

  const release = (recorder) => recorder.stream.getTracks().forEach((t) => t.stop()) // apaga el micro

  const stop = () =>
    new Promise((resolve) => {
      const recorder = recorderRef.current
      recorder.onstop = () => {
        release(recorder)
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }))
      }
      recorder.stop()
    })

  const cancel = () => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') {
      recorder.onstop = () => release(recorder)
      recorder.stop()
    }
  }

  return { start, stop, cancel }
}
