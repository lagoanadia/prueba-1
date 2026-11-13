import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { FriendsBox, FriendsProvider } from '../components/Friends.jsx'
import useFriendRequests from '../hooks/useFriendRequests.js'
import useAllBoards from '../hooks/useAllBoards.js'
import useSocial from '../hooks/useSocial.js'
import { EMOJIS, SOCIAL_EVENT, getFriendPosts } from '../services/socialService.js'
import { sanitize } from '../lib/richText.js'

const MOOD = { bueno: ['#3DDC97', 'Bien'], regular: ['#F9DC5C', 'Regular'], malo: ['#E84855', 'Mal'] }
const METRICS = { workouts: 'Entrenos', water: 'Días con el agua cumplida', habits: 'Hábitos cumplidos', focus: 'Sesiones de foco' }
const SECRETS = { sprout: ['Brote', 'Comparte algo por primera vez'], halo: ['Aureola', 'Cierra 3 días'], starclip: ['Estrella', 'Cierra 10 días'], partyhat: ['Gorro de fiesta', 'Llega con tu cumpleaños'], laurel: ['Laurel', '5 piezas'], medal: ['Medalla', '10 piezas'], wizard: ['Gorro de mago', '15 piezas'], tiara: ['Tiara', '20 piezas'] }
const TABS = [['feed', 'Feed'], ['retos', 'Retos'], ['edificio', 'Edificio'], ['ajustes', 'Ajustes']]
const ago = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días` }
const ring = (mood) => (mood ? MOOD[mood][0] : '#E8EAED')

/** Cara con el anillo del color de su humor. */
export function MoodFace({ person, size = 56, onClick }) {
  const inner = <span className="mood-face" style={{ '--ring': ring(person.mood) }}><Avatar avatar={person.avatar} size={size} />{person.session && <span className="mood-badge" title="Estudiando">●</span>}</span>
  return onClick ? <button className="mood-btn" onClick={onClick} aria-label={`@${person.username}`}>{inner}<span>@{person.username}</span></button> : inner
}

/** Torre de bloques (el edificio). */
function Tower({ blocks, max = 40 }) {
  const shown = blocks.slice(-max)
  return (
    <div className="tower" aria-label={`${blocks.length} días cerrados`}>
      {shown.map((b, i) => <span key={b.date} style={{ background: b.color, width: `${78 - ((i * 7) % 3) * 9}%`, '--i': i }} title={b.date} />)}
      {blocks.length === 0 && <span className="tower-empty">Aún sin bloques</span>}
    </div>
  )
}

export default function FriendsPage() {
  const { state, run } = useSocial()
  const [tab, setTab] = useState('feed')
  const [friend, setFriend] = useState(null) // perfil abierto
  const [sheet, setSheet] = useState(null) // { kind: 'challenge'|'gift'|'session', friend? }
  if (!state) return <div className="spinner" aria-label="Cargando" />
  const open = state.friends.find((f) => f.username === friend)

  return (
    <div className="friends-page">
      {open ? (
        <FriendProfile f={open} back={() => setFriend(null)} onSheet={(kind) => setSheet({ kind, friend: open })} run={run} />
      ) : (
        <>
          <div className="fp-strip">
            {state.friends.map((f) => <MoodFace key={f.username} person={f} onClick={() => setFriend(f.username)} />)}
            <AddFriendsButton />
          </div>
          <div className="tabs fp-tabs" role="tablist">
            {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
          </div>
          {tab === 'feed' && <Feed state={state} run={run} />}
          {tab === 'retos' && <Challenges state={state} run={run} onNew={() => setSheet({ kind: 'challenge' })} />}
          {tab === 'edificio' && <Building state={state} run={run} />}
          {tab === 'ajustes' && <Settings state={state} run={run} />}
        </>
      )}
      {sheet?.kind === 'challenge' && <ChallengeSheet friends={state.friends} preset={sheet.friend?.username} run={run} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'gift' && <GiftSheet to={sheet.friend} unlocks={state.me.unlocks} run={run} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'session' && <StudySession state={state} friend={sheet.friend} run={run} onClose={() => setSheet(null)} />}
    </div>
  )
}

// ---------- Feed ----------
function Feed({ state, run }) {
  const birthdays = state.friends.filter((f) => f.birthday)
  const studying = state.friends.filter((f) => f.session)

  return (
    <div className="feed">
      {state.gifts.map((g) => (
        <div key={g.id} className="card feed-card feed-special">
          <Avatar avatar={{ ...g.from.avatar, accessory: g.item }} size={56} />
          <span><b>@{g.from.username}</b> te ha regalado <b>{SECRETS[g.item]?.[0] ?? g.item}</b>{g.text && <><br /><span className="muted">«{g.text}»</span></>}<br /><span className="w-hint">Ya lo tienes en Perfil › Extras</span></span>
          <button className="pill" onClick={() => run('seenGifts')}>Gracias</button>
        </div>
      ))}
      {birthdays.map((f) => (
        <div key={f.username} className="card feed-card feed-special">
          <Avatar avatar={{ ...f.avatar, accessory: 'partyhat' }} size={56} />
          <span><b>@{f.username}</b> {f.birthday === 'today' ? 'cumple años hoy' : 'cumple años mañana'}</span>
        </div>
      ))}
      {studying.map((f) => (
        <div key={'s' + f.username} className="card feed-card feed-special">
          <MoodFace person={f} size={48} />
          <span><b>@{f.username}</b> está estudiando{f.session.label ? ` ${f.session.label}` : ''} · quedan {Math.max(1, Math.round((f.session.endsAt - Date.now()) / 60000))} min</span>
        </div>
      ))}
      <PostList posts={state.feed} run={run} empty={<div className="card feed-card feed-empty"><b>El feed está tranquilo</b><span className="muted">Cuando tú o tus amigos compartáis una receta, unos apuntes o algo bueno del día, aparecerá aquí durante un mes. Busca el botón «Compartir».</span></div>} />
    </div>
  )
}

/** Publicaciones (las del feed o todas las de un amigo): reaccionar, comentar, abrir apuntes, guardar recetas y dejar de compartir lo tuyo. */
function PostList({ posts, run, empty = null }) {
  const { change } = useAllBoards(true, ['comida'])
  const [comments, setComments] = useState(null)
  const [reading, setReading] = useState(null)
  const [saved, setSaved] = useState({})
  const saveRecipe = (p) => {
    const r = p.data
    change('comida', (d) => ({ ...d, dishes: [...(d.dishes ?? []), { id: crypto.randomUUID(), name: r.name, for: r.for?.length ? r.for : ['comida'], time: r.time ?? null, ingredients: r.ingredients ?? [], steps: r.steps ?? [] }] }))
    setSaved({ ...saved, [p.id]: true })
  }
  return (
    <>
      {posts.map((p) => (
        <article key={p.id} className="card feed-card">
          <header className="feed-who">
            <Avatar avatar={p.from.avatar} size={38} />
            <b>{p.mine ? 'Tú' : '@' + p.from.username}</b>
            {p.private && <span className="chip feed-private">{p.mine ? 'privado' : 'para ti'}</span>}
            <span className="muted feed-at">{ago(p.at)}</span>
          </header>
          {p.text && <p className="feed-text">{p.text}</p>}
          <PostBody p={p} onRead={() => setReading(p)} onSave={() => saveRecipe(p)} saved={saved[p.id]} />
          <footer className="feed-react">
            {EMOJIS.map((e) => (
              <button key={e} className={`emoji ${p.reactions[e].mine ? 'on' : ''}`} onClick={() => run('react', { owner: p.from.username, id: p.id, emoji: e })} aria-pressed={p.reactions[e].mine} aria-label={`Reaccionar ${e}`}>
                {e}{p.reactions[e].n > 0 && <small>{p.reactions[e].n}</small>}
              </button>
            ))}
            <button className={`feed-icon feed-comments ${comments === p.id ? 'on' : ''}`} onClick={() => setComments(p.id === comments ? null : p.id)} aria-expanded={comments === p.id}
              aria-label={p.comments.length ? `${p.comments.length} comentarios` : 'Comentar'} title={p.comments.length ? `${p.comments.length} comentarios` : 'Comentar'}>
              <Icon name="chat" size={18} />{p.comments.length > 0 && <small>{p.comments.length}</small>}
            </button>
            {p.mine && <button className="feed-icon feed-del" onClick={() => window.confirm('¿Dejar de compartir esto?') && run('unpost', { id: p.id })} aria-label="Dejar de compartir" title="Dejar de compartir"><Icon name="trash" size={16} color="#B3261E" /></button>}
          </footer>
          {comments === p.id && <Comments p={p} run={run} />}
        </article>
      ))}
      {posts.length === 0 && empty}
      {reading && <ReadDoc p={reading} onClose={() => setReading(null)} />}
    </>
  )
}

function PostBody({ p, onRead, onSave, saved }) {
  const d = p.data ?? {}
  if (p.kind === 'recipe') return (
    <div className="post-box" style={{ background: '#FBE4FF' }}>
      <b>{d.name}</b>
      <span className="muted">{(d.ingredients ?? []).length} ingredientes{d.steps?.length ? ` · ${d.steps.length} pasos` : ''}</span>
      {!p.mine && <button className="pill pill-pink" disabled={saved} onClick={onSave}>{saved ? 'Guardada en tus platos' : 'Guardar en mis platos'}</button>}
    </div>
  )
  if (p.kind === 'doc') return (
    <div className="post-box" style={{ background: '#E3EEFF' }}>
      <b>{d.title}</b>{d.subtitle && <span className="muted">{d.subtitle}</span>}
      <button className="pill" onClick={onRead}>Abrir</button>
    </div>
  )
  if (p.kind === 'good') return <blockquote className="post-quote">{d.text}</blockquote>
  return <div className="post-box"><b>{d.title}</b>{d.text && <span>{d.text}</span>}</div>
}

function Comments({ p, run }) {
  const [text, setText] = useState('')
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; await run('comment', { owner: p.from.username, id: p.id, text }); setText('') }
  return (
    <div className="feed-comment-box">
      {p.comments.map((c) => <div key={c.id} className="feed-comment"><Avatar avatar={c.from.avatar} size={26} /><span><b>@{c.from.username}</b> {c.text}</span></div>)}
      <form className="w-form" onSubmit={send}><input placeholder="Escribe un comentario…" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} /><button className="pill pill-on" disabled={!text.trim()}>Enviar</button></form>
    </div>
  )
}

/** Unos apuntes o un documento compartido, solo para leer. */
function ReadDoc({ p, onClose }) {
  const blocks = p.data?.blocks ?? []
  const tag = { h1: 'h2', h2: 'h3', h3: 'h4', quote: 'blockquote' }
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={p.data?.title}>
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel read-doc">
        <header className="area-head"><h2>{p.data?.title}</h2><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        <span className="muted">De @{p.from.username}</span>
        {blocks.map((b) => {
          if (b.type === 'divider') return <hr key={b.id} />
          const T = tag[b.type] ?? 'p'
          const prefix = b.type === 'bullet' ? '• ' : b.type === 'todo' ? (b.checked ? '☑ ' : '☐ ') : ''
          return <T key={b.id} className={`rd-${b.type}`}>{prefix}<span dangerouslySetInnerHTML={{ __html: sanitize(b.html ?? '') }} /></T>
        })}
      </div>
    </div>,
    document.body,
  )
}

// ---------- Perfil de un amigo ----------
function FriendProfile({ f, back, onSheet, run }) {
  const [posts, setPosts] = useState(null)
  useEffect(() => {
    const load = () => getFriendPosts(f.username).then((r) => setPosts(r.posts ?? [])).catch(() => setPosts((p) => p ?? []))
    load()
    window.addEventListener(SOCIAL_EVENT, load) // al reaccionar o comentar se pone al día
    return () => window.removeEventListener(SOCIAL_EVENT, load)
  }, [f.username])
  return (
    <div className="fp-profile">
      <button className="back-link" onClick={back}><Icon name="back" size={18} /> Amigos</button>
      <div className="fp-head">
        <MoodFace person={f} size={110} />
        <b className="fp-name">@{f.username}</b>
        {f.mood && <span className="chip" style={{ background: `color-mix(in srgb, ${MOOD[f.mood][0]} 35%, #FFFFFF)` }}>Hoy: {MOOD[f.mood][1]}</span>}
        {f.session && <span className="w-hint">Estudiando{f.session.label ? ` ${f.session.label}` : ''} ahora</span>}
      </div>
      <div className="fp-actions">
        <button className="pill pill-on" onClick={() => onSheet('challenge')}>Retar</button>
        <button className="pill" onClick={() => onSheet('session')}>Estudiar juntos</button>
        <button className="pill pill-pink" onClick={() => onSheet('gift')}>Regalar</button>
      </div>
      <div className="card fp-tower"><b>Su edificio</b><Tower blocks={f.tower} /><span className="muted">{f.tower.length} días cerrados</span></div>
      <div className="fp-posts">
        <b className="fp-posts-title">Todo lo que ha publicado</b>
        {posts === null ? <div className="spinner" aria-label="Cargando" /> : <PostList posts={posts} run={run} empty={<div className="card feed-card feed-empty"><span className="muted">Aún no ha compartido nada contigo.</span></div>} />}
      </div>
    </div>
  )
}

