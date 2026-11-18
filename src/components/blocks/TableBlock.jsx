import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { sanitize } from '../../lib/richText.js'

const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const textOf = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent ?? '' }

/** Celda con formato (negrita, cursiva, subrayado con Ctrl+B / I / U). Solo reescribe su contenido cuando cambia desde fuera. */
function Cell({ html, onChange, onKeyDown, label, minH, cellRef }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html }, [html])
  return (
    <div ref={(el) => { ref.current = el; if (cellRef) cellRef(el) }} className="tb-cell" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label}
      style={minH ? { minHeight: minH } : undefined}
      onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))} onKeyDown={onKeyDown}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }} spellCheck />
  )
}

const END = 46 // columna de la derecha: la barra de añadir columna (pegada a la tabla) y la x de quitar fila
const MIN_COL = 70 // ancho mínimo de una columna (px)
const MIN_ROW = 36
const MAX_ROW = 420

/**
 * Tabla editable: la primera fila es la cabecera. Al pasar por encima salen + fila, + columna y quitar.
 * Los bordes de columnas y filas se arrastran para darles el tamaño que quieras (con un mínimo y un máximo);
 * doble clic en un borde vuelve al tamaño automático. Se guarda en `colW` (fracciones) y `rowH` (px).
 */
const caretStart = (el) => { const sel = window.getSelection(); if (!sel?.rangeCount || !sel.isCollapsed || !el.contains(sel.anchorNode)) return false; const r = sel.getRangeAt(0).cloneRange(); r.selectNodeContents(el); r.setEnd(sel.anchorNode, sel.anchorOffset); return r.toString().length === 0 }

