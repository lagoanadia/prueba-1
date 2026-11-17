// Especias: lista de las más comunes (sirve sin IA) y cantidades de los ingredientes.
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const SPICES = [
  'sal', 'sal gorda', 'sal fina', 'pimienta', 'pimienta negra', 'pimienta blanca', 'pimienta rosa', 'pimienta de cayena', 'pimenton', 'pimenton dulce', 'pimenton picante', 'pimenton de la vera', 'paprika',
  'comino', 'oregano', 'tomillo', 'romero', 'laurel', 'hoja de laurel', 'canela', 'canela en polvo', 'canela en rama', 'nuez moscada', 'clavo', 'clavos', 'curcuma', 'curry', 'garam masala', 'ras el hanout',
  'azafran', 'vainilla', 'anis', 'anis estrellado', 'cardamomo', 'cayena', 'guindilla', 'chile en polvo', 'chile', 'ajo en polvo', 'cebolla en polvo', 'jengibre en polvo', 'cilantro', 'cilantro en polvo',
  'perejil', 'albahaca', 'eneldo', 'estragon', 'mejorana', 'salvia', 'hierbabuena', 'menta', 'hierbas provenzales', 'hierbas aromaticas', 'especias', 'sazonador', 'pimienta molida', 'semillas de comino', 'fenogreco', 'sumac', 'za atar',
]
/** ¿Es una especia (o hierba aromática)? Comprueba el nombre entero o como palabra suelta («pimienta negra molida»). */
export const isSpice = (name) => {
  const n = norm(name)
  if (!n) return false
  return SPICES.some((e) => n === e || n.startsWith(`${e} `) || n.endsWith(` ${e}`) || n.includes(` ${e} `))
}

export const UNITS = ['ud', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'pizca', 'diente', 'hoja', 'vaso', 'al gusto']
const STEP = { g: 50, ml: 50, kg: 0.5, l: 0.5 }
export const stepOf = (unit) => STEP[unit] ?? 1
/** «500 g», «1 ud», «pizca», «al gusto»: cómo se ve una cantidad dentro del chip. */
export const fmtQty = (q) => {
  if (!q) return ''
  if (q.unit === 'al gusto') return 'al gusto'
  if (q.n == null || q.n === '') return q.unit ?? ''
  const n = Number(q.n)
  const txt = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',')
  return q.unit && q.unit !== 'ud' ? `${txt} ${q.unit}` : txt
}
