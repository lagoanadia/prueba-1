import { SECTIONS } from '../data/sections.js'

export default function SectionScreen({ sectionId, entries, onBack }) {
  const section = SECTIONS.find((s) => s.id === sectionId)

  return (
    <section className="wf-content wf-section">
      <button className="wf-link" onClick={onBack}>← Back</button>
      <h2>{section.icon} {section.label}</h2>

      <div className="wf-box wf-placeholder">[ Summary / progress chart ]</div>

      <ul className="wf-list">
        {entries.length === 0 && <li className="wf-placeholder">[ Nothing yet. Use the voice circle to add items ]</li>}
        {entries.map((e) => (
          <li key={e.id} className="wf-box">
            {e.title}
            <small> · {new Date(e.createdAt).toLocaleDateString('en-GB')}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
