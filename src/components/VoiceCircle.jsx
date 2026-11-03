/**
 * El círculo principal. Estados:
 *   idle       -> "Tap to talk"
 *   listening  -> grabando (en el wireframe no graba de verdad)
 *   processing -> transcribiendo + el asistente decide qué hacer
 */
const LABELS = {
  idle: 'Tap to talk',
  listening: 'Listening… tap to stop',
  processing: 'Thinking…',
}

export default function VoiceCircle({ status, onClick }) {
  return (
    <button
      className={`wf-voice wf-voice-${status}`}
      onClick={onClick}
      disabled={status === 'processing'}
      aria-label={LABELS[status]}
    >
      <span className="wf-voice-icon">🎙️</span>
      <span>{LABELS[status]}</span>
    </button>
  )
}
