import { useState } from 'react'
import VoiceCircle from '../components/VoiceCircle.jsx'
import ConfirmCard from '../components/ConfirmCard.jsx'
import SectionLines from '../components/SectionLines.jsx'
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

  const handleCircle = async () => {
    if (status === 'idle') {
      setTranscript('')
      setProposal(null)
      setMessage('')
      setStatus('listening') // TODO (IA): empezar a grabar con MediaRecorder
      return
    }
    setStatus('processing')
    const text = await transcribe() // TODO (IA): pasar el audio grabado
    setTranscript(text)
    const result = await runCommand(text)
    setProposal(result.actions)
    setStatus('idle')
  }

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
      {proposal && <ConfirmCard actions={proposal} onConfirm={confirm} onCancel={cancel} />}
      {message && <p className="wf-placeholder">{message}</p>}

      <SectionLines entries={entries} onOpen={onOpenSection} />
    </section>
  )
}
