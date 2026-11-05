// Opciones del avatar. Lo usan el editor (frontend) y la validación (backend).
// Por ahora todo es personalización libre; los "trajes" de la gamificación se añadirán más adelante.
const PALETTE = ['#3185FC', '#3DDC97', '#F9DC5C', '#E84855', '#EFABFF', '#FF9F43', '#8E7CFF', '#FFFFFF']

export const AVATAR_OPTIONS = {
  skin: ['#FFFFFF', '#FDE3C8', '#F3C59C', '#D9A06E', '#A9693D', '#6B4429'].map((color, i) => ({ id: `s${i + 1}`, color })),
  brows: [{ id: 'none', label: 'Sin cejas' }, { id: 'soft', label: 'Suaves' }, { id: 'bold', label: 'Marcadas' }, { id: 'raised', label: 'Sorpresa' }, { id: 'angry', label: 'Enfadada' }, { id: 'worried', label: 'Preocupada' }],
  eyes: [{ id: 'dots', label: 'Puntos' }, { id: 'happy', label: 'Feliz' }, { id: 'wink', label: 'Guiño' }, { id: 'sleepy', label: 'Dormida' }, { id: 'big', label: 'Grandes' }, { id: 'stars', label: 'Estrellas' }, { id: 'lashes', label: 'Pestañas' }, { id: 'xx', label: 'KO' }],
  mouth: [{ id: 'smile', label: 'Sonrisa' }, { id: 'grin', label: 'Risa' }, { id: 'laugh', label: 'Carcajada' }, { id: 'tongue', label: 'Lengua' }, { id: 'smirk', label: 'Pícara' }, { id: 'flat', label: 'Seria' }, { id: 'o', label: '¡Oh!' }, { id: 'frown', label: 'Puchero' }],
  hair: [
    { id: 'short', label: 'Corto' }, { id: 'wavy', label: 'Ondas' }, { id: 'long', label: 'Largo' }, { id: 'bob', label: 'Bob' }, { id: 'bangs', label: 'Flequillo' }, { id: 'spiky', label: 'Pincho' },
    { id: 'ponytail', label: 'Coleta' }, { id: 'bun', label: 'Moño' }, { id: 'curly', label: 'Rizos' }, { id: 'afro', label: 'Afro' },
    { id: 'buzz', label: 'Rapado' }, { id: 'bald', label: 'Calva' },
  ],
  hairColor: ['#202124', '#5A3825', '#9C6B43', '#F2D27A', '#E8735A', '#EFABFF', '#3185FC', '#E0E0E0'].map((color, i) => ({ id: `h${i + 1}`, color })),
  facialHair: [{ id: 'none', label: 'Nada' }, { id: 'mustache', label: 'Bigote' }, { id: 'beard', label: 'Barba' }, { id: 'stubble', label: 'Sombra' }],
  glasses: [{ id: 'none', label: 'Sin gafas' }, { id: 'round', label: 'Redondas' }, { id: 'square', label: 'Cuadradas' }, { id: 'sun', label: 'De sol' }, { id: 'heart', label: 'Corazón' }],
  accessory: [
    { id: 'none', label: 'Nada' }, { id: 'earrings', label: 'Pendientes' }, { id: 'headband', label: 'Diadema' }, { id: 'flower', label: 'Flor' },
    { id: 'cap', label: 'Gorra' }, { id: 'beanie', label: 'Gorro' }, { id: 'headphones', label: 'Cascos' }, { id: 'crown', label: 'Corona' },
  ],
  outfit: [
    { id: 'tee', label: 'Camiseta' }, { id: 'vneck', label: 'Pico' }, { id: 'turtleneck', label: 'Cuello alto' }, { id: 'shirt', label: 'Camisa' },
    { id: 'hoodie', label: 'Sudadera' }, { id: 'sweater', label: 'Jersey' }, { id: 'stripes', label: 'Rayas' }, { id: 'dots', label: 'Lunares' },
    { id: 'overalls', label: 'Peto' }, { id: 'sport', label: 'Deporte' }, { id: 'chef', label: 'Chef' }, { id: 'suit', label: 'Traje' }, { id: 'tuxedo', label: 'Esmoquin' },
  ],
  outfitColor: PALETTE.map((color, i) => ({ id: `o${i + 1}`, color })),
  bg: [...PALETTE.slice(0, 7), '#F1F3F4'].map((color, i) => ({ id: `b${i + 1}`, color })),
}

export const DEFAULT_AVATAR = {
  skin: 's2', brows: 'soft', eyes: 'dots', mouth: 'smile', hair: 'wavy', hairColor: 'h1',
  facialHair: 'none', glasses: 'none', accessory: 'none', outfit: 'tee', outfitColor: 'o8', bg: 'b3',
}

/** Avatar válido (todos los ids existen). Lo usa el backend. */
export function isValidAvatar(a) {
  if (!a || typeof a !== 'object') return false
  return Object.entries(AVATAR_OPTIONS).every(([key, opts]) => opts.some((o) => o.id === a[key]))
}

export function randomAvatar() {
  const pick = (opts) => opts[Math.floor(Math.random() * opts.length)].id
  return Object.fromEntries(Object.entries(AVATAR_OPTIONS).map(([k, opts]) => [k, pick(opts)]))
}
