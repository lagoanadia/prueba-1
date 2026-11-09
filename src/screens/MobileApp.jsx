import { useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import RingArcs from '../components/RingArcs.jsx'
import Donut from '../components/Donut.jsx'
import TodayTasks from '../components/TodayTasks.jsx'
import { AREAS, getArea } from '../data/areas.js'
import { formatToday } from '../lib/dates.js'
import AreaScreen from './AreaScreen.jsx'
import AvatarEditor from './AvatarEditor.jsx'
import CalendarPage from './CalendarPage.jsx'
import useFriendRequests from '../hooks/useFriendRequests.js'
import FriendToast from '../components/FriendToast.jsx'
import Avatar from '../components/Avatar.jsx'

/**
 * Vista móvil:
 *  - Página 1: saludo + círculo "Hablar".  Deslizando a un lado -> página 2: tu día (rueda + tareas).
 *    El deslizamiento horizontal es CSS puro (scroll-snap), así se siente nativo.
 *  - Abajo: barras de color de las áreas. Al tocarlas (o deslizar hacia arriba) sube una hoja.
 */
export default function MobileApp({ firstName, today, onHome, entries, toggleEntry, onTalk, onSignOut, avatar, onSaveAvatar, settings }) {
  const [page, setPage] = useState(0)
  const { count: requests, toast, dismiss } = useFriendRequests() // peticiones de amistad sin responder + aviso
  const [sheet, setSheet] = useState(null) // id de área o 'perfil'
  const pagerRef = useRef(null)
  const touchY = useRef(0)

  const goTo = (i) => pagerRef.current?.scrollTo({ left: i * pagerRef.current.clientWidth, behavior: 'smooth' })
  const onScroll = (e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))

  const area = getArea(sheet)

  return (
    <div className="m-app">
      <FriendToast toast={toast} onOpen={() => setSheet('perfil')} onClose={dismiss} />
      <button className="m-cal" onClick={() => setSheet('calendario')} aria-label="Calendario"><Icon name="calendario" size={22} /></button>
      <button className="m-avatar" onClick={() => setSheet('perfil')} aria-label="Perfil">
        <Avatar avatar={avatar} size={40} />
        {requests > 0 && <span className="notif-badge" aria-label={`${requests} peticiones de amistad`}>{requests}</span>}
      </button>

      <div className="m-pager" ref={pagerRef} onScroll={onScroll}>
        <section className="m-page m-home" aria-label="Inicio">
          <h1 className="hello rise">Hola, {firstName}</h1>
          <p className="muted m-sub rise" style={{ '--i': 1 }}>¿Qué toca hoy?</p>
          <div className="talk rise" style={{ '--i': 2 }}>
            <RingArcs size={270} stroke={10} className="spin-slow" />
            <button className="talk-btn" onClick={onTalk} aria-label="Hablar con el asistente">Hablar</button>
          </div>
          <p className="muted m-hint rise" style={{ '--i': 3 }}>Toca el círculo y cuéntame</p>
          <button className="swipe-hint rise" style={{ '--i': 4 }} onClick={() => goTo(1)}>
            Desliza para ver tu día <Icon name="arrow" size={16} color="#5F6368" />
          </button>
        </section>

        <section className="m-page m-day" aria-label="Tu día">
          <h2 className="sr-only">Tu día</h2>
          <p className="muted">{formatToday()}</p>
          <Donut entries={today.filter((i) => !i.done)} size={190} />
          <TodayTasks items={today} compact />
        </section>
      </div>

      <div className="dots" role="tablist" aria-label="Páginas">
        {[0, 1].map((i) => (
          <button key={i} role="tab" aria-selected={page === i} className={`dot-btn ${page === i ? 'on' : ''}`} onClick={() => goTo(i)} aria-label={i ? 'Tu día' : 'Hablar'} />
        ))}
      </div>

      <div className="m-bars"
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (touchY.current - e.changedTouches[0].clientY < 40) return
          const el = document.elementFromPoint(e.changedTouches[0].clientX, touchY.current)
          const id = el?.closest('[data-area]')?.dataset.area
          if (id) setSheet(id)
        }}>
        {AREAS.filter((a) => settings.areas[a.id]?.active).map((a) => (
          <button key={a.id} data-area={a.id} className="m-bar" style={{ background: a.color }} onClick={() => setSheet(a.id)} aria-label={a.label}>
            <span className="m-bar-icon"><Icon name={a.id} size={18} /></span>
          </button>
        ))}
      </div>

      <div className={`sheet ${sheet ? 'sheet-open' : ''}`} aria-hidden={!sheet}>
        {sheet && (
          <>
            <header className="sheet-head" style={{ background: area?.color ?? '#F1F3F4' }}>
              <span className="ic" style={{ background: '#FFFFFF' }}><Icon name={area?.id ?? sheet} /></span>
              <h2>{area?.label ?? (sheet === 'calendario' ? 'Calendario' : 'Perfil')}</h2>
              <button className="icon-btn" onClick={() => setSheet(null)} aria-label="Cerrar"><Icon name="close" /></button>
            </header>
            <div className="sheet-body">
              {sheet === 'calendario' && <CalendarPage entries={entries} toggleEntry={toggleEntry} />}
              {sheet === 'perfil' && <AvatarEditor avatar={avatar} onSave={onSaveAvatar} onSignOut={onSignOut} />}
              {area && <AreaScreen area={area} key={area.id} showTitle={false} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
