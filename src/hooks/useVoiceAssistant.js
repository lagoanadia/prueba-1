import { useRef, useState } from 'react'
import useRecorder from './useRecorder.js'
import { transcribe, runCommand } from '../services/voiceService.js'
import { speak, isYes, isNo } from '../lib/speech.js'

/**
 * Máquina de estados del asistente de voz (la usan móvil y portátil):
 *
 *   idle ──tap──▶ listening ──tap──▶ processing ──▶ confirm ──(botón o "sí")──▶ saving ──▶ done
 *                                         │             └──(botón o "no")──▶ idle
 *                                         └──(nada que apuntar)──▶ idle
 *
 * En "confirm", si vuelves a hablar: "sí"/"no" confirma o cancela; cualquier otra cosa es un nuevo comando.
 */
export default function useVoiceAssistant(onConfirm) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')
  const recorder = useRecorder()
  const answeringRef = useRef(false) // ¿esta grabación es la respuesta a "¿Lo confirmo?"?

  const start = async () => {
    setError('')
    answeringRef.current = status === 'confirm'
    if (!answeringRef.current) {
      setTranscript('')
      setReply('')
      setProposal(null)
    }
    try {
      await recorder.start()
      setStatus('listening')
    } catch {
      setError('No puedo acceder al micrófono. Dale permiso en el navegador.')
      setStatus('idle')
    }
  }

  const confirm = async (actions = proposal) => {
    setStatus('saving')
    try {
      await onConfirm(actions)
      setProposal(null)
      setReply('Hecho.')
      speak('Hecho')
      setStatus('done')
    } catch (e) {
      setError(e.message)
      setStatus('confirm')
    }
  }

  const cancel = () => {
    setProposal(null)
    setReply('Vale, no apunto nada.')
    setStatus('idle')
  }

  const stop = async () => {
    setStatus('processing')
    const wasAnswering = answeringRef.current
    try {
      const text = await transcribe(await recorder.stop())
      if (!text) {
        setReply('No te he entendido. Prueba otra vez.')
        setStatus(wasAnswering ? 'confirm' : 'idle')
        return
      }
      if (wasAnswering && isYes(text)) return confirm()
      if (wasAnswering && isNo(text)) return cancel()

      setTranscript(text)
      const result = await runCommand(text)
      setReply(result.reply)
      speak(result.reply)
      setProposal(result.actions.length ? result.actions : null)
      setStatus(result.actions.length ? 'confirm' : 'idle')
    } catch (e) {
      setError(e.message)
      setStatus('idle')
    }
  }

  const toggle = () => {
    if (status === 'listening') return stop()
    if (status === 'processing' || status === 'saving') return
    return start()
  }

  /** Al cerrar la pantalla: corta el micro y deja todo limpio. */
  const reset = () => {
    recorder.cancel()
    window.speechSynthesis?.cancel()
    setStatus('idle')
    setTranscript('')
    setReply('')
    setProposal(null)
    setError('')
  }

  return { status, transcript, reply, proposal, error, toggle, start, confirm: () => confirm(), cancel, reset }
}
