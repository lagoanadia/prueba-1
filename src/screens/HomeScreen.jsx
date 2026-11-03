import { useState } from 'react'
import VoiceCircle from '../components/VoiceCircle.jsx'
import { SECTIONS } from '../data/sections.js'
import { transcribe, runCommand } from '../services/voiceService.js'

/**
 * Pantalla principal: hablas -> se transcribe -> el asistente lo apunta en la sección.
 * entries viene de App (así la pantalla de cada sección ve lo mismo).
 */
export default function HomeScreen({ entries, onActions, onOpenSection }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'listening' | 'processing'
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')

  const handleCircle = async () => {
    if (status === 'idle') {
      setTranscript('')
      setReply('')
      setStatus('listening') // TODO (IA): empezar a grabar con MediaRecorder
      return
    }
    // status === 'listening': parar y procesar
    setStatus('processing')
    const text = await transcribe() // TODO (IA): pasar el audio grabado
    setTranscript(text)
    const result = await runCommand(text)
    onActions(result.actions)
    setReply(result.reply)
    setStatus('idle')
  }

  return (
    <section className="wf-content">
      <VoiceCircle status={status} onClick={handleCircle} />

      <div className="wf-box wf-transcript">
        <small>[ You said ]</small>
        <p>{transcript || '…'}</p>
        <small>[ Assistant ]</small>
        <p>{reply || '…'}</p>
      </div>

      <div className="wf-grid">
        {SECTIONS.map((s) => (
          <button key={s.id} className="wf-box wf-card" onClick={() => onOpenSection(s.id)}>
            <span className="wf-icon">{s.icon}</span>
            <strong>{s.label}</strong>
            <small>{entries[s.id]?.length ?? 0} items</small>
          </button>
        ))}
      </div>
    </section>
  )
}
