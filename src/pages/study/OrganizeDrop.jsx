import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { saveFile } from '../../lib/fileStore.js'
import { extractPdf } from '../../lib/pdfText.js'
import { proposeOrganization } from '../../services/organizeService.js'
import { buildReview, fallbackProposal } from './organize.js'

const MAX_FILES = 40

/** Zona para subir los documentos de la asignatura: se leen y la IA propone cómo organizarlos. */
export default function OrganizeDrop({ subjectName, onReview }) {
  const [files, setFiles] = useState([]) // File[]
  const [phase, setPhase] = useState('idle') // idle | reading | asking
  const [done, setDone] = useState(0)
  const [note, setNote] = useState('')
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const add = (list) => {
    const pdfs = [...list].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    const skipped = list.length - pdfs.length
    setNote(skipped ? `${skipped} archivo(s) no son PDF y se han ignorado.` : '')
    setFiles((cur) => [...cur, ...pdfs.filter((f) => !cur.some((c) => c.name === f.name && c.size === f.size))].slice(0, MAX_FILES))
  }

  const run = async () => {
    setPhase('reading'); setDone(0); setNote('')
    const docs = []
    for (const f of files) {
      const [ref, text] = await Promise.all([saveFile(f), extractPdf(f)])
      docs.push({ id: ref.id, file: ref, ...text })
      setDone((n) => n + 1)
    }
    setPhase('asking')
    let result
    let msg = ''
    try {
      result = await proposeOrganization(subjectName, docs.map((d) => ({ id: d.id, name: d.file.name, pages: d.pages, text: d.text })))
      if (!result?.units) throw new Error('bad')
    } catch {
      result = fallbackProposal(docs)
      msg = 'La IA no está disponible ahora: te propongo una organización básica por los nombres de los archivos. Puedes editarla igualmente.'
    }
    setPhase('idle'); setFiles([])
    onReview(buildReview(result, docs), msg, docs)
  }

  const busy = phase !== 'idle'
  return (
    <section className={`og-drop ${over ? 'is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) add(e.dataTransfer.files) }} aria-label="Organizar con tus documentos">
      <button className="og-drop-ic" onClick={() => input.current?.click()} disabled={busy} aria-label="Subir documentos" title="Subir documentos"><Icon name="upload" size={30} color="#3185FC" /></button>
      <input ref={input} type="file" accept="application/pdf" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <div className="og-drop-body">
        <b className="og-drop-title">Sube los documentos de la asignatura</b>
        <span className="muted">Los leo y te propongo cómo organizarlos en unidades y temas. Antes de crear nada podrás revisarlo.</span>
        {files.length > 0 && (
          <div className="og-files">
            {files.map((f) => (
              <span key={f.name + f.size} className="og-fchip"><Icon name="pdf" size={16} color="#E84855" />{f.name}{!busy && <button onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={`Quitar ${f.name}`}><Icon name="close" size={12} /></button>}</span>
            ))}
          </div>
        )}
        {busy && (
          <div className="og-prog" role="status">
            <span className="og-prog-bar"><i style={{ width: `${phase === 'asking' ? 96 : (done / Math.max(files.length, 1)) * 90}%` }} /></span>
            <span className="muted">{phase === 'asking' ? 'Proponiendo la organización…' : `Leyendo documentos… ${done} de ${files.length}`}</span>
          </div>
        )}
        {note && <span className="og-note" role="status">{note}</span>}
      </div>
      <button className="og-go" onClick={run} disabled={busy || !files.length}><Icon name="star" size={18} />Proponer organización</button>
    </section>
  )
}
