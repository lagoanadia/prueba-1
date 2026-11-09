import { useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import Friends from '../components/Friends.jsx'
import { AVATAR_OPTIONS, randomAvatar } from '../data/avatar.js'

// Pestañas del editor. Cada una agrupa varias opciones.
const TABS = [
  { id: 'cara', label: 'Cara', keys: ['skin', 'eyes', 'brows', 'mouth'] },
  { id: 'pelo', label: 'Pelo', keys: ['hair', 'hairColor', 'facialHair'] },
  { id: 'gafas', label: 'Gafas', keys: ['glasses'] },
  { id: 'extras', label: 'Extras', keys: ['accessory'] },
  { id: 'ropa', label: 'Ropa', keys: ['outfit', 'outfitColor'] },
  { id: 'fondo', label: 'Fondo', keys: ['bg'] },
]
// Opciones que son solo un color -> círculos. El resto -> miniaturas con zoom a la parte que cambia.
// Títulos de cada grupo en la pestaña Cara
const GROUP_LABELS = { skin: 'Piel', eyes: 'Ojos', brows: 'Cejas', mouth: 'Boca' }
const SWATCH_KEYS = ['skin', 'hairColor', 'outfitColor', 'bg']
const ZOOM = {
  eyes: '66 72 60 46', brows: '66 68 60 46', mouth: '72 90 50 36', glasses: '62 74 80 46',
  hair: '24 14 152 152', facialHair: '56 80 90 70', accessory: '24 14 152 152', outfit: '24 120 152 80',
}

/** Editor de avatar: escenario arriba, pestañas y opciones. Guarda al pulsar «Hecho». */
export default function AvatarEditor({ avatar, onSave, onSignOut, withFriends = true }) {
  const [draft, setDraft] = useState(avatar)
  const [tab, setTab] = useState('cara')
  const [saving, setSaving] = useState(false)
  const changed = JSON.stringify(draft) !== JSON.stringify(avatar)
  const current = TABS.find((t) => t.id === tab)

  const pick = (key, opt) => setDraft({ ...draft, [key]: opt.id })
  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false) }
  }

  return (
    <div className="avatar-editor">
      <div className="avatar-stage" style={{ '--stage': AVATAR_OPTIONS.bg.find((b) => b.id === draft.bg)?.color }}>
        <div className="avatar-pop" key={JSON.stringify(draft)}><Avatar avatar={draft} size={180} /></div>
        <div className="avatar-actions">
          <button className="icon-btn dice" onClick={() => setDraft(randomAvatar())} aria-label="Avatar aleatorio" title="Aleatorio">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4.5C9.5 4 14.5 4 19 4.5C19.6 9.5 19.6 14.5 19 19.5C14.5 20 9.5 20 5 19.5C4.4 14.5 4.4 9.5 5 4.5Z" /><circle cx="9" cy="9" r="1" fill="#202124" /><circle cx="15" cy="15" r="1" fill="#202124" /><circle cx="15" cy="9" r="1" fill="#202124" /><circle cx="9" cy="15" r="1" fill="#202124" /></svg>
          </button>
          <button className="pill pill-on" onClick={save} disabled={!changed || saving}>{saving ? 'Guardando…' : 'Hecho'}</button>
        </div>
      </div>

      <div className="avatar-tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      <div className="avatar-options" key={tab}>
        {current.keys.map((key) => (
          <section key={key} className={`opt-group ${tab === 'cara' ? 'opt-compact' : ''}`}>
          {tab === 'cara' && <h4 className="opt-label">{GROUP_LABELS[key]}</h4>}
          <div className={SWATCH_KEYS.includes(key) ? 'swatches' : 'thumbs'}>
            {AVATAR_OPTIONS[key].map((opt, i) => {
              const on = draft[key] === opt.id
              return SWATCH_KEYS.includes(key) ? (
                <button key={opt.id} className={`swatch ${on ? 'on' : ''}`} style={{ background: opt.color, '--i': i }} onClick={() => pick(key, opt)} aria-label={opt.id} aria-pressed={on} />
              ) : (
                <button key={opt.id} className={`thumb ${on ? 'on' : ''}`} style={{ '--i': i }} onClick={() => pick(key, opt)}
                  aria-pressed={on} aria-label={opt.label} title={opt.label}>
                  <Avatar avatar={{ ...draft, [key]: opt.id }} size={64} round={false} viewBox={ZOOM[key]} />
                </button>
              )
            })}
          </div>
          </section>
        ))}
      </div>
      {withFriends && <Friends />}
      {onSignOut && <button className="btn-secondary avatar-signout" onClick={onSignOut}>Cerrar sesión</button>}
    </div>
  )
}