export default function TableBlock({ block, onChange, focus, onFocused }) {
  // Las celdas guardan HTML con formato (block.rich). Las tablas antiguas guardaban texto plano: se leen escapadas y se convierten al primer cambio.
  const asHtml = (v) => (block.rich ? v ?? '' : esc(v).replace(/\n/g, '<br>'))
  const rows = (block.rows ?? [['']]).map((r) => r.map(asHtml))
  const first = useRef(null)
  const wrap = useRef(null)
  const [live, setLive] = useState(null) // { colW?, rowH? } mientras se arrastra un borde
  const [tw, setTw] = useState(0) // ancho disponible de la tabla (px)
  useEffect(() => { if (focus) { first.current?.focus(); onFocused?.() } }, [focus])
  // Las celdas crecen con su texto: nada se corta (se reajusta al escribir, al cambiar el ancho y al cargar)
  const fit = () => {} // las celdas crecen solas con su texto
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => { setTw(el.clientWidth); fit() })
    ro.observe(el)
    setTw(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const cols = rows[0].length
  const colW = live?.colW ?? block.colW
  const rowH = live?.rowH ?? block.rowH
  const widths = colW && colW.length === cols ? colW : Array(cols).fill(1 / cols)
  const set = (r) => onChange({ ...block, rich: true, rows: r })
  const cell = (r, c, v) => set(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)))
  const addRow = () => set([...rows, Array(cols).fill('')])
  const addCol = () => onChange({ ...block, rich: true, colW: undefined, rows: rows.map((r) => [...r, '']) })
  // Retroceso al principio de una celda: su texto sube a la celda de arriba (y la fila se quita si se queda vacía)
  const joinUp = (i, j) => {
    const up = rows[i - 1][j]
    const down = rows[i][j]
    const merged = up && down ? `${up} ${down}` : up || down
    let next = rows.map((row, r) => (r === i - 1 ? row.map((x, c) => (c === j ? merged : x)) : r === i ? row.map((x, c) => (c === j ? '' : x)) : row))
    let rh = rowH
    if (next[i].every((x) => !textOf(x).trim()) && rows.length > 2) { next = next.filter((_, r) => r !== i); rh = rowH?.filter((_, r) => r !== i) }
    onChange({ ...block, rich: true, rowH: rh, rows: next })
    const at = textOf(up).length
    setTimeout(() => { // el cursor queda en la unión
      const t = wrap.current?.querySelectorAll('tr')[i - 1]?.querySelectorAll('.tb-cell')[j]
      if (!t) return
      t.focus()
      const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let left = at; let n
      const r = document.createRange(); r.selectNodeContents(t); r.collapse(false)
      while ((n = w.nextNode())) { if (left <= n.length) { r.setStart(n, left); r.collapse(true); break } left -= n.length }
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
    }, 30)
  }
  const delRow = (i) => rows.length > 1 && onChange({ ...block, rich: true, rowH: rowH?.filter((_, k) => k !== i), rows: rows.filter((_, k) => k !== i) })
  const delCol = (j) => cols > 1 && onChange({ ...block, rich: true, colW: undefined, rows: rows.map((r) => r.filter((_, k) => k !== j)) })

  // Arrastrar el borde derecho de la columna j: se reparte entre ella y la siguiente
  const dragCol = (e, j) => {
    e.preventDefault(); e.stopPropagation()
    const tbl = e.currentTarget.closest('table')
    const cells = [...tbl.querySelectorAll('tr:first-child > td:not(.tb-end)')]
    const W = cells.reduce((n, c) => n + c.getBoundingClientRect().width, 0)
    const scale = tbl.getBoundingClientRect().width / tbl.offsetWidth || 1
    const minF = (MIN_COL * scale) / W
    const base = widths
    const x0 = e.clientX
    let last = base
    const move = (ev) => {
      const d = Math.min(Math.max((ev.clientX - x0) / W, minF - base[j]), base[j + 1] - minF)
      last = base.map((f, k) => (k === j ? f + d : k === j + 1 ? f - d : f))
      setLive({ colW: last })
    }
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); setLive(null); onChange({ ...block, colW: last }) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }
  // Arrastrar el borde de abajo de la fila i
  const dragRow = (e, i) => {
    e.preventDefault(); e.stopPropagation()
    const tr = e.currentTarget.closest('tr')
    const tbl = tr.closest('table')
    const scale = tbl.getBoundingClientRect().width / tbl.offsetWidth || 1
    const h0 = tr.getBoundingClientRect().height / scale
    const y0 = e.clientY
    const base = rows.map((_, k) => rowH?.[k] ?? 0)
    let last = base
    const move = (ev) => {
      const h = Math.min(Math.max(h0 + (ev.clientY - y0) / scale, MIN_ROW), MAX_ROW)
      last = base.map((x, k) => (k === i ? Math.round(h) : x))
      setLive({ rowH: last })
    }
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); setLive(null); onChange({ ...block, rowH: last }) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }
  const resetCols = () => onChange({ ...block, colW: undefined })
  const resetRow = (i) => onChange({ ...block, rowH: rows.map((_, k) => (k === i ? 0 : rowH?.[k] ?? 0)) })

  return (
    <div className="tb-wrap" ref={wrap}>
      <table className="tb">
        <colgroup>
          {widths.map((f, j) => <col key={j} style={{ width: tw ? Math.max(40, Math.round(f * (tw - (rows.length > 1 ? END : 0)))) : `${(f * 100).toFixed(2)}%` }} />)}
          {rows.length > 1 && <col style={{ width: END }} />}
        </colgroup>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={rowH?.[i] ? { height: rowH[i] } : undefined}>
              {row.map((v, j) => (
                <td key={j} className={i === 0 ? 'is-head' : ''}>
                  <Cell cellRef={i === 0 && j === 0 ? (el) => { first.current = el } : null} html={v} minH={rowH?.[i] ? rowH[i] - 4 : undefined} label={`Fila ${i + 1}, columna ${j + 1}`} onChange={(h) => cell(i, j, h)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && i > 0 && caretStart(e.currentTarget)) { e.preventDefault(); joinUp(i, j) }
                      else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (i === rows.length - 1 && j === cols - 1) addRow() }
                      else if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak') }
                    }} />
                  {j < cols - 1 && <span className="tb-rz tb-rz-c" onPointerDown={(e) => dragCol(e, j)} onDoubleClick={resetCols} title="Arrastra para cambiar el ancho (doble clic: automático)" />}
                  <span className="tb-rz tb-rz-r" onPointerDown={(e) => dragRow(e, i)} onDoubleClick={() => resetRow(i)} title="Arrastra para cambiar el alto (doble clic: automático)" />
                  {i === 0 && cols > 1 && <button className="tb-x tb-x-col" onClick={() => delCol(j)} aria-label={`Quitar la columna ${j + 1}`}><Icon name="close" size={12} /></button>}
                </td>
              ))}
              {rows.length > 1 && <td className="tb-end"><button className="tb-x" onClick={() => delRow(i)} aria-label={`Quitar la fila ${i + 1}`}><Icon name="close" size={12} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="tb-addcol" style={{ right: (rows.length > 1 ? END : 0) - 22.5 }} onClick={addCol} aria-label="Añadir columna" title="Añadir columna"><Icon name="plus" size={14} strokeWidth={2.4} /></button>
      <button type="button" className="tb-addrow" style={{ right: rows.length > 1 ? END : 0 }} onClick={addRow} aria-label="Añadir fila" title="Añadir fila"><Icon name="plus" size={14} strokeWidth={2.4} /></button>
    </div>
  )
}
