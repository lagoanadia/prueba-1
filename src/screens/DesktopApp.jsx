import { useMemo, useState } from 'react'
import { FocusCtx } from './focus.js'
import Icon from '../components/Icon.jsx'
import Donut from '../components/Donut.jsx'
import TodayTasks from '../components/TodayTasks.jsx'
import BlankPage from './BlankPage.jsx'
import AreaScreen from './AreaScreen.jsx'
import AvatarEditor from './AvatarEditor.jsx'
import AreasSettings from './AreasSettings.jsx'
import CalendarPage from './CalendarPage.jsx'
import Avatar from '../components/Avatar.jsx'
import { AREAS } from '../data/areas.js'
import { activeAreaIds } from '../data/settings.js'
import { formatToday } from '../lib/dates.js'
import useFriendRequests from '../hooks/useFriendRequests.js'

/** Vista portátil: menú lateral + contenido. */
export default function DesktopApp({ firstName, today, onHome, entries, toggleEntry, onTalk, onSignOut, avatar, onSaveAvatar, settings, onSaveSettings }) {
  const [view, setView] = useState('inicio')
  const requests = useFriendRequests() // peticiones de amistad sin responder
  const [focus, setFocus] = useState(false) // modo concentración (unidad de Estudios): la casa pliega el menú
  const [navOpen, setNavOpen] = useState(true)
  const focusCtx = useMemo(() => ({ setFocus: (v) => { setFocus(v); if (!v) setNavOpen(true) } }), [])
  const pending = today.filter((i) => !i.done) // lo tachado sale de la lista y de la rueda
  const visible = AREAS.filter((a) => activeAreaIds(settings).includes(a.id)) // solo las activas, sin huecos

  const NavItem = ({ id, label, color = '#F1F3F4' }) => (
    <button className={`nv ${view === id ? 'on' : ''}`} onClick={() => { if (id === 'inicio' && focus) { setNavOpen(!navOpen); return } setView(id); if (id === 'inicio') onHome?.() }} aria-current={view === id ? 'page' : undefined}
      style={view === id && id !== 'inicio' && color !== '#F1F3F4' ? { background: `color-mix(in srgb, ${color} 22%, #FFFFFF)` } : undefined}>
      <span className="ic" style={{ background: id === 'inicio' && view === id ? '#FFFFFF' : color }}>
        {id === 'perfil' ? <Avatar avatar={avatar} size={40} /> : <Icon name={id} />}
        {id === 'perfil' && requests > 0 && <span className="notif-badge" aria-label={`${requests} peticiones de amistad`}>{requests}</span>}
      </span>
      {label}
    </button>
  )

  const area = visible.find((a) => a.id === view) // un área desactivada no se abre

  return (
    <FocusCtx.Provider value={focusCtx}>
    <div className="d-app">
      {focus && !navOpen ? (
        <nav className="sidebar sidebar-slim" aria-label="Navegación">
          <button className="nv nv-slim" onClick={() => setNavOpen(true)} aria-label="Mostrar menú" aria-expanded="false" title="Mostrar menú"><span className="ic" style={{ background: '#F1F3F4' }}><Icon name="inicio" /></span></button>
        </nav>
      ) : (
      <nav className="sidebar" aria-label="Navegación">
        <NavItem id="inicio" label={focus ? 'Ocultar menú' : 'Inicio'} color="#FFFFFF" />
        {visible.map((a) => <NavItem key={a.id} id={a.id} label={a.label} color={a.color} />)}
        <div style={{ flex: 1 }} />
        <NavItem id="calendario" label="Calendario" />
        <NavItem id="perfil" label="Perfil" />
      </nav>
      )}

      {/* El main NO lleva key: así el botón de hablar no se vuelve a montar (ni a animar) al cambiar de sección */}
      <main className="d-main">
        <div className="d-top">
          <button className="talk-circle" onClick={onTalk} aria-label="Hablar con el asistente" title="Hablar con el asistente">
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
            <div className="rise" style={{ '--i': 1, width: '100%', display: 'flex', justifyContent: 'center' }}><Donut entries={pending} /></div>
            <p className="date rise" style={{ '--i': 2 }}>{formatToday()}</p>
            <div className="rise" style={{ '--i': 3, width: '100%', maxWidth: 860 }}><TodayTasks items={today} /></div>
          </div>
        )}
        {area && <AreaScreen area={area} key={area.id} />}
        {view === 'calendario' && <CalendarPage entries={entries} toggleEntry={toggleEntry} />}
        {view === 'perfil' && (
          <BlankPage title="Perfil" icon="perfil">
            <AreasSettings settings={settings} onSave={onSaveSettings} />
            <AvatarEditor avatar={avatar} onSave={onSaveAvatar} onSignOut={onSignOut} />
          </BlankPage>
        )}
        </div>
      </main>
    </div>
    </FocusCtx.Provider>
  )
}
