import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import RingArcs from '../components/RingArcs.jsx'
import Donut from '../components/Donut.jsx'
import TodayTasks from '../components/TodayTasks.jsx'
import BlankPage from './BlankPage.jsx'
import AreaScreen from './AreaScreen.jsx'
import AvatarEditor from './AvatarEditor.jsx'
import Avatar from '../components/Avatar.jsx'
import { AREAS, getArea } from '../data/areas.js'
import { formatToday } from '../lib/dates.js'

/** Vista portátil: menú lateral + contenido. */
export default function DesktopApp({ firstName, today, onToggle, onTalk, onSignOut, avatar, onSaveAvatar }) {
  const [view, setView] = useState('inicio')

  const NavItem = ({ id, label, color = '#F1F3F4' }) => (
    <button className={`nv ${view === id ? 'on' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
      <span className="ic" style={{ background: id === 'inicio' && view === id ? '#FFFFFF' : color }}>
        {id === 'perfil' ? <Avatar avatar={avatar} size={40} /> : <Icon name={id} />}
      </span>
      {label}
    </button>
  )

  const area = getArea(view)

  return (
    <div className="d-app">
      <nav className="sidebar" aria-label="Navegación">
        <NavItem id="inicio" label="Inicio" color="#FFFFFF" />
        <p className="eyebrow sidebar-title">Mis áreas</p>
        {AREAS.map((a) => <NavItem key={a.id} id={a.id} label={a.label} color={a.color} />)}
        <div style={{ flex: 1 }} />
        <NavItem id="calendario" label="Calendario" />
        <NavItem id="perfil" label="Perfil" />
      </nav>

      {/* El main NO lleva key: así el botón de hablar no se vuelve a montar (ni a animar) al cambiar de sección */}
      <main className="d-main">
        <div className="d-top">
          <button className="talk-circle" onClick={onTalk} aria-label="Hablar con el asistente" title="Hablar con el asistente">
            <RingArcs size={68} stroke={4} />
            <span className="talk-circle-inner">
              {/* Ondas de sonido: se mueven una vez al abrir la app y se quedan quietas */}
              <svg aria-hidden="true" width="34" height="24" viewBox="0 0 112 72" fill="none" strokeWidth="7" strokeLinecap="round">
                {['#3185FC', '#E84855', '#F9DC5C', '#3DDC97'].map((c, i) => (
                  <path key={c} className="wave-once" style={{ '--w': i }} stroke={c}
                    d={`M2 ${12 + i * 16}C16 ${4 + i * 16} 30 ${20 + i * 16} 44 ${12 + i * 16}S72 ${4 + i * 16} 86 ${12 + i * 16}S102 ${18 + i * 16} 110 ${12 + i * 16}`} />
                ))}
              </svg>
            </span>
          </button>
        </div>

        <div className="d-view" key={view}>
        {view === 'inicio' && (
          <div className="d-home">
            <h1 className="hello hello-xl rise">Hola, {firstName}</h1>
            <div className="rise" style={{ '--i': 1, width: '100%', display: 'flex', justifyContent: 'center' }}><Donut entries={today} /></div>
            <p className="date rise" style={{ '--i': 2 }}>{formatToday()}</p>
            <div className="rise" style={{ '--i': 3, width: '100%', maxWidth: 860 }}><TodayTasks entries={today} onToggle={onToggle} /></div>
          </div>
        )}
        {area && <AreaScreen area={area} key={area.id} />}
        {view === 'calendario' && <BlankPage title="Calendario" icon="calendario" />}
        {view === 'perfil' && (
          <BlankPage title="Perfil" icon="perfil">
            <AvatarEditor avatar={avatar} onSave={onSaveAvatar} onSignOut={onSignOut} />
          </BlankPage>
        )}
        </div>
      </main>
    </div>
  )
}
