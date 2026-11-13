import { useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { todayISO } from '../../lib/dates.js'
import { projectsOf } from '../../widgets/trabajo/projects.js'
import MeetingExtras from './MeetingExtras.jsx'
import { colorOf, toMin } from './shared.js'
import { useShared } from './SharedCtx.js'

/**
 * Reunión: se crea aquí (título, fecha y hora), se arrastra a quien quieres que venga y se activa.
 * Sale en la agenda como un bloque grande con icono y en el cronograma como un círculo grande.
 */
export default function Reunion({ data, update, projectId }) {
  const project = projectsOf(data).find((p) => p.id === projectId)
  const sh = useShared()
  const members = project?.shared ? sh.meta(projectId)?.members ?? [] : []
  const me = members.find((m) => m.you)?.username ?? null
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:00')
  const [invited, setInvited] = useState(null) // null = solo yo (todavía sin tocar)
  const [over, setOver] = useState(false)
  const [done, setDone] = useState('')
  const [extras, setExtras] = useState({ note: '', links: [], docs: [] }) // notas, enlaces y documentos para la reunión
  if (!project) return null
  const guests = invited ?? (me ? [me] : [])
  const c = colorOf(data, projectId)
  const invite = (u) => { if (!guests.includes(u)) setInvited([...guests, u]) }
  const toggle = (u) => setInvited(guests.includes(u) ? guests.filter((x) => x !== u) : [...guests, u])
  const ok = title.trim() && date && toMin(end) > toMin(start)

  const activate = (e) => {
    e.preventDefault()
    if (!ok) return
    const ev = { id: crypto.randomUUID(), date, start, end, title: title.trim(), projectId, kind: 'meeting', attendees: guests, note: extras.note.trim(), links: extras.links, docs: extras.docs, ...(project.shared ? { by: me } : {}) }
    update((d) => (project.shared
      ? { ...d, projects: d.projects.map((p) => (p.id === projectId ? { ...p, meetings: [...(p.meetings ?? []), ev] } : p)) }
      : { ...d, meetings: [...(d.meetings ?? []), ev] }))
    setTitle(''); setInvited(null); setExtras({ note: '', links: [], docs: [] }); setDone('Reunión activada: ya está en la agenda y en el cronograma')
    setTimeout(() => setDone(''), 4000)
  }
  const person = (m) => members.find((x) => x.username === m)

  return (
    <form className="rn" style={{ '--c': c }} onSubmit={activate}>
      <input className="rn-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="¿De qué es la reunión?" aria-label="Título de la reunión" />
      <div className="rn-when">
        <label className="rn-field"><Icon name="calendario" size={16} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" /></label>
        <label className="rn-field"><Icon name="clock" size={16} /><input type="time" value={start} step={900} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label="Empieza" /><span>–</span><input type="time" value={end} step={900} onChange={(e) => e.target.value && setEnd(e.target.value)} aria-label="Acaba" /></label>
      </div>
      {members.length > 0 ? (
        <>
          <span className="rn-hint">Arrastra a quien quieras en la reunión (o tócalo)</span>
          <div className="rn-pool">
            {members.map((m) => (
              <button type="button" key={m.username} draggable className={`rn-chip ${guests.includes(m.username) ? 'is-in' : ''}`} style={{ '--m': sh.color(projectId, m.username) }}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/guest', m.username) }} onClick={() => toggle(m.username)}>
                <Avatar avatar={m.avatar} size={22} />{m.you ? 'Yo' : `@${m.username}`}
              </button>
            ))}
          </div>
          <div className={`rn-drop ${over ? 'is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); const u = e.dataTransfer.getData('text/guest'); if (u) invite(u) }}>
            {guests.map((u) => person(u) && (
              <span key={u} className="rn-chip is-guest" style={{ '--m': sh.color(projectId, u) }}><Avatar avatar={person(u).avatar} size={22} />{person(u).you ? 'Yo' : `@${u}`}
                <button type="button" onClick={() => toggle(u)} aria-label={`Quitar a ${u}`}><Icon name="close" size={10} strokeWidth={3} /></button></span>
            ))}
            {guests.length === 0 && <span className="rn-hint">Suelta aquí a los invitados</span>}
          </div>
        </>
      ) : <span className="rn-hint">Con un proyecto compartido podrás invitar a tus amigos a la reunión.</span>}
      <MeetingExtras value={extras} onChange={setExtras} docs={project.docs ?? []} />
      <div className="rn-actions">
        {done && <span className="rn-done" role="status">{done}</span>}
        <button className="pill sh-save" disabled={!ok}><Icon name="amigos" size={16} color="#fff" />Activar reunión</button>
      </div>
    </form>
  )
}
