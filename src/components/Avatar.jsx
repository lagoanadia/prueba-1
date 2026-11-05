import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '../data/avatar.js'

/*
 * AVATAR "DOODLE"
 * Truco del estilo dibujado a mano: cada forma se pinta dos veces:
 *   1. el relleno de color en su sitio
 *   2. el contorno negro un pelín desplazado (como un dibujo coloreado sin calcar)
 * Las curvas están hechas a propósito un poco irregulares.
 */
const INK = '#202124'
const color = (key, id) => AVATAR_OPTIONS[key].find((o) => o.id === id)?.color

/** Forma doodle: relleno + contorno desplazado. */
function D({ d, fill, sw = 3.2, off = 1.6 }) {
  return (
    <g>
      {fill && <path d={d} fill={fill} />}
      <path d={d} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${-off} ${-off})`} />
    </g>
  )
}
/** Línea doodle (sin relleno). */
const L = ({ d, sw = 3.2, c = INK }) => <path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />

// ---------- Pelo ----------
const HAIR_BACK = {
  long: 'M57 96C51 140 56 170 67 179C90 183 112 183 134 179C145 169 150 140 143 96C139 52 61 52 57 96Z',
  bob: 'M55 100C53 124 58 139 70 141C90 143 112 143 131 141C142 138 147 124 145 100C142 57 58 57 55 100Z',
  afro: 'M100 20C134 18 163 40 163 78C167 112 152 133 140 134C114 137 86 137 60 134C47 131 33 110 37 78C40 41 68 21 100 20Z',
  ponytail: 'M137 68C164 72 172 112 152 136C149 114 145 96 132 84Z',
  bun: 'M100 22C112 21 121 30 120 41C119 52 110 58 99 57C88 57 80 49 81 39C82 29 89 22 100 22Z',
}
const HAIR_FRONT = {
  short: 'M58 92C54 60 78 44 102 46C129 47 147 65 142 92C132 76 116 68 98 70C84 76 70 80 58 92Z',
  long: 'M58 97C55 60 80 45 100 46C125 46 147 62 142 97C134 75 117 64 101 60C92 73 75 85 58 97Z',
  bob: 'M57 91C57 58 80 46 100 46C123 46 143 58 143 91C126 83 74 83 57 91Z',
  ponytail: 'M60 86C62 58 84 48 102 48C125 48 141 60 140 85C120 71 84 70 60 86Z',
  bun: 'M60 86C62 58 84 48 102 48C125 48 141 60 140 85C120 71 84 70 60 86Z',
  curly: 'M58 88C55 72 63 59 74 62C76 50 90 46 98 52C107 44 123 48 124 60C137 58 147 72 142 88C130 80 120 82 110 76C100 84 86 84 78 78C70 84 62 84 58 88Z',
  afro: 'M58 88C55 72 63 59 74 62C76 50 90 46 98 52C107 44 123 48 124 60C137 58 147 72 142 88C130 80 120 82 110 76C100 84 86 84 78 78C70 84 62 84 58 88Z',
  spiky: 'M58 89L61 62L72 72L77 47L90 64L100 41L111 63L123 48L128 72L139 61L142 89C120 77 80 77 58 89Z',
  buzz: 'M62 83C64 56 136 55 138 83C120 71 80 71 62 83Z',
}
const CURLS = [[60, 72], [76, 54], [98, 46], [122, 52], [140, 70], [147, 94], [53, 94]]

function HairBack({ style, c }) {
  if (style === 'curly') return <g>{CURLS.map(([x, y]) => <D key={x} d={`M${x} ${y - 15}C${x + 9} ${y - 16} ${x + 16} ${y - 8} ${x + 15} ${y + 1}C${x + 15} ${y + 10} ${x + 7} ${y + 16} ${x - 1} ${y + 15}C${x - 10} ${y + 15} ${x - 16} ${y + 7} ${x - 15} ${y - 1}C${x - 15} ${y - 10} ${x - 8} ${y - 15} ${x} ${y - 15}Z`} fill={c} />)}</g>
  return HAIR_BACK[style] ? <D d={HAIR_BACK[style]} fill={c} /> : null
}
const HairFront = ({ style, c }) => (HAIR_FRONT[style] ? <D d={HAIR_FRONT[style]} fill={c} /> : null)

// ---------- Cara ----------
function Brows({ type, c }) {
  if (type === 'soft') return <g><L d="M75 80q8-5 16-1" c={c} /><L d="M109 79q8-4 16 1" c={c} /></g>
  if (type === 'bold') return <g><L d="M74 81l18-4" sw={5} c={c} /><L d="M108 77l18 4" sw={5} c={c} /></g>
  if (type === 'raised') return <g><L d="M75 76q8-8 16-3" c={c} /><L d="M109 73q8-5 16 3" c={c} /></g>
  return null
}

const star = (cx, cy) => `M${cx} ${cy - 8}L${cx + 2.5} ${cy - 2.5}L${cx + 8} ${cy - 2}L${cx + 3.5} ${cy + 2}L${cx + 5} ${cy + 8}L${cx} ${cy + 4.5}L${cx - 5} ${cy + 8}L${cx - 3.5} ${cy + 2}L${cx - 8} ${cy - 2}L${cx - 2.5} ${cy - 2.5}Z`

function Eyes({ type }) {
  switch (type) {
    case 'happy': return <g><L d="M77 97q7-8 14 0" sw={3.6} /><L d="M109 97q7-8 14 0" sw={3.6} /></g>
    case 'wink': return <g><circle cx="84" cy="95" r="4.6" fill={INK} /><L d="M109 97q7-8 14 0" sw={3.6} /></g>
    case 'sleepy': return <g><L d="M77 96q7 5 14 0" sw={3.4} /><L d="M109 96q7 5 14 0" sw={3.4} /></g>
    case 'big': return <g>{[84, 116].map((x) => <g key={x}><D d={`M${x} 86C${x + 6} 86 ${x + 9} 90 ${x + 9} 95C${x + 9} 101 ${x + 5} 104 ${x} 104C${x - 6} 104 ${x - 9} 100 ${x - 9} 95C${x - 9} 90 ${x - 5} 86 ${x} 86Z`} fill="#FFFFFF" sw={2.6} off={1} /><circle cx={x + 1} cy="96" r="4" fill={INK} /><circle cx={x + 2.5} cy="94" r="1.4" fill="#FFFFFF" /></g>)}</g>
    case 'stars': return <g><D d={star(84, 95)} fill="#F9DC5C" sw={2.4} off={1} /><D d={star(116, 95)} fill="#F9DC5C" sw={2.4} off={1} /></g>
    default: return <g fill={INK}><circle cx="84" cy="95" r="4.6" /><circle cx="116" cy="95" r="4.6" /></g>
  }
}

function Mouth({ type }) {
  switch (type) {
    case 'grin': return <D d="M86 113C93 112 107 112 114 113C113 124 107 129 100 129C93 129 87 124 86 113Z" fill="#FFFFFF" sw={3} off={1} />
    case 'flat': return <L d="M90 118q10 1 20-1" sw={3.4} />
    case 'o': return <D d="M100 112C104 112 106 115 106 119C106 123 103 125 100 125C96 125 94 122 94 118C94 115 97 112 100 112Z" fill="#E84855" sw={3} off={1} />
    case 'tongue': return <g><D d="M95 119C95 126 105 126 105 119Z" fill="#FF8FA3" sw={2.6} off={0.8} /><L d="M88 115q12 10 24 0" sw={3.4} /></g>
    case 'smirk': return <L d="M89 118q11 5 22-5" sw={3.4} />
    default: return <L d="M88 114q12 10 24 0" sw={3.4} />
  }
}

function FacialHair({ type, c }) {
  if (type === 'mustache') return <D d="M85 111C91 104 98 107 100 110C102 107 109 104 115 111C109 116 104 114 100 113C96 114 91 116 85 111Z" fill={c} sw={2.6} off={1} />
  if (type === 'beard') return <D d="M61 102C62 134 81 147 100 147C119 147 138 134 139 102C131 121 118 125 100 125C82 125 69 121 61 102Z" fill={c} />
  if (type === 'stubble') return <g fill={c} opacity=".55">{[[74, 118], [80, 126], [88, 132], [100, 134], [112, 132], [120, 126], [126, 118], [94, 128], [106, 128]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="1.6" />)}</g>
  return null
}

function Glasses({ type }) {
  const temples = <L d="M58 91l14 2M142 91l-14 2" sw={2.8} />
  if (type === 'round') return <g>{temples}<L d="M84 83C91 83 96 88 96 95C96 102 91 107 84 107C77 107 72 102 72 95C72 88 77 83 84 83ZM116 83C123 83 128 88 128 95C128 102 123 107 116 107C109 107 104 102 104 95C104 88 109 83 116 83ZM96 94q4-3 8 0" sw={3} /></g>
  if (type === 'square') return <g>{temples}<L d="M71 86C79 85 89 85 97 86C98 92 98 98 97 104C89 105 79 105 71 104C70 98 70 92 71 86ZM103 86C111 85 121 85 129 86C130 92 130 98 129 104C121 105 111 105 103 104C102 98 102 92 103 86ZM97 93h6" sw={3} /></g>
  if (type === 'sun') return <g>{temples}<D d="M70 87C79 85 89 85 97 87C97 96 93 103 84 103C75 103 70 96 70 87Z" fill={INK} sw={2.6} off={0.8} /><D d="M103 87C111 85 121 85 130 87C130 96 125 103 116 103C107 103 103 96 103 87Z" fill={INK} sw={2.6} off={0.8} /><L d="M97 91h6" sw={3} /></g>
  if (type === 'heart') return <g>{temples}{[84, 116].map((x) => <D key={x} d={`M${x} 104C${x - 9} 98 ${x - 13} 93 ${x - 12} 88C${x - 11} 83 ${x - 4} 82 ${x} 87C${x + 4} 82 ${x + 11} 83 ${x + 12} 88C${x + 13} 93 ${x + 9} 98 ${x} 104Z`} fill="#FF8FA3" sw={2.6} off={0.8} />)}<L d="M96 92h8" sw={3} /></g>
  return null
}

function Accessory({ type }) {
  switch (type) {
    case 'earrings': return <g><D d="M58 112C61 112 62 115 62 117C62 120 60 121 58 121C55 121 54 119 54 117C54 114 56 112 58 112Z" fill="#F9DC5C" sw={2.4} off={0.6} /><D d="M142 112C145 112 146 115 146 117C146 120 144 121 142 121C139 121 138 119 138 117C138 114 140 112 142 112Z" fill="#F9DC5C" sw={2.4} off={0.6} /></g>
    case 'headband': return <D d="M58 80C70 60 130 58 142 80C140 84 138 86 136 86C124 68 76 68 64 86C62 86 59 84 58 80Z" fill="#E84855" />
    case 'flower': return <g>{[[0, -9], [9, -2], [5, 8], [-5, 8], [-9, -2]].map(([dx, dy], i) => <D key={i} d={`M${136 + dx} ${66 + dy - 6}C${142 + dx} ${66 + dy - 6} ${142 + dx} ${66 + dy + 6} ${136 + dx} ${66 + dy + 6}C${130 + dx} ${66 + dy + 6} ${130 + dx} ${66 + dy - 6} ${136 + dx} ${66 + dy - 6}Z`} fill="#EFABFF" sw={2.2} off={0.6} />)}<circle cx="136" cy="66" r="4.5" fill="#F9DC5C" stroke={INK} strokeWidth="2" /></g>
    case 'cap': return <g><D d="M56 78C56 50 76 38 100 38C124 38 144 50 144 78C120 70 80 70 56 78Z" fill="#3185FC" /><D d="M56 78C40 80 34 86 36 90C50 88 70 84 82 80Z" fill="#3185FC" /></g>
    case 'headphones': return <g><L d="M54 96C50 50 150 50 146 96" sw={6} /><D d="M48 88C56 87 60 92 60 100C60 108 56 113 48 112C43 111 42 104 42 100C42 95 43 89 48 88Z" fill="#E84855" /><D d="M152 88C144 87 140 92 140 100C140 108 144 113 152 112C157 111 158 104 158 100C158 95 157 89 152 88Z" fill="#E84855" /></g>
    case 'crown': return <D d="M70 52L76 26L90 42L100 20L110 42L124 26L130 52C112 47 88 47 70 52Z" fill="#F9DC5C" />
    default: return null
  }
}

// ---------- Ropa ----------
const BODY = 'M34 200C36 166 60 149 100 147C141 149 165 166 166 200Z'
function Outfit({ type, c, skin }) {
  const fixed = { suit: '#2E3440', chef: '#FFFFFF', sport: '#E84855' }
  const fill = fixed[type] ?? c
  return (
    <g>
      {type === 'hoodie' && <D d="M64 156C66 130 134 130 136 156C124 162 76 162 64 156Z" fill={fill} />}
      {type === 'turtleneck' && <D d="M84 136C94 133 106 133 116 136L118 156C106 159 94 159 82 156Z" fill={fill} />}
      <D d={BODY} fill={fill} />
      {(type === 'tee' || type === 'stripes' || type === 'sport') && <D d="M85 148C89 160 111 160 115 148Z" fill={skin} sw={3} off={1} />}
      {type === 'stripes' && <g>{[168, 180, 192].map((y) => <L key={y} d={`M${42 + (y - 168) / 4} ${y}C80 ${y - 4} 120 ${y - 4} ${158 - (y - 168) / 4} ${y}`} sw={4} c="#FFFFFF" />)}</g>}
      {type === 'hoodie' && <g><L d="M92 160v18M108 160v18" sw={2.8} /><circle cx="92" cy="180" r="2" fill={INK} /><circle cx="108" cy="180" r="2" fill={INK} /></g>}
      {type === 'sweater' && <g><L d="M44 178C80 172 120 172 156 178" sw={2.8} /><L d="M40 190C80 184 120 184 160 190" sw={2.8} /><L d="M84 150C90 158 110 158 116 150" sw={2.8} /></g>}
      {type === 'overalls' && <g><D d="M74 166C90 164 110 164 126 166L128 200H72Z" fill="#3185FC" /><L d="M76 166L70 150M124 166L130 150" sw={4} /><circle cx="80" cy="172" r="3" fill="#F9DC5C" stroke={INK} strokeWidth="2" /><circle cx="120" cy="172" r="3" fill="#F9DC5C" stroke={INK} strokeWidth="2" /></g>}
      {type === 'suit' && <g><D d="M86 148L100 178L114 148Z" fill="#FFFFFF" sw={3} off={1} /><D d="M100 154l-6 8 6 7 6-7Z" fill="#E84855" sw={2.4} off={0.6} /></g>}
      {type === 'chef' && <g><L d="M88 152L112 176M112 152L88 176" sw={2.6} /><circle cx="92" cy="186" r="2.4" fill={INK} /><circle cx="108" cy="186" r="2.4" fill={INK} /></g>}
      {type === 'sport' && <g><L d="M58 164L74 200M142 164L126 200" sw={6} c="#FFFFFF" /><L d="M92 176h16" sw={4} c="#FFFFFF" /></g>}
    </g>
  )
}

/** Avatar a partir de sus opciones. `viewBox` permite hacer zoom (p. ej. solo la cara en las miniaturas). */
export default function Avatar({ avatar = DEFAULT_AVATAR, size = 160, round = true, viewBox = '0 0 200 200' }) {
  const a = { ...DEFAULT_AVATAR, ...avatar }
  const skin = color('skin', a.skin)
  const hair = color('hairColor', a.hairColor)
  const hideHair = a.accessory === 'cap' && ['short', 'buzz', 'spiky', 'curly', 'afro'].includes(a.hair) // la gorra tapa el flequillo
  return (
    <svg viewBox={viewBox} width={size} height={size} role="img" aria-label="Avatar" className="avatar"
      style={{ borderRadius: round ? '50%' : 22, background: color('bg', a.bg) }}>
      <HairBack style={a.hair} c={hair} />
      <Outfit type={a.outfit} c={color('outfitColor', a.outfitColor)} skin={skin} />
      <D d="M89 130C88 138 88 146 89 152C96 154 104 154 111 152C112 146 112 138 111 130Z" fill={skin} />
      <D d="M62 88C48 85 47 113 63 111Z" fill={skin} />
      <D d="M138 88C152 85 153 113 137 111Z" fill={skin} />
      <D d="M100 50C127 49 144 70 143 98C142 126 124 143 100 143C75 144 57 125 57 97C57 69 74 51 100 50Z" fill={skin} />
      <circle cx="74" cy="110" r="6.5" fill="#FF8FA3" opacity=".35" />
      <circle cx="126" cy="110" r="6.5" fill="#FF8FA3" opacity=".35" />
      <FacialHair type={a.facialHair} c={hair} />
      <Eyes type={a.eyes} />
      <Brows type={a.brows} c={a.hair === 'bald' ? INK : hair === '#D9D9D9' ? '#9AA0A6' : INK} />
      <Mouth type={a.mouth} />
      {!hideHair && <HairFront style={a.hair} c={hair} />}
      <Glasses type={a.glasses} />
      <Accessory type={a.accessory} />
    </svg>
  )
}
