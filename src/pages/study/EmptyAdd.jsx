import { useRef } from 'react'
import Icon from '../../components/Icon.jsx'

/** Pestaña vacía: tarjeta centrada con dos caminos, crear a mano o subir directamente un PDF. */
export default function EmptyAdd({ icon, title, text, createLabel, onCreate, onPdf }) {
  const input = useRef(null)
  return (
    <div className="ea">
      <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPdf(f) }} />
      <span className="ea-ic"><Icon name={icon} size={30} color="#3185FC" /></span>
      <b className="ea-t">{title}</b>
      <span className="ea-s">{text}</span>
      <span className="ea-actions">
        <button type="button" className="pill pill-on ea-main" onClick={onCreate}><Icon name="plus" size={16} color="#fff" strokeWidth={2.8} />{createLabel}</button>
        <button type="button" className="pill ea-second" onClick={() => input.current?.click()}><Icon name="upload" size={16} />Subir PDF</button>
      </span>
    </div>
  )
}
