import { useState } from 'react'

export default function NotesEditor({ onSubmit, onBack }) {
  const [text, setText] = useState('')

  return (
    <div className="wf-panel">
      <button className="wf-link" onClick={onBack}>← Back</button>
      <h2>Write notes</h2>

      <textarea
        className="wf-box wf-textarea"
        placeholder="[ Write your notes here ]"
        value={text}
        maxLength={20000}
        onChange={(e) => setText(e.target.value)}
      />

      <button className="wf-button" disabled={!text.trim()} onClick={() => onSubmit(text)}>
        Continue to assistant →
      </button>
    </div>
  )
}
