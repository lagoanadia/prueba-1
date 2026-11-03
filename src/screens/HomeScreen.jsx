import { useState } from 'react'
import VoiceCircle from '../components/VoiceCircle.jsx'
import ConfirmCard from '../components/ConfirmCard.jsx'
import SectionLines from '../components/SectionLines.jsx'
import useRecorder from '../hooks/useRecorder.js'
import { transcribe, runCommand } from '../services/voiceService.js'

/**
 * Pantalla principal:
 *   hablas -> se transcribe -> el asistente PROPONE acciones -> confirmas -> se guardan.
 */
export default function HomeScreen({ entries, onActions, onOpenSection }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'listening' | 'processing'
  const [transcript, setTranscript] = useState('')
  const [proposal, setProposal] = useState(null) // acciones pendientes de confirmar
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const recorder = useRecorder()

  const startListening = async () => {
    setTranscript('')
    setProposal(null)
    setMessage('')
    setError('')
    try {
      await recorder.start()
      setStatus('listening')
    } catch {
      setError('Microphone not available. Allow mic access in the browser.')
    }
  }

  const stopAndProcess = async () => {
    setStatus('processing')
    try {
      const audio = await recorder.stop()
      const text = await transcribe(audio)
      if (!text) {
        setMessage("I didn't catch that. Try again.")
        return
      }
      setTranscript(text)
      const result = await runCommand(text)
      setMessage(result.reply)
      if (result.actions.length > 0) setProposal(result.actions)
    } catch (err) {
      setError(err.message)
    } finally {
      setStatus('idle')
    }
  }

  const handleCircle = () => (status === 'idle' ? startListening() : stopAndProcess())

  const confirm = () => {
    onActions(proposal)
    setMessage('Saved.')
    setProposal(null)
  }

  const cancel = () => {
    setMessage('Discarded.')
    setProposal(null)
  }

  return (
    <section className="wf-content">
      <VoiceCircle status={status} onClick={handleCircle} />

      {transcript && <p className="wf-placeholder">“{transcript}”</p>}
      {message && <p className="wf-placeholder">{message}</p>}
      {proposal && <ConfirmCard actions={proposal} onConfirm={confirm} onCancel={cancel} />}
      {error && <p className="wf-error">{error}</p>}

      <SectionLines entries={entries} onOpen={onOpenSection} />
    </section>
  )
}