// ---------- Retos ----------
const GAME_NAMES = { wordle: 'Palabra del día', sudoku: 'Sudoku', bee: 'Spelling Bee', crossword: 'Mini crucigrama' }

const GAME_KEYS = Object.keys(GAME_NAMES)
const chevron = (d) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

/** Ranking semanal en forma de podio, un juego cada vez; las flechas pasan de un juego a otro. */
function Podium({ ranking }) {
  const games = GAME_KEYS.filter((g) => ranking[g]?.length)
  const [i, setI] = useState(0)
  if (!games.length) return <div className="card feed-card"><b>Ranking de la semana</b><span className="muted">Juega a los juegos del Journal y compite con tus amigos.</span></div>
  const k = ((i % games.length) + games.length) % games.length
  const g = games[k]
  const list = ranking[g]
  // Orden del podio: 2.º · 1.º · 3.º
  const spots = [[list[1], 2], [list[0], 1], [list[2], 3]]
  return (
    <div className="card feed-card podium-card">
      <div className="podium-top">
        <b>Ranking de la semana</b>
        {games.length > 1 ? (
          <div className="podium-nav">
            <button onClick={() => setI(k - 1)} aria-label="Juego anterior">{chevron('M15 5L8 12L15 19')}</button>
            <span>{GAME_NAMES[g]}</span>
            <button onClick={() => setI(k + 1)} aria-label="Juego siguiente">{chevron('M9 5L16 12L9 19')}</button>
          </div>
        ) : <span className="podium-game">{GAME_NAMES[g]}</span>}
      </div>
      {games.length > 1 && <div className="podium-dots">{games.map((x, j) => <i key={x} className={j === k ? 'on' : ''} />)}</div>}
      <div className="podium" key={g}>
        {spots.map(([p, pos]) => (
          <div key={pos} className={`podium-col p${pos} ${p?.me ? 'me' : ''}`}>
            {p && <>
              <span className="podium-av">
                {pos === 1 && <svg className="podium-crown" width="28" height="20" viewBox="0 0 30 22" aria-hidden="true"><path d="M3 18L5 5L11 11L15 3L19 11L25 5L27 18Z" fill="#F9DC5C" stroke="#202124" strokeWidth="1.8" strokeLinejoin="round" /></svg>}
                <Avatar avatar={p.avatar} size={pos === 1 ? 56 : 46} />
              </span>
              <b className="podium-name">{p.me ? 'Tú' : '@' + p.username}</b>
              <span className="podium-pts">{p.points}</span>
            </>}
            <span className="podium-step">{pos}</span>
          </div>
        ))}
      </div>
      {list.length > 3 && <div className="podium-rest">{list.slice(3, 6).map((p, j) => <span key={p.username ?? j}><b>{j + 4}</b> {p.me ? 'Tú' : '@' + p.username} · {p.points}</span>)}</div>}
    </div>
  )
}

