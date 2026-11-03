import { useState } from 'react'
import { askAssistant } from '../services/aiService.js'

// Atajos para que el usuario no tenga que pensar qué escribir.
const QUICK_ACTIONS = ['Organize my material by subject and topic', 'Make me a study plan for this week', 'What are the key concepts?']

/**
 * Pantalla 2: chat con el asistente.
 * messages es el historial completo. Lo mandamos entero en cada petición porque
 * el modelo NO recuerda nada entre llamadas: la "memoria" la llevamos nosotras.
 */
export default function AssistantScreen({ material, onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const send = async (text) => {
    const content = text.trim()
    if (!content || loading) return

    const history = [...messages, { role: 'user', content }]
    setMessages(history) // mostramos ya el mensaje del usuario
    setInput('')
    setError('')
    setLoading(true)
    try {
      const reply = await askAssistant(history, material)
      setMessages([...history, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="wf-content wf-chat">
      <button className="wf-link" onClick={onBack}>← Back</button>
      <h2>AI Study Assistant</h2>

      {material && <div className="wf-chip">📎 {material.name}</div>}

      <div className="wf-box wf-messages">
        {messages.length === 0 && (
          <div className="wf-quick-actions">
            <p className="wf-placeholder">[ Try one of these ]</p>
            {QUICK_ACTIONS.map((q) => (
              <button key={q} className="wf-button wf-option" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`wf-message wf-message-${m.role}`}>{m.content}</div>
        ))}
        {loading && <div className="wf-message wf-message-assistant">Thinking…</div>}
      </div>

      {error && <p className="wf-error">{error}</p>}

      <form className="wf-composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <input className="wf-box wf-input" placeholder="Ask about your material…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="wf-button" disabled={!input.trim() || loading}>Send</button>
      </form>
    </section>
  )
}
