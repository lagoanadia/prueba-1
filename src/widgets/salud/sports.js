// Sugerencias para las preguntas iniciales (no son datos del usuario)
export const SPORT_SUGGESTIONS = ['Gimnasio', 'Pilates', 'Natación', 'Running', 'Yoga', 'Bicicleta', 'Senderismo']
// Los mismos colores vivos que las asignaturas de Estudios: cada deporte tiene el suyo
const COLORS = ['#2F6FED', '#E5383B', '#1FA463', '#8B5CF6', '#F97316', '#EAB308', '#EC4899', '#06B6D4', '#92400E', '#64748B']
export const sportsOf = (data) => data.sports ?? []
export const colorOf = (sports, name) => (name && name !== 'Descanso' ? COLORS[Math.max(0, sports.indexOf(name)) % COLORS.length] : '#F1F3F4')
