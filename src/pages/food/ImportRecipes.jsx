import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { extractPdfPages } from '../../lib/pdfText.js'
import { extractRecipes } from '../../services/recipesService.js'
import { MEALS, dishesOf } from '../../widgets/comida/food.js'
import Modal from './Modal.jsx'

const CHUNK = 8000 // letras que se mandan a la IA cada vez
const MAX_CHUNKS = 8
/** Foto -> JPEG reducido (lado largo 1600 px) como data URL: se manda mucho menos y se lee igual. */
async function photoToDataUrl(file) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}
const norm = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Trozos de texto con páginas enteras (sin partir una página por la mitad si cabe). */
function chunksOf(pages) {
  const out = []
  let cur = ''
  for (const p of pages) {
    if (cur && cur.length + p.length > CHUNK) { out.push(cur); cur = '' }
    cur += `${p}\n`
  }
  if (cur.trim()) out.push(cur)
  return out.slice(0, MAX_CHUNKS)
}

/**
 * Importar recetas de un PDF: se lee en tu navegador, la IA propone las recetas con su tipo de comida,
 * ingredientes y pasos, y tú eliges cuáles guardar. No se guarda nada hasta pulsar «Guardar».
 */
export default function ImportRecipes({ data, update, onClose }) {
  const input = useRef(null)
  const [phase, setPhase] = useState('pick') // pick | reading | review
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [items, setItems] = useState([]) // { ...receta, on, dup }
  const [msg, setMsg] = useState('')
  const have = new Set(dishesOf(data).map((d) => norm(d.name)))

  const run = async (files) => {
    const f = files[0]
    setFile(f); setPhase('reading'); setMsg('')
    const found = []
    let failed = 0
    let why = '' // último motivo del fallo, para poder contarlo
    let note = ''
    if (f.type.startsWith('image/')) {
      // Una o varias fotos
      const photos = files.filter((x) => x.type.startsWith('image/')).slice(0, 6)
      setProgress({ done: 0, total: photos.length })
      for (const ph of photos) {
        try { found.push(...(await extractRecipes(null, await photoToDataUrl(ph)))) } catch (e) { failed++; why = e.message }
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    } else {
      const doc = await extractPdfPages(f)
      if (!doc.readable) { setPhase('pick'); setMsg('No he podido leer texto en ese PDF (puede ser un escaneo). Prueba con otro o hazle una foto.'); return }
      const chunks = chunksOf(doc.pages)
      setProgress({ done: 0, total: chunks.length })
      for (const text of chunks) {
        try { found.push(...(await extractRecipes(text))) } catch (e) { failed++; why = e.message }
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
      if (doc.total > doc.pages.length) note = `Solo he leído las primeras ${doc.pages.length} páginas.`
    }
    // Sin repetir (el mismo nombre en dos trozos se queda con la versión más completa)
    const byName = new Map()
    for (const r of found) {
      const k = norm(r.name)
      const prev = byName.get(k)
      if (!prev || r.ingredients.length + r.steps.length > prev.ingredients.length + prev.steps.length) byName.set(k, r)
    }
    const list = [...byName.values()].map((r) => ({ ...r, meals: r.meals.length ? r.meals : ['comida'], dup: have.has(norm(r.name)), on: !have.has(norm(r.name)) }))
    if (!list.length) { setPhase('pick'); setMsg(failed ? (why || 'La IA no ha podido leerlo ahora mismo. Inténtalo de nuevo.') : 'No he encontrado recetas ahí.'); return }
    setItems(list); setPhase('review')
    setMsg(failed ? 'Algunas partes no se han podido leer; puede que falten recetas.' : note)
  }

  const toggle = (i) => setItems((l) => l.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))
  const toggleMeal = (i, m) => setItems((l) => l.map((x, j) => (j === i ? { ...x, meals: x.meals.includes(m) ? x.meals.filter((y) => y !== m) : [...x.meals, m] } : x)))
  const picked = items.filter((x) => x.on && x.meals.length)
  const save = () => {
    update((d) => ({
      ...d,
      dishes: [...dishesOf(d), ...picked.map((r) => ({ id: crypto.randomUUID(), name: r.name, for: Object.keys(MEALS).filter((m) => r.meals.includes(m)), time: r.time, ingredients: r.ingredients, steps: r.steps }))],
    }))
    onClose()
  }

  return (
    <Modal title="Importar recetas" dot onClose={onClose} wide>
      {phase !== 'review' && (
        <div className="fd-form">
          <button className="fd-import-drop" onClick={() => input.current?.click()} disabled={phase === 'reading'}>
            <Icon name="upload" size={28} color="#3185FC" />
            <b>{phase === 'reading' ? 'Leyendo las recetas…' : 'Elige un PDF o haz una foto'}</b>
            {phase === 'reading' && <span className="fd-hint">{progress.total ? `Parte ${Math.min(progress.done + 1, progress.total)} de ${progress.total}` : 'Abriendo el archivo…'}</span>}
          </button>
          <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) run(fs) }} />
          {msg && <p className="fd-hint" role="status">{msg}</p>}
        </div>
      )}
      {phase === 'review' && (
        <div className="fd-form">
          <div className="fd-import-file"><Icon name={file?.type?.startsWith('image/') ? 'img' : 'pdf'} size={20} color="#E84855" /><b>{file?.name}</b></div>
          <p className="fd-hint">He encontrado {items.length} receta{items.length === 1 ? '' : 's'}. Quita las que no quieras y ajusta el tipo de comida; no se guarda nada hasta que lo confirmes.</p>
          {msg && <p className="fd-hint" role="status">{msg}</p>}
          <ul className="fd-import-list">
            {items.map((r, i) => (
              <li key={r.name + i} className={r.on ? 'is-on' : ''}>
                <button className="fd-import-chk" onClick={() => toggle(i)} aria-pressed={r.on} aria-label={`${r.on ? 'Quitar' : 'Elegir'} ${r.name}`}>{r.on && <Icon name="check" size={12} color="#fff" strokeWidth={3.4} />}</button>
                <div>
                  <b>{r.name}</b>{r.dup && <em> · ya la tienes</em>}
                  <div className="fd-chips">
                    {Object.entries(MEALS).map(([id, label]) => <button key={id} className={`fd-chip ${r.meals.includes(id) ? 'is-on' : ''}`} style={{ padding: '1px 9px', fontSize: 11.5 }} onClick={() => toggleMeal(i, id)} aria-pressed={r.meals.includes(id)}>{label}</button>)}
                    <span className="fd-hint">{r.ingredients.length} ingredientes · {r.steps.length} pasos</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="fd-row"><span className="fd-hint">{picked.length} de {items.length} seleccionadas</span><span className="fd-grow" /><button className="fd-save" disabled={!picked.length} onClick={save}><Icon name="check" size={16} />Guardar {picked.length} receta{picked.length === 1 ? '' : 's'}</button></div>
        </div>
      )}
    </Modal>
  )
}
