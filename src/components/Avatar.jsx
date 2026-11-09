import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '../data/avatar.js'

/*
 * AVATAR — estilo de línea fina, como los iconos de la app.
 * Trazo fino y uniforme, cara de tres cuartos (oreja a la derecha), ojos de punto,
 * pelo de color plano y la ropa dibujada con pocas líneas.
 */
const INK = '#202124'
const SW = 2.6 // grosor de línea
const color = (key, id) => AVATAR_OPTIONS[key].find((o) => o.id === id)?.color

const line = { fill: 'none', stroke: INK, strokeWidth: SW, strokeLinecap: 'round', strokeLinejoin: 'round' }
const shape = (fill) => ({ fill, stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' })



/*
 * PELO RIZO: una sola forma con el contorno ondulado (no bolitas sueltas)
 * y unos pocos trazos en "c" dentro para que se lea como rizo.
 * El flequillo / parte de delante va SIN contorno, solo relleno.
 */
function bumpy(points, amp, closed = true) {
  let seed = 7 // pseudo-aleatorio estable: el mismo dibujo siempre
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  const n = closed ? points.length : points.length - 1
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % points.length]
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    let nx = -(y1 - y0)
    let ny = x1 - x0
    const len = Math.hypot(nx, ny) || 1
    nx /= len; ny /= len
    if ((mx - 100) * nx + (my - 95) * ny < 0) { nx = -nx; ny = -ny } // siempre hacia fuera
    const a = amp * (0.75 + rnd() * 0.5)
    d += ` Q${(mx + nx * a).toFixed(1)} ${(my + ny * a).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d + (closed ? 'Z' : '')
}
/** Silueta tipo gota: redonda arriba (top) y hasta `bottom` por abajo. */
function silhouette(top, side, bottom, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2
    const y = Math.sin(t) < 0 ? 92 + (92 - top) * Math.sin(t) : 92 + (bottom - 92) * Math.sin(t)
    return [100 + side * Math.cos(t), y]
  })
}
const CURLY_LEN = { short: [36, 50, 118, 20, 7], mid: [36, 54, 160, 24, 8], long: [36, 56, 196, 28, 8] }
const curlyBack = (len) => { const [t, sd, b, n, amp] = CURLY_LEN[len]; return bumpy(silhouette(t, sd, b, n), amp) }
function curlyFront(bangs) {
  const outer = Array.from({ length: 11 }, (_, i) => { const t = Math.PI + (i / 10) * Math.PI; return [100 + 41 * Math.cos(t), 92 + 46 * Math.sin(t)] })
  let d = bumpy(outer, 6, false)
  d += bangs
    ? ' ' + bumpy([[141, 92], [130, 82], [118, 84], [106, 80], [94, 84], [82, 80], [70, 86], [59, 92]], 5, false).replace(/^M[^Q]*/, '').trim()
    : ' Q132 70 112 64 Q104 58 96 64 Q76 68 59 92'
  return d + 'Z'
}
// Calculado una vez al cargar (no en cada render)
const CURLY = {
  back: { short: curlyBack('short'), mid: curlyBack('mid'), long: curlyBack('long'), afro: bumpy(silhouette(20, 64, 138, 30), 7) },
  front: { plain: curlyFront(false), bangs: curlyFront(true) },
}
const curlyOf = (style) => ({
  curly: ['short', false], curlyMid: ['mid', false], curlyLong: ['long', false],
  curlyBangs: ['short', true], curlyMidBangs: ['mid', true], curlyLongBangs: ['long', true], afro: ['afro', false],
}[style])
function CurlMarks({ len, bangs }) {
  const spots = [[72, 62], [100, 50], [126, 60], [56, 100], [146, 100]]
  if (len === 'afro') spots.push([60, 40], [140, 40], [44, 72], [156, 72], [48, 118], [152, 118], [100, 30])
  if (len === 'mid' || len === 'long') spots.push([58, 128], [143, 128])
  if (len === 'long') spots.push([56, 150], [146, 150])
  if (bangs) spots.push([88, 74], [112, 74])
  return <g fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round">{spots.map(([x, y]) => <path key={x + '-' + y} d={`M${x - 4} ${y}a4 4 0 1 1 4 4`} />)}</g>
}

// ---------- Pelo (detrás de la cabeza) ----------
function HairBack({ style, c }) {
  const curly = curlyOf(style)
  if (curly) return <path d={CURLY.back[curly[0]]} {...shape(c)} />
  switch (style) {
    case 'long': return <path d="M64 88C55 120 56 158 68 172C78 180 92 176 98 168C106 176 122 180 132 172C144 158 145 120 136 88C131 56 69 56 64 88Z" {...shape(c)} />
    case 'wavy': return <path d="M64 88C58 104 64 112 58 126C53 140 64 148 60 160C64 172 80 172 88 164L112 164C120 172 136 172 140 160C136 148 147 140 142 126C136 112 142 104 136 88C131 56 69 56 64 88Z" {...shape(c)} />
    case 'bob': return <path d="M59 92C55 112 57 126 64 131C88 135 112 135 136 131C143 126 145 112 141 92C138 55 62 55 59 92Z" {...shape(c)} />
    case 'bangs': return <path d="M61 90C57 114 58 134 66 141C88 145 112 145 134 141C142 134 143 114 139 90C136 56 64 56 61 90Z" {...shape(c)} />
    case 'ponytail': return <path d="M127 70C152 64 164 92 157 120C154 134 147 143 139 146C145 126 145 104 134 88Z" {...shape(c)} />
    case 'bun': return <path d="M100 26C109 26 115 32 115 40C115 48 109 54 100 54C91 54 85 48 85 40C85 32 91 26 100 26Z" {...shape(c)} />
    default: return null
  }
}

// ---------- Pelo (delante: flequillo / parte de arriba) ----------
function HairFront({ style, c }) {
  const curly = curlyOf(style)
  if (curly) {
    const [len, bangs] = curly
    return <g><path d={CURLY.front[bangs ? 'bangs' : 'plain']} fill={c} /><CurlMarks len={len} bangs={bangs} /></g>
  }
  switch (style) {
    case 'short': return <path d="M63 92C60 66 75 50 99 50C123 50 139 63 137 86C130 79 123 74 114 72C102 78 85 77 73 70C69 77 65 84 63 92Z" {...shape(c)} />
    case 'long':
    case 'wavy':
      return (
        <g>
          <path d="M63 97C58 65 76 50 100 50C124 50 140 64 137 92C127 74 107 66 91 66C81 72 70 82 63 97Z" {...shape(c)} />
          <path d="M82 58C76 64 72 70 70 78" {...line} strokeWidth={1.8} opacity=".5" />
        </g>
      )
    case 'bob': return <path d="M62 96C58 62 78 50 101 50C125 50 141 63 138 92C128 76 108 68 90 70C78 76 68 84 62 96Z" {...shape(c)} />
    case 'spiky': return <path d="M63 90L60 66L72 72L74 50L86 62L94 42L104 58L114 44L118 62L132 54L130 72L139 72L137 88C120 77 82 77 63 90Z" {...shape(c)} />
    case 'bangs': return <path d="M63 88C60 63 78 51 100 51C123 51 140 63 137 88C120 81 81 81 63 88Z" {...shape(c)} />
    case 'ponytail':
    case 'bun':
      return (
        <g>
          <path d="M64 88C64 62 80 51 100 51C122 51 137 62 136 86C122 71 82 69 64 88Z" {...shape(c)} />
          <path d="M84 60C94 56 108 56 118 60" {...line} strokeWidth={1.8} opacity=".5" />
        </g>
      )
    case 'buzz':
      return (
        <g>
          <path d="M65 84C66 60 82 51 100 51C120 51 135 60 135 82C120 72 82 71 65 84Z" fill={c} opacity=".6" />
          {[[78, 62], [90, 57], [104, 56], [117, 59], [127, 66], [84, 68], [110, 64]].map(([x, y]) => <path key={x + '-' + y} d={`M${x} ${y}l1.5 2`} {...line} strokeWidth={1.6} />)}
        </g>
      )
    default: return null
  }
}

// ---------- Cara ----------
function Brows({ type }) {
  switch (type) {
    case 'soft': return <g {...line} strokeWidth={3}><path d="M77 84q7-5 14-1" /><path d="M101 83q7-4 14 1" /></g>
    case 'bold': return <g {...line} strokeWidth={5}><path d="M76 85l15-4" /><path d="M101 81l15 4" /></g>
    case 'raised': return <g {...line} strokeWidth={3.2}><path d="M77 79q7-9 14-4" /><path d="M101 75q7-5 14 4" /></g>
    case 'angry': return <g {...line} strokeWidth={4}><path d="M76 79l15 8" /><path d="M101 87l15-8" /></g>
    case 'worried': return <g {...line} strokeWidth={3.2}><path d="M77 86l14-6" /><path d="M101 80l14 6" /></g>
    default: return null
  }
}

const star = (cx, cy, r = 7) => `M${cx} ${cy - r}L${cx + r * 0.3} ${cy - r * 0.3}L${cx + r} ${cy - r * 0.25}L${cx + r * 0.45} ${cy + r * 0.25}L${cx + r * 0.6} ${cy + r}L${cx} ${cy + r * 0.55}L${cx - r * 0.6} ${cy + r}L${cx - r * 0.45} ${cy + r * 0.25}L${cx - r} ${cy - r * 0.25}L${cx - r * 0.3} ${cy - r * 0.3}Z`

function Eyes({ type }) {
  switch (type) {
    case 'happy': return <g {...line} strokeWidth={3.2}><path d="M78 97q6-8 12 0" /><path d="M102 97q6-8 12 0" /></g>
    case 'wink': return <g><circle cx="84" cy="95" r="3.6" fill={INK} /><path d="M102 97q6-8 12 0" {...line} strokeWidth={3.2} /></g>
    case 'sleepy': return <g {...line} strokeWidth={3}><path d="M78 95q6 5 12 0" /><path d="M102 95q6 5 12 0" /><path d="M120 84q3-2 6 0M124 78q2-1 4 0" strokeWidth={1.8} /></g>
    case 'big': return <g>{[84, 108].map((x) => <g key={x}><ellipse cx={x} cy="95" rx="7.5" ry="8.5" {...shape('#FFFFFF')} strokeWidth={2.2} /><circle cx={x - 1} cy="96" r="4" fill={INK} /><circle cx={x + 0.6} cy="94" r="1.4" fill="#FFFFFF" /></g>)}</g>
    case 'stars': return <g><path d={star(84, 95)} {...shape('#F9DC5C')} strokeWidth={1.8} /><path d={star(108, 95)} {...shape('#F9DC5C')} strokeWidth={1.8} /></g>
    case 'lashes': return <g><circle cx="84" cy="95" r="3.6" fill={INK} /><circle cx="108" cy="95" r="3.6" fill={INK} /><g {...line} strokeWidth={2}><path d="M80 91l-3-3M83 90l-1-4M112 91l3-3M109 90l1-4" /></g></g>
    case 'xx': return <g {...line} strokeWidth={2.6}><path d="M80 91l8 8M88 91l-8 8M104 91l8 8M112 91l-8 8" /></g>
    default: return <g fill={INK}><circle cx="84" cy="95" r="3.6" /><circle cx="108" cy="95" r="3.6" /></g>
  }
}

function Mouth({ type }) {
  switch (type) {
    case 'grin': return <g><path d="M84 107C91 110 101 110 108 107C107 117 102 121 96 121C90 121 85 116 84 107Z" {...shape('#FFFFFF')} /><path d="M86 111C92 113 100 113 106 111" {...line} strokeWidth={1.6} /></g>
    case 'laugh': return <g><path d="M83 106C91 109 101 109 109 106C109 120 103 126 96 126C89 126 83 120 83 106Z" {...shape('#5A2A2A')} /><path d="M89 121C93 117 99 117 103 121C101 124 98 125 96 125C93 125 91 124 89 121Z" fill="#FF8FA3" /></g>
    case 'tongue': return <g><path d="M93 112C93 122 103 122 103 112Z" {...shape('#FF8FA3')} strokeWidth={2} /><path d="M85 108q11 9 22 0" {...line} strokeWidth={2.8} /></g>
    case 'smirk': return <path d="M87 113q10 3 19-7" {...line} strokeWidth={2.8} />
    case 'flat': return <path d="M88 113h16" {...line} strokeWidth={2.8} />
    case 'o': return <ellipse cx="96" cy="114" rx="4.5" ry="6" {...shape('#5A2A2A')} />
    case 'frown': return <path d="M87 117q9-8 18 0" {...line} strokeWidth={2.8} />
    default: return <path d="M85 108q11 10 22 0" {...line} strokeWidth={2.8} />
  }
}

function FacialHair({ type, c }) {
  if (type === 'mustache') return <path d="M86 104C90 100 95 101 97 103C99 101 104 100 108 104C104 108 100 107 97 106C94 107 90 108 86 104Z" {...shape(c)} strokeWidth={2} />
  if (type === 'beard') return <path d="M66 100C67 122 82 134 100 134C118 134 133 122 134 100C129 110 121 115 112 116C106 111 90 111 84 116C76 114 70 109 66 100Z" {...shape(c)} />
  if (type === 'stubble') return <g fill={INK} opacity=".45">{[[74, 114], [79, 120], [86, 125], [94, 127], [102, 127], [110, 125], [117, 120], [122, 114], [92, 120], [104, 120]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="1.1" />)}</g>
  return null
}

function Glasses({ type }) {
  const temple = <path d="M118 93l17-2" {...line} strokeWidth={2.2} />
  if (type === 'round') return <g>{temple}<circle cx="84" cy="95" r="9" {...shape('none')} strokeWidth={2.2} /><circle cx="108" cy="95" r="9" {...shape('none')} strokeWidth={2.2} /><path d="M93 94q3-2 6 0" {...line} strokeWidth={2.2} /></g>
  if (type === 'square') return <g>{temple}<rect x="74" y="88" width="19" height="14" rx="3" {...shape('none')} strokeWidth={2.2} /><rect x="99" y="88" width="19" height="14" rx="3" {...shape('none')} strokeWidth={2.2} /><path d="M93 94h6" {...line} strokeWidth={2.2} /></g>
  if (type === 'heart') return <g>{temple}{[84, 108].map((x) => <path key={x} d={`M${x} 104C${x - 8} 99 ${x - 11} 94 ${x - 10} 90C${x - 9} 86 ${x - 3} 85 ${x} 89C${x + 3} 85 ${x + 9} 86 ${x + 10} 90C${x + 11} 94 ${x + 8} 99 ${x} 104Z`} {...shape('#FF8FA3')} strokeWidth={2.2} />)}<path d="M94 92h4" {...line} strokeWidth={2.2} /></g>
  if (type === 'sun') return <g>{temple}<path d="M74 89h19v5c0 5-4 8-9 8s-10-3-10-8Z" fill={INK} /><path d="M99 89h19v5c0 5-4 8-9 8s-10-3-10-8Z" fill={INK} /><path d="M93 92h6" {...line} strokeWidth={2.2} /><path d="M78 92l4 0M103 92l4 0" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" /></g>
  return null
}

// Cuánto sube la corona para quedar apoyada encima de los peinados altos
const CROWN_LIFT = { afro: -28, bun: -24, spiky: -12 }

function Accessory({ type, hair }) {
  switch (type) {
    case 'earrings': return <circle cx="139" cy="108" r="3.2" {...shape('#F9DC5C')} strokeWidth={2} />
    case 'headband': return <path d="M64 80C74 60 126 58 136 80" {...line} stroke="#E84855" strokeWidth={6} />
    case 'flower': return <g>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="130" cy="62" rx="4.5" ry="7" transform={`rotate(${r} 130 70)`} {...shape('#EFABFF')} strokeWidth={1.8} />)}<circle cx="130" cy="70" r="3.6" {...shape('#F9DC5C')} strokeWidth={1.8} /></g>
    case 'headphones': return <g><path d="M60 94C56 50 144 50 140 94" {...line} strokeWidth={5} /><rect x="54" y="86" width="12" height="22" rx="6" {...shape('#E84855')} /><rect x="132" y="84" width="12" height="22" rx="6" {...shape('#E84855')} /></g>
    case 'crown': return <path d="M74 60L78 36L90 48L100 30L110 48L122 36L126 60C110 55 90 55 74 60Z" transform={`translate(0 ${CROWN_LIFT[hair] ?? 0})`} {...shape('#F9DC5C')} />
    case 'cap': return <g><path d="M64 84C62 60 80 46 102 46C124 46 138 60 137 82C120 74 84 74 64 84Z" {...shape('#3185FC')} /><path d="M64 84C52 84 42 88 40 92C52 94 66 92 78 86" {...shape('#3185FC')} /><path d="M100 46v-3" {...line} /></g>
    case 'beanie': return <g><path d="M62 86C60 58 78 44 100 44C122 44 140 58 138 86Z" {...shape('#E84855')} /><path d="M60 86C80 80 120 80 140 86L139 94C120 88 80 88 61 94Z" {...shape('#E84855')} /><circle cx="100" cy="40" r="6" {...shape('#E84855')} /></g>
    default: return null
  }
}

// ---------- Ropa ----------
const BODY = 'M36 212C38 172 62 153 100 151C138 153 162 172 164 212Z'
function Outfit({ type, c }) {
  const fill = type === 'tuxedo' ? INK : type === 'chef' ? '#FFFFFF' : c
  return (
    <g>
      {type === 'hoodie' && <path d="M70 160C70 140 130 140 130 160" {...shape(fill)} />}
      <path d={BODY} {...shape(fill)} />
      {type === 'tee' && <path d="M88 152C91 159 105 159 108 152" {...line} />}
      {type === 'vneck' && <g {...line}><path d="M88 152L98 168L108 152" /><path d="M84 153L98 174L112 153" strokeWidth={1.8} /></g>}
      {type === 'turtleneck' && <path d="M86 140C93 143 103 143 110 140L112 156C102 160 94 160 84 156Z" {...shape(fill)} />}
      {type === 'shirt' && <g><path d="M86 150L92 162L98 155L104 162L110 150" {...shape(fill)} /><path d="M98 156v56" {...line} strokeWidth={2} /><circle cx="101" cy="172" r="1.4" fill={INK} /><circle cx="101" cy="186" r="1.4" fill={INK} /></g>}
      {type === 'hoodie' && <g {...line} strokeWidth={2}><path d="M92 158v16M106 158v16" /></g>}
      {type === 'sweater' && <g {...line} strokeWidth={2}><path d="M88 152C91 159 105 159 108 152" strokeWidth={SW} /><path d="M86 156C91 164 105 164 110 156" /><path d="M50 196C80 190 120 190 150 196" /></g>}
      {type === 'sport' && <g><path d="M88 152C91 159 105 159 108 152" {...line} /><path d="M60 166L74 212M140 166L126 212" stroke="#FFFFFF" strokeWidth="5" /><path d="M60 166L74 212M140 166L126 212" {...line} strokeWidth={1.4} opacity=".4" /></g>}
      {type === 'chef' && <g><path d="M88 152C91 159 105 159 108 152" {...line} /><path d="M80 158L118 196M118 158L80 196" {...line} strokeWidth={1.8} opacity=".35" /><g fill={INK}><circle cx="90" cy="170" r="1.8" /><circle cx="108" cy="170" r="1.8" /><circle cx="90" cy="184" r="1.8" /><circle cx="108" cy="184" r="1.8" /></g></g>}
      {type === 'suit' && <g><path d="M86 151L98 184L110 151Z" {...shape('#FFFFFF')} /><path d="M98 156l-4 7 4 18 4-18Z" {...shape('#E84855')} strokeWidth={1.8} /><path d="M86 151L80 176L94 172M110 151L116 176L102 172" {...line} strokeWidth={2} /></g>}
      {type === 'stripes' && <g><path d="M88 152C91 159 105 159 108 152" {...line} /><g {...line} strokeWidth={2}><path d="M48 176C80 171 120 171 152 176" /><path d="M42 192C80 186 120 186 158 192" /></g></g>}
      {type === 'dots' && <g><path d="M88 152C91 159 105 159 108 152" {...line} /><g fill={INK}>{[[66, 172], [82, 166], [116, 166], [132, 172], [56, 190], [74, 184], [92, 180], [110, 182], [128, 186], [146, 192], [98, 196]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="2" />)}</g></g>}
      {type === 'overalls' && <g><path d="M74 172C90 170 108 170 124 172L126 212H72Z" {...shape('#3185FC')} /><path d="M77 172L70 154M121 172L128 154" {...line} /><path d="M88 152C91 159 105 159 108 152" {...line} /><circle cx="80" cy="178" r="2" fill={INK} /><circle cx="118" cy="178" r="2" fill={INK} /></g>}
      {type === 'tuxedo' && (
        <g>
          <path d="M86 151L98 186L110 151Z" fill="#FFFFFF" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M86 151L94 172M110 151L102 172" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
          <path d="M91 156L98 160L105 156L105 164L98 160L91 164Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="98" cy="172" r="1.3" fill={INK} /><circle cx="98" cy="179" r="1.3" fill={INK} />
        </g>
      )}
    </g>
  )
}

/** Avatar a partir de sus opciones. `viewBox` permite hacer zoom (p. ej. solo la cara en las miniaturas). */
export default function Avatar({ avatar = DEFAULT_AVATAR, size = 160, round = true, viewBox = '0 0 200 200' }) {
  const a = { ...DEFAULT_AVATAR, ...avatar }
  const skin = color('skin', a.skin)
  const hair = color('hairColor', a.hairColor)
  const hatOn = a.accessory === 'cap' || a.accessory === 'beanie'
  return (
    <svg viewBox={viewBox} width={size} height={size} role="img" aria-label="Avatar" className="avatar"
      style={{ borderRadius: round ? '50%' : 22, background: color('bg', a.bg) }}>
      <HairBack style={hatOn && ['afro', 'bun', 'spiky'].includes(a.hair) ? 'none' : a.hair} c={hair} />
      <Outfit type={a.outfit} c={color('outfitColor', a.outfitColor)} />
      {/* Cuello: relleno sin contorno + solo las dos líneas laterales (sin raya por abajo) */}
      <path d="M90 124V153C95 156 105 156 110 153V124Z" fill={skin} />
      <path d="M90 126V151M110 126V151" {...line} />
      {/* Oreja (vista de tres cuartos: solo se ve la derecha) */}
      <path d="M134 86C147 82 150 104 135 106" {...shape(skin)} />
      <path d="M137 92q4 2 1 7" {...line} strokeWidth={1.8} />
      {/* Cabeza */}
      <path d="M100 52C122 51 137 68 136 93C136 117 121 133 99 133C77 133 63 117 63 93C63 68 78 52 100 52Z" {...shape(skin)} />
      <circle cx="78" cy="105" r="4.5" fill="#FF8FA3" opacity=".45" />
      <circle cx="113" cy="105" r="4.5" fill="#FF8FA3" opacity=".45" />
      <FacialHair type={a.facialHair} c={hair} />
      <Eyes type={a.eyes} />
      <Brows type={a.brows} />
      <path d="M95 97q-4 5 1 7" {...line} strokeWidth={2.2} />
      <Mouth type={a.mouth} />
      {!(hatOn && (['afro', 'short', 'buzz', 'bangs', 'spiky'].includes(a.hair) || curlyOf(a.hair))) && <HairFront style={a.hair} c={hair} />}
      <Glasses type={a.glasses} />
      <Accessory type={a.accessory} hair={a.hair} />
    </svg>
  )
}
