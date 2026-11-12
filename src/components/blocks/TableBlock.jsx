import { useEffect, useLayoutEffect, useRef } from 'react'
import Icon from '../Icon.jsx'

/** Tabla editable: la primera fila es la cabecera. Al pasar por encima salen + fila, + columna y quitar. */
export default function TableBlock({ block, onChange, focus, onFocused }) {
  const rows = block.rows ?? [['']]
  const first = useRef(null)
  const wrap = useRef(null)
  useEffect(() => { if (focus) { first.current?.focus(); onFocused?.() } }, [focus])
  // Las celdas crecen con su texto: nada se corta (se reajusta al escribir, al cambiar el ancho y al cargar)
  const fit = () => wrap.current?.querySelectorAll('textarea').forEach((t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` })
  useLayoutEffect(fit)
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const set = (r) => onChange({ ...block, rows: r })
  const cell = (r, c, v) => set(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)))
  const cols = rows[0].length
  const addRow = () => set([...rows, Array(cols).fill('')])
  const addCol = () => set(rows.map((r) => [...r, '']))
  const delRow = (i) => rows.length > 1 && set(rows.filter((_, k) => k !== i))
  const delCol = (j) => cols > 1 && set(rows.map((r) => r.filter((_, k) => k !== j)))

  return (
    <div className="tb-wrap" ref={wrap}>
      <table className="tb">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className={i === 0 ? 'is-head' : ''}>
                  <textarea ref={i === 0 && j === 0 ? first : null} rows={1} value={v} onChange={(e) => cell(i, j, e.target.value)} aria-label={`Fila ${i + 1}, columna ${j + 1}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (i === rows.length - 1 && j === cols - 1) addRow() } }} />
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
