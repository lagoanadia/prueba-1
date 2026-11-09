import { useEffect, useRef } from 'react'
import Icon from '../Icon.jsx'

/** Tabla editable: la primera fila es la cabecera. Al pasar por encima salen + fila, + columna y quitar. */
export default function TableBlock({ block, onChange, focus, onFocused }) {
  const rows = block.rows ?? [['']]
  const first = useRef(null)
  useEffect(() => { if (focus) { first.current?.focus(); onFocused?.() } }, [focus])
  const set = (r) => onChange({ ...block, rows: r })
  const cell = (r, c, v) => set(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)))
  const cols = rows[0].length
  const addRow = () => set([...rows, Array(cols).fill('')])
  const addCol = () => set(rows.map((r) => [...r, '']))
  const delRow = (i) => rows.length > 1 && set(rows.filter((_, k) => k !== i))
  const delCol = (j) => cols > 1 && set(rows.map((r) => r.filter((_, k) => k !== j)))

  return (
    <div className="tb-wrap">
      <table className="tb">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className={i === 0 ? 'is-head' : ''}>
                  <input ref={i === 0 && j === 0 ? first : null} value={v} onChange={(e) => cell(i, j, e.target.value)} aria-label={`Fila ${i + 1}, columna ${j + 1}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' && i === rows.length - 1 && j === cols - 1) { e.preventDefault(); addRow() } }} />
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
