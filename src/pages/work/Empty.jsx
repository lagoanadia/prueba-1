import Icon from '../../components/Icon.jsx'

/** Bloque vacío de Trabajo: icono grande y suave, una frase corta y, si hace falta, el botón para empezar. */
export default function Empty({ icon, text, action, onAction }) {
  return (
    <div className="wk-empty-state">
      <span className="wk-empty-ic"><Icon name={icon} size={30} color="#E84855" /></span>
      <span className="wk-empty-t">{text}</span>
      {action && <button type="button" className="pill sh-save" onClick={onAction}><Icon name="plus" size={16} color="#fff" />{action}</button>}
    </div>
  )
}