const PIECE = 'M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z'
const piece = (on, size = 40) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={on ? '#F9DC5C' : '#F1F3F4'} stroke={on ? '#202124' : '#C9CDD2'} strokeWidth="1.4" strokeLinejoin="round" strokeDasharray={on ? undefined : '2 2'}><path d={PIECE} /></svg>

/** Piezas: 1 por cada día ganado en un juego; cada 5, un accesorio sorpresa. */
function Pieces({ pieces, run }) {
  const news = pieces.news ?? []
  const prize = news.find((n) => n.prize)
  return (
    <div className="card feed-card pieces-card">
      <b>Piezas</b>
      <span className="muted pieces-rule">1 win = 1 pieza · 5 piezas = 1 sorpresa</span>
      <div className="pieces-row">
        <div className="pieces-left">
          <div className="pieces-set">{Array.from({ length: pieces.of }, (_, j) => <span key={j}>{piece(j < pieces.inRow)}</span>)}</div>
          <b className="pieces-count">{pieces.inRow} / {pieces.of}</b>
          <span className="bar"><span style={{ width: `${(pieces.inRow / pieces.of) * 100}%`, background: '#F9DC5C' }} /></span>
        </div>
        <div className="pieces-prize" aria-label="Próximo premio">
          <span className="pieces-box">{pieces.next ? <svg width="48" height="38" viewBox="0 0 56 44" aria-hidden="true"><path d="M8 34L14 8L22 20L28 4L34 20L42 8L48 34Z" fill="#202124" opacity=".12" /><rect x="6" y="34" width="44" height="6" rx="3" fill="#202124" opacity=".12" /></svg> : '✓'}</span>
          <span className="w-hint">{pieces.next ? 'Próximo: ???' : 'Todo conseguido'}</span>
        </div>
      </div>
      {news.length > 0 && (
        <div className="pieces-news">
          {piece(true, 30)}
          <span>
            <b>{news.length === 1 ? `¡Ganaste el ${GAME_NAMES[news[0].game]}!` : `¡${news.length} victorias!`}</b><br />
            <span className="muted">+{news.length} {news.length === 1 ? 'pieza' : 'piezas'}{prize ? ` · ¡Nuevo accesorio: ${SECRETS[prize.prize]?.[0]}! Está en Perfil` : ''}</span>
          </span>
          <button className="toast-x" onClick={() => run('seenPieces')} aria-label="Cerrar">×</button>
        </div>
      )}
    </div>
  )
}

