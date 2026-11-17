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
const round = (n) => Math.round(n * 100) / 100
/** Un número con fracciones sencillas: 0,25 → 1/4 · 0,5 → 1/2 · 1,5 → 1 1/2 (si no es de cuartos, en decimal). */
export const fmtNum = (n) => {
  const x = Number(n)
  const whole = Math.floor(x + 1e-9)
  const frac = round(x - whole)
  const f = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' }[frac]
  if (frac === 0) return String(whole)
  if (f) return whole ? `${whole} ${f}` : f
  return String(round(x)).replace('.', ',')
}
// Botones − y +: con cantidades pequeñas bajan a 1/2 y 1/4 (en gramos y mililitros, de 50 en 50)
export const stepDown = (n, unit) => {
  if (unit === 'g' || unit === 'ml') return Math.max(50, n - 50)
  if (n > 1) return round(n - (unit === 'kg' || unit === 'l' ? 0.5 : 1))
  return n > 0.5 ? 0.5 : 0.25
}
export const stepUp = (n, unit) => {
  if (unit === 'g' || unit === 'ml') return n + 50
  if (n < 1) return n < 0.5 ? 0.5 : 1
  return round(n + (unit === 'kg' || unit === 'l' ? 0.5 : 1))
}
/** «500 g», «1 ud», «1/2 cda», «pizca», «al gusto»: cómo se ve una cantidad dentro del chip. */
export const fmtQty = (q) => {
  if (!q) return ''
  if (q.unit === 'al gusto') return 'al gusto'
  if (q.n == null || q.n === '') return q.unit ?? ''
  const txt = fmtNum(q.n)
  return q.unit && q.unit !== 'ud' ? `${txt} ${q.unit}` : txt
}
