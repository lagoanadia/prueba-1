import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '../data/avatar.js'

const INK = '#202124'
const color = (key, id) => AVATAR_OPTIONS[key].find((o) => o.id === id)?.color

/** Pelo que va DETRÁS de la cabeza (melena larga, rizos...). */
function HairBack({ style, c }) {
  if (style === 'long') return <path d="M56 88C52 130 54 160 64 172H136C146 160 148 130 144 88C140 50 60 50 56 88Z" fill={c} stroke={INK} strokeWidth="3" />
  if (style === 'curly') return <g fill={c} stroke={INK} strokeWidth="3">{[[62, 70], [80, 52], [100, 46], [120, 52], [138, 70], [146, 92], [54, 92]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="16" />)}</g>
  if (style === 'bun') return <circle cx="100" cy="38" r="16" fill={c} stroke={INK} strokeWidth="3" />
  return null
}

/** Pelo que va DELANTE (flequillo / parte de arriba). */
function HairFront({ style, c }) {
  const p = { fill: c, stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' }
  if (style === 'buzz') return <path d="M62 82C62 54 138 54 138 82C122 70 78 70 62 82Z" {...p} />
  if (style === 'curly') return <path d="M60 84C62 56 84 46 100 48C118 46 140 58 140 84C128 70 112 74 100 66C88 74 72 70 60 84Z" {...p} />
  return <path d="M58 88C56 58 80 44 102 46C126 46 144 62 142 88C130 74 112 66 96 66C82 72 68 76 58 88Z" {...p} />
}

function Eyes({ type }) {
  const s = { fill: 'none', stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round' }
  if (type === 'happy') return <g {...s}><path d="M78 96q6-7 12 0" /><path d="M110 96q6-7 12 0" /></g>
  if (type === 'wink') return <g><circle cx="84" cy="95" r="4.5" fill={INK} /><path d="M110 96q6-7 12 0" {...s} /></g>
  return <g fill={INK}><circle cx="84" cy="95" r="4.5" /><circle cx="116" cy="95" r="4.5" /></g>
}

function Glasses({ type }) {
  if (type === 'round') return <g fill="none" stroke={INK} strokeWidth="3"><circle cx="84" cy="95" r="12" /><circle cx="116" cy="95" r="12" /><path d="M96 95h8M58 92l14 1M142 92l-14 1" /></g>
  if (type === 'sun') return <g stroke={INK} strokeWidth="3"><rect x="70" y="86" width="26" height="17" rx="7" fill={INK} /><rect x="104" y="86" width="26" height="17" rx="7" fill={INK} /><path d="M96 93h8" /></g>
  return null
}

function Outfit({ type, c, skin }) {
  const body = 'M36 200C38 160 64 142 100 142C136 142 162 160 164 200Z'
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      {type === 'hoodie' && <path d="M66 150C70 128 130 128 134 150L120 160H80Z" fill={c} />}
      <path d={body} fill={c} />
      {type === 'tee' && <path d="M84 143C88 156 112 156 116 143" fill={skin} />}
      {type === 'hoodie' && <path d="M92 152v18M108 152v18" fill="none" strokeLinecap="round" />}
      {type === 'sweater' && <path d="M44 178C80 172 120 172 156 178M40 190C80 184 120 184 160 190" fill="none" />}
      {type === 'suit' && <><path d="M86 143L100 172L114 143" fill="#FFFFFF" /><path d="M100 150l-5 8 5 6 5-6Z" fill="#E84855" /></>}
      {type === 'chef' && <path d="M90 150v40M110 150v40" fill="none" strokeDasharray="1 9" strokeWidth="5" strokeLinecap="round" />}
      {type === 'sport' && <path d="M60 160L76 200M140 160L124 200" fill="none" stroke="#FFFFFF" strokeWidth="6" />}
    </g>
  )
}

/** Avatar dibujado en SVG a partir de sus opciones. `size` en px. */
export default function Avatar({ avatar = DEFAULT_AVATAR, size = 160, round = true }) {
  const a = { ...DEFAULT_AVATAR, ...avatar }
  const skin = color('skin', a.skin)
  const hair = color('hairColor', a.hairColor)
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Avatar" className="avatar"
      style={{ borderRadius: round ? '50%' : 24, background: color('bg', a.bg) }}>
      <HairBack style={a.hair} c={hair} />
      <Outfit type={a.outfit} c={color('outfit', a.outfit)} skin={skin} />
      <path d="M88 124v22h24v-22Z" fill={skin} stroke={INK} strokeWidth="3" />
      <ellipse cx="100" cy="96" rx="42" ry="46" fill={skin} stroke={INK} strokeWidth="3" />
      <ellipse cx="57" cy="100" rx="6" ry="9" fill={skin} stroke={INK} strokeWidth="3" />
      <ellipse cx="143" cy="100" rx="6" ry="9" fill={skin} stroke={INK} strokeWidth="3" />
      <HairFront style={a.hair} c={hair} />
      <Eyes type={a.eyes} />
      <circle cx="76" cy="111" r="6" fill="#E84855" opacity=".25" />
      <circle cx="124" cy="111" r="6" fill="#E84855" opacity=".25" />
      <path d="M90 117q10 9 20 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <Glasses type={a.glasses} />
    </svg>
  )
}