function Challenges({ state, run, onNew }) {
  const ranking = state.ranking ?? {}
  return (
    <div className="feed">
      <Podium ranking={ranking} />
      {state.pieces && <Pieces pieces={state.pieces} run={run} />}
      {state.challenges.map((c) => (
        <div key={c.id} className="card feed-card">
          <div className="w-row"><b>{c.title}</b><span className="muted">{c.target} esta semana</span></div>
          {c.members.map((m) => (
            <div key={m.username} className={`ch-row ${m.accepted ? '' : 'is-pending'}`}>
              <Avatar avatar={m.avatar} size={30} />
              <span className="ch-name">{m.me ? 'Tú' : '@' + m.username}</span>
              <span className="bar ch-bar"><span style={{ width: `${Math.min(100, (m.value / c.target) * 100)}%`, background: m.value >= c.target ? '#3DDC97' : '#3185FC' }} /></span>
              <b className="ch-val">{m.value}/{c.target}</b>
            </div>
          ))}
          <div className="w-row">
            {!c.accepted ? <button className="pill pill-on" onClick={() => run('joinChallenge', { id: c.id })}>Aceptar el reto</button> : <span className="w-hint">Se cuenta solo con lo que apuntas</span>}
            <button className="text-link" onClick={() => run('leaveChallenge', { id: c.id })}>Salir</button>
          </div>
        </div>
      ))}
      {state.challenges.length === 0 && <div className="card feed-card feed-empty"><b>Sin retos</b><span className="muted">Reta a un amigo: entrenos, agua, hábitos o foco esta semana. Se cuenta solo con lo que apuntáis.</span></div>}
      <button className="pill pill-on fp-new" onClick={onNew} disabled={!state.friends.length}>+ Nuevo reto</button>
    </div>
  )
}

