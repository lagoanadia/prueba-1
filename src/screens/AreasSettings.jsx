import Icon from '../components/Icon.jsx'
import { AREAS } from '../data/areas.js'

const DESC = {
  estudios: 'Asignaturas, temario, apuntes y progreso',
  salud: 'Planificación semanal, pasos y deportes',
  journal: 'Mood, metas, cápsulas del tiempo y pixels',
  trabajo: 'Proyectos, tareas y prioridades',
  comida: 'Menú semanal, recetario y compra',
}

/** Gestión de áreas: activar, quitar y volver a añadir. Nada es obligatorio. */
export default function AreasSettings({ settings, onSave }) {
  const set = (id, patch) => onSave({ ...settings, areas: { ...settings.areas, [id]: { ...settings.areas[id], ...patch } } })
  const mine = AREAS.filter((a) => settings.areas[a.id].added)
  const others = AREAS.filter((a) => !settings.areas[a.id].added)
  const preview = mine.filter((a) => settings.areas[a.id].active)

  return (
    <div className="areas-set">
      <section>
        <h2 className="page-h2">Mis áreas</h2>
        <ul className="area-rows">
          {mine.map((a) => {
            const on = settings.areas[a.id].active
            return (
              <li key={a.id} className="card area-row">
                <span className="ic" style={{ background: a.color }}><Icon name={a.id} /></span>
                <span className="area-row-text"><b>{a.label}</b><span className="muted">{DESC[a.id]}</span></span>
                <button className="switch" role="switch" aria-checked={on} aria-label={`${on ? 'Desactivar' : 'Activar'} ${a.label}`} onClick={() => set(a.id, { active: !on })}>
                  <span className="switch-knob" />
                </button>
                <button className="pill" onClick={() => set(a.id, { added: false, active: false })}>Quitar</button>
              </li>
            )
          })}
          {mine.length === 0 && <li className="muted">No tienes ninguna área. Añade alguna abajo.</li>}
        </ul>
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="page-h2">Añadir áreas</h2>
          <ul className="area-rows">
            {others.map((a) => (
              <li key={a.id} className="card area-row is-off">
                <span className="ic" style={{ background: '#E8EAED' }}><Icon name={a.id} /></span>
                <span className="area-row-text"><b>{a.label}</b><span className="muted">{DESC[a.id]}</span></span>
                <button className="pill pill-on" onClick={() => set(a.id, { added: true, active: true })}>Añadir</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="page-h2">Así queda tu barra lateral</h2>
        <div className="side-preview" aria-label="Vista previa de la barra lateral">
          {preview.map((a) => <span key={a.id} className="side-chip"><i style={{ background: a.color }} />{a.label}</span>)}
          {preview.length === 0 && <span className="muted">Solo Inicio, Calendario y Perfil.</span>}
        </div>
      </section>

      <section>
        <h2 className="page-h2">Tamaño del texto</h2>
        <div className="seg" role="group" aria-label="Tamaño del texto">
          <button className={`pill ${!settings.bigText ? 'pill-soft' : ''}`} aria-pressed={!settings.bigText} onClick={() => onSave({ ...settings, bigText: false })}>Normal</button>
          <button className={`pill ${settings.bigText ? 'pill-soft' : ''}`} aria-pressed={settings.bigText} onClick={() => onSave({ ...settings, bigText: true })}>Grande</button>
        </div>
      </section>
    </div>
  )
}
