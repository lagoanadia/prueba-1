// Opciones del avatar. Lo usan el editor (frontend) y la validación (backend).
// "locked" = se desbloqueará con la gamificación (rachas, metas...). De momento se ven con candado.
export const AVATAR_OPTIONS = {
  skin: [
    { id: 's1', color: '#FAD7B5' }, { id: 's2', color: '#EDB98A' }, { id: 's3', color: '#D08B5B' },
    { id: 's4', color: '#AE5D29' }, { id: 's5', color: '#694D3D' },
  ],
  eyes: [{ id: 'happy', label: 'Feliz' }, { id: 'calm', label: 'Tranqui' }, { id: 'wink', label: 'Guiño' }],
  hair: [
    { id: 'short', label: 'Corto' }, { id: 'long', label: 'Largo' }, { id: 'curly', label: 'Rizos' },
    { id: 'bun', label: 'Moño' }, { id: 'buzz', label: 'Rapado' },
  ],
  hairColor: [
    { id: 'h1', color: '#2B2B2B' }, { id: 'h2', color: '#6B4226' }, { id: 'h3', color: '#E3B55B' },
    { id: 'h4', color: '#C0502E' }, { id: 'h5', color: '#EFABFF' },
  ],
  glasses: [{ id: 'none', label: 'Sin gafas' }, { id: 'round', label: 'Redondas' }, { id: 'sun', label: 'De sol' }],
  outfit: [
    { id: 'tee', label: 'Camiseta', color: '#3185FC' },
    { id: 'hoodie', label: 'Sudadera', color: '#3DDC97' },
    { id: 'sweater', label: 'Jersey', color: '#F9DC5C' },
    { id: 'suit', label: 'Traje', color: '#202124', locked: true, unlock: 'Racha de 7 días' },
    { id: 'chef', label: 'Chef', color: '#FFFFFF', locked: true, unlock: '10 comidas apuntadas' },
    { id: 'sport', label: 'Deporte', color: '#E84855', locked: true, unlock: '20 sesiones de Salud' },
  ],
  bg: [{ id: 'b1', color: '#3185FC' }, { id: 'b2', color: '#3DDC97' }, { id: 'b3', color: '#F9DC5C' }, { id: 'b4', color: '#E84855' }, { id: 'b5', color: '#EFABFF' }],
}

export const DEFAULT_AVATAR = { skin: 's2', eyes: 'happy', hair: 'long', hairColor: 'h2', glasses: 'none', outfit: 'tee', bg: 'b3' }

/** Avatar válido (ids conocidos y nada bloqueado). Lo usa el backend. */
export function isValidAvatar(a) {
  if (!a || typeof a !== 'object') return false
  return Object.entries(AVATAR_OPTIONS).every(([key, opts]) => {
    const opt = opts.find((o) => o.id === a[key])
    return opt && !opt.locked
  })
}