function Sheet({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return createPortal(
    <div className="popup" role="dialog" aria-modal="true" aria-label={title}>
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup-panel share-sheet"><b className="name-dialog-title">{title}</b>{children}</div>
    </div>,
    document.body,
  )
}

function ChallengeSheet({ friends, preset, run, onClose }) {
  const [metric, setMetric] = useState('workouts')
  const [target, setTarget] = useState(3)
  const [to, setTo] = useState(preset ? [preset] : [])
  const [err, setErr] = useState('')
  const create = async () => { try { await run('challenge', { metric, target, to }); onClose() } catch (e) { setErr(e.message) } }
  return (
    <Sheet title="Nuevo reto" onClose={onClose}>
      <div className="chips">{Object.entries(METRICS).map(([id, l]) => <button key={id} className={`chip ${metric === id ? 'chip-on' : ''}`} style={{ '--c': '#9CC5FF' }} onClick={() => setMetric(id)}>{l}</button>)}</div>
      <div className="gf-field"><span>¿Cuántos esta semana?</span>
        <div className="gf-step"><button type="button" className="mini" onClick={() => setTarget(Math.max(1, target - 1))} aria-label="Menos">−</button><input type="number" value={target} min="1" onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} aria-label="Objetivo" /><button type="button" className="mini" onClick={() => setTarget(target + 1)} aria-label="Más">+</button></div>
      </div>
      <span className="w-hint">Con quién</span>
      <div className="share-people">{friends.map((f) => <button key={f.username} className={`share-person ${to.includes(f.username) ? 'on' : ''}`} onClick={() => setTo(to.includes(f.username) ? to.filter((x) => x !== f.username) : [...to, f.username])}><Avatar avatar={f.avatar} size={44} /><span>@{f.username}</span></button>)}</div>
      {err && <p className="friends-error">{err}</p>}
      <button className="pill pill-on share-send" disabled={!to.length} onClick={create}>Retar</button>
    </Sheet>
  )
}

