import { useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
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
const SWATCH_KEYS = ['skin', 'hairColor', 'outfitColor', 'bg']
const ZOOM = {
  eyes: '60 66 80 60', brows: '60 60 80 60', mouth: '66 84 68 50', glasses: '50 66 100 60',
  hair: '20 10 160 160', facialHair: '50 80 100 80', accessory: '10 10 180 180', outfit: '20 120 160 80',
}

/** Editor de avatar: escenario arriba, pestañas y opciones. Guarda al pulsar «Hecho». */
export default function AvatarEditor({ avatar, onSave, onSignOut }) {
  const [draft, setDraft] = useState(avatar)
  const [tab, setTab] = useState('cara')
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState('')
  const changed = JSON.stringify(draft) !== JSON.stringify(avatar)
  const current = TABS.find((t) => t.id === tab)

  const pick = (key, opt) => {
    if (opt.locked) return setHint(`${opt.label}: ${opt.unlock}`)
    setHint('')
    setDraft({ ...draft, [key]: opt.id })
  }
  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false) }
  }

  return (
    <div className="avatar-editor">
      <div className="avatar-stage" style={{ '--stage': AVATAR_OPTIONS.bg.find((b) => b.id === draft.bg)?.color }}>
        <div className="avatar-pop" key={JSON.stringify(draft)}><Avatar avatar={draft} size={190} round={false} /></div>
        <div className="avatar-actions">
          <button className="icon-btn dice" onClick={() => setDraft(randomAvatar())} aria-label="Avatar aleatorio" title="Aleatorio">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4.5C9.5 4 14.5 4 19 4.5C19.6 9.5 19.6 14.5 19 19.5C14.5 20 9.5 20 5 19.5C4.4 14.5 4.4 9.5 5 4.5Z" /><circle cx="9" cy="9" r="1" fill="#202124" /><circle cx="15" cy="15" r="1" fill="#202124" /><circle cx="15" cy="9" r="1" fill="#202124" /><circle cx="9" cy="15" r="1" fill="#202124" /></svg>
          </button>
          <button className="pill pill-on" onClick={save} disabled={!changed || saving}>{saving ? 'Guardando…' : 'Hecho'}</button>
        </div>
      </div>

      <div className="avatar-tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); setHint('') }}>{t.label}</button>)}
      </div>

      <div className="avatar-options" key={tab}>
        {current.keys.map((key) => (
          <div key={key} className={SWATCH_KEYS.includes(key) ? 'swatches' : 'thumbs'}>
            {AVATAR_OPTIONS[key].map((opt, i) => {
              const on = draft[key] === opt.id
              return SWATCH_KEYS.includes(key) ? (
                <button key={opt.id} className={`swatch ${on ? 'on' : ''}`} style={{ background: opt.color, '--i': i }} onClick={() => pick(key, opt)} aria-label={opt.id} aria-pressed={on} />
              ) : (
                <button key={opt.id} className={`thumb ${on ? 'on' : ''} ${opt.locked ? 'locked' : ''}`} style={{ '--i': i }} onClick={() => pick(key, opt)}
                  aria-pressed={on} aria-label={opt.label} title={opt.locked ? opt.unlock : opt.label}>
                  <Avatar avatar={{ ...draft, [key]: opt.id }} size={64} round={false} viewBox={ZOOM[key]} />
                  {opt.locked && <span className="lock" aria-hidden="true"><Icon name="lock" size={14} /></span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {hint && <p className="w-hint avatar-hint"><Icon name="lock" size={14} color="#5F6368" /> {hint}</p>}
      {onSignOut && <button className="btn-secondary avatar-signout" onClick={onSignOut}>Cerrar sesión</button>}
    </div>
  )
}
