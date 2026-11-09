import Icon from '../components/Icon.jsx'
import { applyLang, getLang } from '../i18n/index.js'
import { AREAS } from '../data/areas.js'

const DESC = {
  estudios: 'Asignaturas, temario, apuntes y progreso',
  salud: 'Planificación semanal, pasos y deportes',
  journal: 'Mood, metas, cápsulas del tiempo y pixels',
  trabajo: 'Proyectos, tareas y prioridades',
  comida: 'Menú semanal, recetario y compra',
}

/** Ajustes de la barra lateral: cada área se activa o desactiva con su interruptor (gris = desactivada). */
export default function AreasSettings({ settings, onSave }) {
  const toggle = (id) => onSave({ ...settings, areas: { ...settings.areas, [id]: { added: true, active: !settings.areas[id].active } } })
  const preview = AREAS.filter((a) => settings.areas[a.id].active)

  const Switch = ({ on, label, onClick }) => (
    <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={onClick}><span className="switch-knob" /></button>
  )

  return (
    <div className="areas-set">
      <ul className="area-rows">
        {AREAS.map((a) => {
          const on = settings.areas[a.id].active
          return (
            <li key={a.id} className={`card area-row ${on ? '' : 'is-off'}`}>
              <span className="ic" style={{ background: on ? a.color : '#E8EAED' }}><Icon name={a.id} /></span>
              <span className="area-row-text"><b>{a.label}</b><span className="muted">{DESC[a.id]}</span></span>
              <Switch on={on} label={`${on ? 'Desactivar' : 'Activar'} ${a.label}`} onClick={() => toggle(a.id)} />
            </li>
          )
        })}
        <li className="card area-row">
          <span className="ic" style={{ background: '#F1F3F4' }}><Icon name="eye" /></span>
          <span className="area-row-text"><b>Ocultar nombres de la barra lateral</b><span className="muted">Solo se ven los iconos</span></span>
          <Switch on={settings.iconsOnly} label="Ocultar nombres de la barra lateral" onClick={() => onSave({ ...settings, iconsOnly: !settings.iconsOnly })} />
        </li>
        <li className="card area-row">
          <span className="ic" style={{ background: '#F1F3F4' }}><Icon name="doc" /></span>
          <span className="area-row-text"><b>Idioma</b></span>
          <span className="lang-seg" role="radiogroup" aria-label="Idioma" data-no-i18n>
            {[['es', 'Español'], ['en', 'English']].map(([id, label]) => (
              <button key={id} role="radio" aria-checked={getLang() === id} className={getLang() === id ? 'on' : ''}
                onClick={async () => { if (getLang() === id) return; await onSave({ ...settings, lang: id }); applyLang(id); location.reload() }}>{label}</button>
            ))}
          </span>
        </li>
      </ul>

      <div className="side-preview" role="img" aria-label="Así queda tu barra lateral">
        {preview.map((a) => <span key={a.id} className="side-chip"><i style={{ background: a.color }} />{a.label}</span>)}
        {preview.length === 0 && <span className="muted">Solo Inicio, Calendario y Perfil.</span>}
      </div>
    </div>
  )
}
