// Sugerencias para las preguntas iniciales (no son datos del usuario)
export const SPORT_SUGGESTIONS = ['Gimnasio', 'Pilates', 'Natación', 'Running', 'Yoga', 'Bicicleta', 'Senderismo']
const COLORS = ['#3DDC97', '#EFABFF', '#3185FC', '#E84855', '#F9DC5C', '#FF9F43', '#8E7CFF']
export const sportsOf = (data) => data.sports ?? []
export const colorOf = (sports, name) => (name && name !== 'Descanso' ? COLORS[Math.max(0, sports.indexOf(name)) % COLORS.length] : '#F1F3F4')
