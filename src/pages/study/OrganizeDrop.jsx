import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { saveFile } from '../../lib/fileStore.js'
import { extractPdf } from '../../lib/pdfText.js'
import { proposeOrganization } from '../../services/organizeService.js'
import { buildReview, fallbackProposal } from './organize.js'

const MAX_FILES = 40

/** Lee una carpeta soltada (con subcarpetas dentro): devuelve todos los archivos, sin importar cómo estén organizados. */
async function readEntry(entry) {
  if (entry.isFile) return [await new Promise((res, rej) => entry.file(res, rej))]
  if (!entry.isDirectory) return []
  const reader = entry.createReader()
  const out = []
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej))
    if (!batch.length) break
    for (const e of batch) out.push(...(await readEntry(e)))
  }
  return out
}
/** Archivos de lo soltado: archivos sueltos y carpetas (se abren, las carpetas en sí se ignoran). */
async function filesFromDrop(dt) {
  const entries = [...(dt.items ?? [])].map((i) => i.webkitGetAsEntry?.()).filter(Boolean) // hay que pedirlo ya, antes de esperar
  if (!entries.length) return [...dt.files]
  const lists = await Promise.all(entries.map(readEntry))
  return lists.flat()
}

/** Zona para subir los documentos de la asignatura: se leen y la IA propone cómo organizarlos. */
export default function OrganizeDrop({ subjectName, onReview }) {
  const [files, setFiles] = useState([]) // File[]
  const [phase, setPhase] = useState('idle') // idle | reading | asking
  const [done, setDone] = useState(0)
  const [note, setNote] = useState('')
  const input = useRef(null)
  const folderInput = useRef(null)
  const [menu, setMenu] = useState(false) // elegir entre PDF sueltos o una carpeta
  const [over, setOver] = useState(false)

  const add = (list) => {
    const pdfs = [...list].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    const skipped = list.length - pdfs.length
    setNote(skipped ? `${skipped} archivo(s) no son PDF y se han ignorado.` : pdfs.length ? '' : 'No he encontrado PDF ahí.')
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
    <section className={`og-drop ${over ? 'is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) filesFromDrop(e.dataTransfer).then(add).catch(() => setNote('No he podido leer esa carpeta.')) }} aria-label="Organizar con tus documentos">
      <div className="og-pick">
        <button className="og-drop-ic" onClick={() => setMenu(!menu)} disabled={busy} aria-expanded={menu} aria-label="Subir documentos" title="Subir documentos"><Icon name="upload" size={30} color="#3185FC" /></button>
        {menu && (
          <>
            <span className="sc-back" onClick={() => setMenu(false)} />
            <div className="card og-pick-menu" role="menu">
              <button role="menuitem" onClick={() => { setMenu(false); input.current?.click() }}><Icon name="pdf" size={18} color="#E84855" />PDF</button>
              <button role="menuitem" onClick={() => { setMenu(false); folderInput.current?.click() }}><Icon name="folder" size={18} color="#3185FC" />Carpeta</button>
            </div>
          </>
        )}
      </div>
      <input ref={input} type="file" accept="application/pdf" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <input ref={folderInput} type="file" multiple hidden {...{ webkitdirectory: '', directory: '' }} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <div className="og-drop-body">
        <b className="og-drop-title">Sube tus PDF o una carpeta</b>
        <span className="muted">Te los ordeno en unidades y temas, y lo revisas antes de crear nada.</span>
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
      <button className="og-go" onClick={run} disabled={busy || !files.length}><Icon name="star" size={16} />Organizar</button>
    </section>
  )
}
