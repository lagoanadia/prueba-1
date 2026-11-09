import { useEffect, useState } from 'react'
import NotesEditor from './NotesEditor.jsx'
import Planner from './Planner.jsx'
import SubjectView from './SubjectView.jsx'
import UnitView from './UnitView.jsx'

/**
 * Estudios (diseño oficial): cuatro pantallas encadenadas.
 * Planificador → Asignatura → Unidad → Editor de apuntes.
 */
export default function StudyPage({ data, update }) {
  const [route, setRoute] = useState({ view: 'planner' })
  const subject = (data.subjects ?? []).find((s) => s.id === route.subjectId)
  const unit = subject?.units.find((u) => u.id === route.unitId)
  const go = (r) => setRoute(r)

  // Al cambiar de pantalla, volver arriba
  useEffect(() => { document.querySelector('.sheet-body')?.scrollTo?.({ top: 0 }); window.scrollTo?.({ top: 0 }) }, [route.view, route.subjectId, route.unitId])

  const props = { data, update }
  if (route.view === 'notes' && unit && unit.topics.some((t) => t.id === route.topicId)) {
    return <NotesEditor key={route.topicId} {...props} subject={subject} unit={unit} topicId={route.topicId}
      back={() => go({ ...route, view: 'unit' })} openNotes={(topicId) => go({ ...route, topicId })} />
  }
  if ((route.view === 'unit' || route.view === 'notes') && unit) {
    return <UnitView {...props} subject={subject} unit={unit} back={() => go({ view: 'subject', subjectId: subject.id })}
      openNotes={(topicId) => go({ ...route, view: 'notes', topicId })} />
  }
  if (subject) {
    return <SubjectView {...props} subject={subject} back={() => go({ view: 'planner' })} openUnit={(unitId) => go({ view: 'unit', subjectId: subject.id, unitId })} />
  }
  return <Planner {...props} openSubject={(subjectId) => go({ view: 'subject', subjectId })} />
}
