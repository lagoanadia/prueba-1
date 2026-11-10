import { useEffect, useState } from 'react'
import Planner from './Planner.jsx'
import SubjectView from './SubjectView.jsx'
import UnitWorkspace from './UnitWorkspace.jsx'

/**
 * Estudios: Planificador → Asignatura → Unidad (modo concentración con PDF y documento lado a lado).
 */
export default function StudyPage({ data, update }) {
  // La pantalla de Estudios (asignatura/unidad) también se recuerda al recargar
  const [route, setRouteState] = useState(() => { try { return JSON.parse(sessionStorage.getItem('study-route')) ?? { view: 'planner' } } catch { return { view: 'planner' } } })
  const setRoute = (r) => { setRouteState(r); try { sessionStorage.setItem('study-route', JSON.stringify(r)) } catch { /* sin almacenamiento */ } }
  const subject = (data.subjects ?? []).find((s) => s.id === route.subjectId)
  const unit = subject?.units.find((u) => u.id === route.unitId)
  const go = (r) => setRoute(r)

  // Pulsar «Área de Estudios» (arriba) vuelve al inicio de Estudios
  useEffect(() => {
    const home = () => setRoute({ view: 'planner' })
    window.addEventListener('study-home', home)
    return () => window.removeEventListener('study-home', home)
  }, [])

  // Al cambiar de pantalla, volver arriba
  useEffect(() => { window.scrollTo?.({ top: 0 }) }, [route.view, route.subjectId])

  const props = { data, update }
  if (route.view === 'unit' && subject && unit) {
    return <UnitWorkspace {...props} subject={subject} unit={unit} route={route} go={(r) => go({ ...r, view: 'unit' })} back={() => go({ view: 'subject', subjectId: subject.id })} />
  }
  if (subject) {
    return (
      <SubjectView {...props} subject={subject} back={() => go({ view: 'planner' })} openUnit={(unitId) => go({ view: 'unit', subjectId: subject.id, unitId, tab: 'estudio' })}
        onDelete={() => { update((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== subject.id), assignments: (d.assignments ?? []).filter((a) => a.course !== subject.short) })); go({ view: 'planner' }) }} />
    )
  }
  return <Planner {...props} openSubject={(subjectId) => go({ view: 'subject', subjectId })} />
}
