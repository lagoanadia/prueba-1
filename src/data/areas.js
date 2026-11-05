// Áreas de la app. Lo usan el frontend Y el backend (el asistente solo puede usar estos ids).
// Solo datos: nada de JSX aquí, para que el Worker lo pueda importar.
export const AREAS = [
  { id: 'estudios', label: 'Estudios', color: '#3185FC' },
  { id: 'salud', label: 'Salud', color: '#3DDC97' },
  { id: 'journal', label: 'Journal', color: '#F9DC5C' },
  { id: 'trabajo', label: 'Trabajo', color: '#E84855' },
  { id: 'comida', label: 'Comida', color: '#EFABFF' },
]

export const AREA_IDS = AREAS.map((a) => a.id)
export const getArea = (id) => AREAS.find((a) => a.id === id)
