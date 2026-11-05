// Opciones del avatar. Lo usan el editor (frontend) y la validación (backend).
// "locked" = se desbloqueará con la gamificación (rachas, metas...). De momento salen con candado.
const PALETTE = ['#3185FC', '#3DDC97', '#F9DC5C', '#E84855', '#EFABFF', '#FF9F43', '#8E7CFF', '#FFFFFF']

export const AVATAR_OPTIONS = {
  skin: ['#FDE3C8', '#F6C9A0', '#E3A877', '#C47F4E', '#9A5B34', '#5E3B26'].map((color, i) => ({ id: `s${i + 1}`, color })),
  brows: [{ id: 'none', label: 'Sin cejas' }, { id: 'soft', label: 'Suaves' }, { id: 'bold', label: 'Marcadas' }, { id: 'raised', label: 'Sorpresa' }],
  eyes: [
    { id: 'happy', label: 'Feliz' }, { id: 'dots', label: 'Puntos' }, { id: 'wink', label: 'Guiño' },
    { id: 'sleepy', label: 'Dormida' }, { id: 'big', label: 'Grandes' }, { id: 'stars', label: 'Estrellas' },
  ],
  mouth: [
    { id: 'smile', label: 'Sonrisa' }, { id: 'grin', label: 'Risa' }, { id: 'flat', label: 'Seria' },
    { id: 'o', label: '¡Oh!' }, { id: 'tongue', label: 'Lengua' }, { id: 'smirk', label: 'Pícara' },
  ],
  hair: [
    { id: 'short', label: 'Corto' }, { id: 'long', label: 'Largo' }, { id: 'bob', label: 'Bob' },
    { id: 'ponytail', label: 'Coleta' }, { id: 'bun', label: 'Moño' }, { id: 'curly', label: 'Rizos' },
    { id: 'afro', label: 'Afro' }, { id: 'spiky', label: 'Pincho' }, { id: 'buzz', label: 'Rapado' }, { id: 'bald', label: 'Calva' },
  ],
  hairColor: ['#2B2B2B', '#6B4226', '#A8683B', '#E3B55B', '#C0502E', '#EFABFF', '#3185FC', '#D9D9D9'].map((color, i) => ({ id: `h${i + 1}`, color })),
  facialHair: [{ id: 'none', label: 'Nada' }, { id: 'mustache', label: 'Bigote' }, { id: 'beard', label: 'Barba' }, { id: 'stubble', label: 'Sombra' }],
  glasses: [
    { id: 'none', label: 'Sin gafas' }, { id: 'round', label: 'Redondas' }, { id: 'square', label: 'Cuadradas' },
    { id: 'sun', label: 'De sol' }, { id: 'heart', label: 'Corazón' },
  ],
  accessory: [
    { id: 'none', label: 'Nada' }, { id: 'earrings', label: 'Pendientes' }, { id: 'headband', label: 'Diadema' }, { id: 'flower', label: 'Flor' },
    { id: 'cap', label: 'Gorra', locked: true, unlock: 'Racha de 3 días' },
    { id: 'headphones', label: 'Cascos', locked: true, unlock: '5 sesiones de Estudios' },
    { id: 'crown', label: 'Corona', locked: true, unlock: 'Completa una meta' },
  ],
  outfit: [
    { id: 'tee', label: 'Camiseta' }, { id: 'hoodie', label: 'Sudadera' }, { id: 'sweater', label: 'Jersey' },
    { id: 'stripes', label: 'Rayas' }, { id: 'overalls', label: 'Peto' }, { id: 'turtleneck', label: 'Cuello alto' },
    { id: 'suit', label: 'Traje', locked: true, unlock: 'Racha de 7 días' },
    { id: 'chef', label: 'Chef', locked: true, unlock: '10 comidas apuntadas' },
    { id: 'sport', label: 'Deporte', locked: true, unlock: '20 sesiones de Salud' },
  ],
  outfitColor: PALETTE.map((color, i) => ({ id: `o${i + 1}`, color })),
  bg: [...PALETTE.slice(0, 7), '#F1F3F4'].map((color, i) => ({ id: `b${i + 1}`, color })),
}

export const DEFAULT_AVATAR = {
  skin: 's2', brows: 'soft', eyes: 'happy', mouth: 'smile', hair: 'long', hairColor: 'h2',
  facialHair: 'none', glasses: 'none', accessory: 'none', outfit: 'tee', outfitColor: 'o1', bg: 'b3',
}

/** Avatar válido (ids conocidos y nada bloqueado). Lo usa el backend. */
export function isValidAvatar(a) {
  if (!a || typeof a !== 'object') return false
  return Object.entries(AVATAR_OPTIONS).every(([key, opts]) => {
    const opt = opts.find((o) => o.id === a[key])
    return opt && !opt.locked
  })
}

/** Uno al azar (solo opciones desbloqueadas). */
export function randomAvatar() {
  const pick = (opts) => { const free = opts.filter((o) => !o.locked); return free[Math.floor(Math.random() * free.length)].id }
  return Object.fromEntries(Object.entries(AVATAR_OPTIONS).map(([k, opts]) => [k, pick(opts)]))
}
