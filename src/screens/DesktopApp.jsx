import { useMemo, useState } from 'react'
import { FocusCtx } from './focus.js'
import Icon from '../components/Icon.jsx'
import Donut from '../components/Donut.jsx'
import TodayTasks from '../components/TodayTasks.jsx'
import AreaScreen from './AreaScreen.jsx'
import CalendarPage from './CalendarPage.jsx'
import Avatar from '../components/Avatar.jsx'
import { AREAS } from '../data/areas.js'
import { activeAreaIds } from '../data/settings.js'
import { formatToday } from '../lib/dates.js'
import useFriendRequests from '../hooks/useFriendRequests.js'
import useCloseDay from '../hooks/useCloseDay.js'
import FriendsPage from './FriendsPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import FriendsStrip from '../components/FriendsStrip.jsx'
import FriendToast from '../components/FriendToast.jsx'

// Los colores muy claros (Comida) necesitan más tinte para que el resalte se vea como en el resto
const tint = (hex) => { const n = parseInt(hex.slice(1), 16); return Math.min(n >> 16, (n >> 8) & 255, n & 255) > 150 ? 45 : 22 }

/** Vista portátil: menú lateral + contenido. */
export default function DesktopApp({ firstName, today, onHome, entries, toggleEntry, onTalk, onSignOut, avatar, onSaveAvatar, settings, onSaveSettings }) {
  // La sección abierta se recuerda: al recargar la página vuelves a donde estabas
  const [view, setViewState] = useState(() => { try { return sessionStorage.getItem('app-view') || 'inicio' } catch { return 'inicio' } })
  const setView = (v) => { setViewState(v); try { sessionStorage.setItem('app-view', v) } catch { /* sin almacenamiento: no se recuerda */ } }
  const closed = useCloseDay(today) // al tachar todo: +1 bloque en tu edificio
  const { count: requests, toast, dismiss } = useFriendRequests() // peticiones de amistad sin responder + aviso
  const [focus, setFocus] = useState(false) // modo concentración (unidad de Estudios): la casa pliega el menú
  const [navOpen, setNavOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true) // panel de unidades (modo concentración)
  const focusCtx = useMemo(() => ({ setFocus: (v) => { setFocus(v); if (!v) setNavOpen(true) }, panelOpen, setPanelOpen }), [panelOpen])
  const iconsOnly = settings.iconsOnly
  const pending = today.filter((i) => !i.done) // lo tachado sale de la lista y de la rueda
  const visible = AREAS.filter((a) => activeAreaIds(settings).includes(a.id)) // solo las activas, sin huecos

  const NavItem = ({ id, label, color = '#F1F3F4' }) => (
    <button className={`nv ${view === id ? 'on' : ''}`} aria-label={iconsOnly ? label : undefined} title={iconsOnly ? label : undefined} onClick={() => { if (id === 'inicio' && focus) { setNavOpen(!navOpen); return } setView(id); if (id === 'inicio') onHome?.() }} aria-current={view === id ? 'page' : undefined}
      style={view === id && id !== 'inicio' && id !== 'calendario' && color !== '#F1F3F4' ? { background: `color-mix(in srgb, ${color} ${tint(color)}%, #FFFFFF)` } : undefined}>
      <span className={`ic ${color === '#FFFFFF' ? 'ic-white' : ''}`} style={{ background: color }}>
        {id === 'perfil' ? <Avatar avatar={avatar} size={40} /> : <Icon name={id} />}
        {id === 'amigos' && requests > 0 && <span className="notif-badge" aria-label={`${requests} peticiones de amistad`}>{requests}</span>}
      </span>
      {!iconsOnly && label}
    </button>
  )

  const area = visible.find((a) => a.id === view) // un área desactivada no se abre

  return (
    <FocusCtx.Provider value={focusCtx}>
    <div className="d-app">
      <FriendToast toast={toast} onOpen={() => setView('amigos')} onClose={dismiss} />
      {closed && <div className="toast" role="status"><span className="toast-block" />{closed}<button className="pill" onClick={() => setView('amigos')}>Ver</button></div>}
      {focus && !navOpen ? (
        <nav className="sidebar sidebar-slim" aria-label="Navegación">
          <button className="nv nv-slim" onClick={() => setNavOpen(true)} aria-label="Mostrar menú" aria-expanded="false" title="Mostrar menú"><span className="ic" style={{ background: '#F1F3F4' }}><Icon name="inicio" /></span></button>
        </nav>
      ) : (
      <nav className={`sidebar ${iconsOnly ? 'sidebar-icons' : ''}`} aria-label="Navegación">
        <NavItem id="inicio" label={focus ? 'Ocultar menú' : 'Inicio'} color="#FFFFFF" />
        <hr className="side-sep" />
        {visible.map((a) => <NavItem key={a.id} id={a.id} label={a.label} color={a.color} />)}
        <div style={{ flex: 1 }} />
        <hr className="side-sep" />
        <NavItem id="amigos" label="Amigos" color="#FFFFFF" />
        <NavItem id="calendario" label="Calendario" color="#FFFFFF" />
        <NavItem id="perfil" label="Perfil" />
      </nav>
      )}

      {/* El main NO lleva key: así el botón de hablar no se vuelve a montar (ni a animar) al cambiar de sección */}
      <main className="d-main">
        <div className="d-top">
          <div className="d-top-left">
            {view === 'perfil' && <h1 className="perfil-title">Perfil</h1>}
            {(area || view === 'calendario' || view === 'amigos') && (
              <h1 className="d-title" key={view}>
                {area?.id === 'estudios'
                  ? <button className="d-title-btn" onClick={() => window.dispatchEvent(new Event('study-home'))} title="Ir al inicio de Estudios">Área de Estudios</button>
                  : (area ? `Área de ${area.label}` : view === 'amigos' ? 'Amigos' : 'Calendario')}
              </h1>
            )}
            {/* botón de personalizar (lo coloca cada pantalla con <TopActions>), junto al título */}
            <div id="top-actions" className="d-top-actions" />
          </div>
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
            <div className="rise" style={{ '--i': 4, width: '100%', maxWidth: 860 }}><FriendsStrip onOpen={() => setView('amigos')} /></div>
          </div>
        )}
        {area && <AreaScreen area={area} key={area.id} />}
        {view === 'calendario' && <CalendarPage entries={entries} toggleEntry={toggleEntry} />}
        {view === 'amigos' && <FriendsPage />}
        {view === 'perfil' && <ProfilePage avatar={avatar} onSaveAvatar={onSaveAvatar} settings={settings} onSaveSettings={onSaveSettings} onSignOut={onSignOut} />}
        </div>
      </main>
    </div>
    </FocusCtx.Provider>
  )
}
