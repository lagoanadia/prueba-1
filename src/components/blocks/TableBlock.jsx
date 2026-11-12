import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'

const MIN_COL = 70 // ancho mínimo de una columna (px)
const MIN_ROW = 36
const MAX_ROW = 420

/**
 * Tabla editable: la primera fila es la cabecera. Al pasar por encima salen + fila, + columna y quitar.
 * Los bordes de columnas y filas se arrastran para darles el tamaño que quieras (con un mínimo y un máximo);
 * doble clic en un borde vuelve al tamaño automático. Se guarda en `colW` (fracciones) y `rowH` (px).
 */
export default function TableBlock({ block, onChange, focus, onFocused }) {
  const rows = block.rows ?? [['']]
  const first = useRef(null)
  const wrap = useRef(null)
  const [live, setLive] = useState(null) // { colW?, rowH? } mientras se arrastra un borde
  const [tw, setTw] = useState(0) // ancho disponible de la tabla (px)
  useEffect(() => { if (focus) { first.current?.focus(); onFocused?.() } }, [focus])
  // Las celdas crecen con su texto: nada se corta (se reajusta al escribir, al cambiar el ancho y al cargar)
  const fit = () => wrap.current?.querySelectorAll('textarea').forEach((t) => { t.style.height = 'auto'; t.style.height = `${Math.max(t.scrollHeight, Number(t.dataset.rh) || 0)}px` })
  useLayoutEffect(fit)
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
  const set = (r) => onChange({ ...block, rows: r })
  const cell = (r, c, v) => set(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)))
  const addRow = () => set([...rows, Array(cols).fill('')])
  const addCol = () => onChange({ ...block, colW: undefined, rows: rows.map((r) => [...r, '']) })
  const delRow = (i) => rows.length > 1 && onChange({ ...block, rowH: rowH?.filter((_, k) => k !== i), rows: rows.filter((_, k) => k !== i) })
  const delCol = (j) => cols > 1 && onChange({ ...block, colW: undefined, rows: rows.map((r) => r.filter((_, k) => k !== j)) })

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
          {widths.map((f, j) => <col key={j} style={{ width: tw ? Math.max(40, Math.round(f * (tw - (rows.length > 1 ? 28 : 0)))) : `${(f * 100).toFixed(2)}%` }} />)}
          {rows.length > 1 && <col style={{ width: 28 }} />}
        </colgroup>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={rowH?.[i] ? { height: rowH[i] } : undefined}>
              {row.map((v, j) => (
                <td key={j} className={i === 0 ? 'is-head' : ''}>
                  <textarea ref={i === 0 && j === 0 ? first : null} rows={1} data-rh={rowH?.[i] ? rowH[i] - 4 : undefined} value={v} onChange={(e) => cell(i, j, e.target.value)} aria-label={`Fila ${i + 1}, columna ${j + 1}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (i === rows.length - 1 && j === cols - 1) addRow() } }} />
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
      <div className="tb-add">
        <button onClick={addRow}><Icon name="plus" size={14} />Fila</button>
        <button onClick={addCol}><Icon name="plus" size={14} />Columna</button>
      </div>
    </div>
  )
}
