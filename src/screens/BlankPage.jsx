import Icon from '../components/Icon.jsx'

/** Página en blanco para las secciones que aún no están hechas. */
export default function BlankPage({ title, icon, color = '#F1F3F4', children }) {
  return (
    <div className="blank">
      <h1><span className="ic" style={{ background: color }}><Icon name={icon} /></span><span className="sr-only">{title}</span></h1>
      {children}
    </div>
  )
}
