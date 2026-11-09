import { createContext, useContext } from 'react'

// Permite que un widget de Estudios abra las pantallas de detalle (asignatura, unidad, editor).
export const StudyNav = createContext(null)
export const useStudyNav = () => useContext(StudyNav)
