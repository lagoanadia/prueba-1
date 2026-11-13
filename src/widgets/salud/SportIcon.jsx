/*
 * Iconos de deporte (trazo, cuadrícula de 24). Cada deporte guarda el suyo en data.sportIcons;
 * si no lo has elegido, se adivina por el nombre (iconOf) y, si no hay pista, un rayo.
 */
const ICONS = {
  dumbbell: { d: ['M6.5 8v8', 'M17.5 8v8', 'M3.5 10v4', 'M20.5 10v4', 'M6.5 12h11'] },
  run: { c: [[15, 5, 1.8]], d: ['M13 9l-3 3 2.500 2v5', 'M10 12l-3.500 1', 'M13 9l3 3 3 .5', 'M12.500 14l3 2 .5 3.500'] },
  bike: { c: [[6, 16, 3.500], [18, 16, 3.500]], d: ['M6 16l4-7h5l3 7', 'M10 9l3 7', 'M9 6.500h2.500'] },
  swim: { c: [[8.500, 7, 1.800]], d: ['M10 9.500l4 2 3-2.500', 'M3 17c1.500 1.200 3 1.200 4.500 0s3-1.200 4.500 0 3 1.200 4.500 0 3-1.200 4.500 0'] },
  yoga: { c: [[12, 5, 1.800]], d: ['M12 8v5', 'M12 13l-4 5.500', 'M12 13l4 5.500', 'M5.500 10l6.500 2 6.500-2'] },
  ball: { c: [[12, 12, 8]], d: ['M12 8.500l3 2.200-1.100 3.500h-3.800L9 10.700Z', 'M12 8.500V4.200', 'M15 10.700l4-1.300', 'M13.900 14.200l2.500 3.300', 'M10.100 14.200l-2.500 3.300', 'M9 10.700L5 9.400'] },
  basket: { c: [[12, 12, 8]], d: ['M4 12h16', 'M12 4v16', 'M6 5.800c3.200 3.500 3.200 8.900 0 12.400', 'M18 5.800c-3.200 3.500-3.200 8.900 0 12.400'] },
  tennis: { c: [[10, 10, 5.500]], d: ['M14 14l6.500 6.500', 'M7 7l6 6'] },
  boxing: { d: ['M7 9.500A5 5 0 0 1 12 5h2a3 3 0 0 1 3 3v5a5 5 0 0 1-5 5H9.500a2.500 2.500 0 0 1-2.500-2.500Z', 'M9.500 18.500v2.500h5.500v-2.500', 'M7 12h3.500'] },
  mountain: { d: ['M3 19.500l6-10.500 4 6 2.500-3.500 5.500 8Z', 'M9 9l1.800 2.600'] },
  heart: { d: ['M12 19.500S4.500 15 4.500 9.800A3.900 3.900 0 0 1 12 8.200a3.900 3.900 0 0 1 7.500 1.600C19.500 15 12 19.500 12 19.500Z'] },
  bolt: { d: ['M13.500 3.500l-7 10h5l-1 7 7-10h-5Z'] },
}
export const ICON_KEYS = Object.keys(ICONS)

const GUESS = [
  [/corr|run|trot|atlet/, 'run'], [/bici|cicl|bike|spinn/, 'bike'], [/nata|swim|piscin|agua/, 'swim'],
  [/yoga|pilat|estir|stretch|medit|relaj/, 'yoga'], [/futbol|football|soccer|balon ?pie/, 'ball'], [/basket|balonc/, 'basket'],
  [/tenis|padel|raquet|badm|squash/, 'tennis'], [/box|kick|karate|judo|mma|artes marc/, 'boxing'],
  [/senderis|monta|hiking|trek|escal|caminat|andar|paseo/, 'mountain'], [/gim|pesa|fuerza|crossfit|gym|muscul|calistenia/, 'dumbbell'],
  [/cardio|hiit|zumba|baile|danza|dance|aerobic/, 'heart'],
]
const plain = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
/** Icono que se le pondría a un deporte por su nombre. */
export const guessIcon = (name) => GUESS.find(([re]) => re.test(plain(name ?? '')))?.[1] ?? 'bolt'
/** Icono elegido para el deporte (o el que se adivina). */
export const iconOf = (data, name) => (ICONS[data.sportIcons?.[name]] ? data.sportIcons[name] : guessIcon(name))

/** Icono como imagen CSS (para estamparlo repetido de fondo): url("data:image/svg+xml,…") con margen alrededor. */
export const stampOf = (name, color = '#202124', opacity = 0.6) => {
  const ic = ICONS[name] ?? ICONS.bolt
  const body = (ic.c ?? []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('') + ic.d.map((d) => `<path d="${d}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export default function SportIcon({ name, size = 18, color = 'currentColor', strokeWidth = 2.2 }) {
  const ic = ICONS[name] ?? ICONS.bolt
  return (
    <svg className="sport-ic" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ic.c?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      {ic.d.map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
