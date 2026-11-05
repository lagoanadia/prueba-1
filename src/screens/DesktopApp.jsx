import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import RingArcs from '../components/RingArcs.jsx'
import Donut from '../components/Donut.jsx'
import TodayTasks from '../components/TodayTasks.jsx'
import Upcoming from '../components/Upcoming.jsx'
import BlankPage from './BlankPage.jsx'
import { AREAS, getArea } from '../data/areas.js'
import { formatToday } from '../lib/dates.js'

/** Vista portátil: menú lateral + contenido. */
export default function DesktopApp({ firstName, today, upcoming, onToggle, onTalk, onSignOut }) {
  const [view, setView] = useState('inicio')

  const NavItem = ({ id, label, color = '#F1F3F4' }) => (
    <button className={`nv ${view === id ? 'on' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
      <span className="ic" style={{ background: id === 'inicio' && view === id ? '#FFFFFF' : color }}><Icon name={id} /></span>
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

      <main className="d-main" key={view}>
        <div className="d-top">
          <button className="talk-pill" onClick={onTalk} aria-label="Hablar con el asistente">
            <RingArcs size={36} stroke={4} className="spin-slow" />Hablar
          </button>
        </div>

        {view === 'inicio' && (
          <div className="d-home">
            <h1 className="hello hello-xl rise">Hola, {firstName}</h1>
            <div className="rise" style={{ '--i': 1, width: '100%', display: 'flex', justifyContent: 'center' }}><Donut entries={today} /></div>
            <p className="date rise" style={{ '--i': 2 }}>{formatToday()}</p>
            <div className="rise" style={{ '--i': 3, width: '100%', maxWidth: 860 }}><TodayTasks entries={today} onToggle={onToggle} /></div>
            <div className="rise" style={{ '--i': 4, width: '100%', maxWidth: 860 }}><Upcoming entries={upcoming} /></div>
          </div>
        )}
        {area && <BlankPage title={area.label} icon={area.id} color={area.color} />}
        {view === 'calendario' && <BlankPage title="Calendario" icon="calendario" />}
        {view === 'perfil' && (
          <BlankPage title="Perfil" icon="perfil">
            <button className="btn-secondary" onClick={onSignOut}>Cerrar sesión</button>
          </BlankPage>
        )}
      </main>
    </div>
  )
}