function GiftSheet({ to, unlocks, run, onClose }) {
  const [item, setItem] = useState(unlocks[0] ?? null)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const send = async () => { await run('gift', { to: to.username, item, text }); setDone(true); setTimeout(onClose, 1200) }
  return (
    <Sheet title={`Regalar a @${to.username}`} onClose={onClose}>
      {unlocks.length === 0 ? <p className="muted">Aún no tienes nada para regalar. Los accesorios especiales se consiguen cerrando días, compartiendo o en tu cumpleaños.</p> : (
        <div className="gift-grid">
          {unlocks.map((u) => <button key={u} className={`gift ${item === u ? 'on' : ''}`} onClick={() => setItem(u)}><Avatar avatar={{ ...to.avatar, accessory: u }} size={64} /><span>{SECRETS[u]?.[0] ?? u}</span></button>)}
        </div>
      )}
      <input className="pill-input" placeholder="Añade una nota (opcional)" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
      <button className="pill pill-on share-send" disabled={!item || done} onClick={send}>{done ? '¡Regalado!' : 'Regalar'}</button>
    </Sheet>
  )
}

// ---------- Estudiar juntos ----------
function StudySession({ state, friend, run, onClose }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const mine = state.me.session
  const join = friend?.session // si tu amigo ya está, te unes a su misma cuenta atrás
  const start = () => run('session', join ? { endsAt: join.endsAt, label: join.label } : { minutes: 25, label: '' })
  const stop = () => run('session', { stop: true })
  const left = mine ? Math.max(0, mine.endsAt - now) : 0
  const total = mine ? mine.minutes * 60000 : 1
  const mm = String(Math.floor(left / 60000)).padStart(2, '0')
  const ss = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const together = state.friends.filter((f) => f.session && (!mine || Math.abs(f.session.endsAt - mine.endsAt) < 15 * 60000))
  return (
    <Sheet title="Estudiar juntos" onClose={onClose}>
      <div className="study-faces">
        <span className="study-me"><b>Tú</b></span>
        {(friend ? [friend] : together).map((f) => <MoodFace key={f.username} person={f} size={64} />)}
      </div>
      <div className="study-ring" style={{ '--p': mine ? 100 - (left / total) * 100 : 0 }}><div><b>{mine ? `${mm}:${ss}` : '25:00'}</b><span className="muted">{mine ? 'foco' : join ? `@${friend.username} ya ha empezado` : 'cuando quieras'}</span></div></div>
      <span className="w-hint">Tus amigos ven que estás estudiando y cuánto te queda.</span>
      {mine ? <button className="pill share-send" onClick={stop}>Terminar</button> : <button className="pill pill-on share-send" onClick={start}>{join ? 'Unirme' : 'Empezar 25 min'}</button>}
    </Sheet>
  )
}

