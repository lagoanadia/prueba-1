// Sugerencias para las preguntas iniciales (no son datos del usuario)
export const SPORT_SUGGESTIONS = ['Gimnasio', 'Pilates', 'Natación', 'Running', 'Yoga', 'Bicicleta', 'Senderismo']
// Tonos pastel (paleta A): cada deporte tiene el suyo
const COLORS = ['#CDEFD9', '#F5D5E6', '#D8E6FF', '#FBE3C8', '#E6DDFB', '#FFF3B0', '#D2EEF3']
export const sportsOf = (data) => data.sports ?? []
export const colorOf = (sports, name) => (name && name !== 'Descanso' ? COLORS[Math.max(0, sports.indexOf(name)) % COLORS.length] : '#F1F3F4')