// ---------- Edificio ----------
function Building({ state }) {
  return (
    <div className="feed">
      <div className="card feed-card fp-tower">
        <Tower blocks={state.me.tower} />
        <b>{state.me.tower.length} días cerrados</b>
        <span className="w-hint">Tacha todo en Inicio y sube un bloque</span>
      </div>
      <div className="card feed-card">
        <b>Secretos</b>
        <div className="gift-grid">
          {Object.entries(SECRETS).map(([id, [name, hint]]) => state.me.unlocks.includes(id) ? (
            <div key={id} className="gift on"><Avatar avatar={{ accessory: id }} size={64} /><span>{name}</span></div>
          ) : (
            <div key={id} className="gift locked"><span className="gift-q">?</span><span className="muted">{hint}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Ajustes ----------
function Settings({ state, run }) {
  const me = state.me
  const [bday, setBday] = useState(me.birthday ? `2000-${me.birthday}` : '')
  const Toggle = ({ on, label, k }) => <button className="share-feed" onClick={() => run('settings', { [k]: !on })} aria-pressed={on}><span><b>{label}</b></span><span className={`toggle-dot ${on ? 'on' : ''}`} /></button>
  return (
    <div className="feed">
      <div className="card feed-card">
        <b>Compartir automáticamente</b>
        <Toggle on={me.shareMood} label="Cómo me siento hoy" k="shareMood" />
        <Toggle on={me.shareTower} label="Mi edificio" k="shareTower" />
        <span className="w-hint">Lo demás solo se comparte cuando tú pulsas «Compartir» en una receta, unos apuntes o una nota.</span>
      </div>
      <div className="card feed-card">
        <b>Mi cumpleaños</b>
        <input className="pill-input" type="date" value={bday} onChange={(e) => { setBday(e.target.value); run('settings', { birthday: e.target.value ? e.target.value.slice(5) : null }) }} aria-label="Mi cumpleaños" />
        <span className="w-hint">Tus amigos verán un aviso el día antes, y ese día consigues el gorro de fiesta para tu avatar.</span>
      </div>
      <div className="card feed-card">
        <b>Lo que has compartido</b>
        {state.feed.filter((p) => p.mine).map((p) => <div key={p.id} className="w-row"><span>{p.data?.name ?? p.data?.title ?? p.data?.text?.slice(0, 40)} · {p.private ? 'privado' : 'feed'}</span><button className="text-link" onClick={() => run('unpost', { id: p.id })}>Dejar de compartir</button></div>)}
        {!state.feed.some((p) => p.mine) && <span className="muted">Nada todavía</span>}
      </div>
    </div>
  )
}

/** + junto a las caras: añadir amigos por su nombre, responder peticiones y ver tus amigos. */
function AddFriendsButton() {
  const [open, setOpen] = useState(false)
  const { count } = useFriendRequests()
  return (
    <>
      <button className="mood-btn fp-add" onClick={() => setOpen(true)} aria-label="Añadir amigos">
        <span className="fp-add-ic"><Icon name="plus" size={24} />{count > 0 && <span className="notif-badge">{count}</span>}</span>
        <span>Añadir</span>
      </button>
      {open && <Sheet title="Amigos" onClose={() => setOpen(false)}><FriendsProvider><FriendsBox /></FriendsProvider></Sheet>}
    </>
  )
}
