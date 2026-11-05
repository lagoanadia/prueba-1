import { useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { AVATAR_OPTIONS } from '../data/avatar.js'

// Pestañas del editor (como Duolingo, pero menos). Cada una agrupa una o dos opciones.
const TABS = [
  { id: 'cara', label: 'Cara', keys: ['skin', 'eyes'] },
  { id: 'pelo', label: 'Pelo', keys: ['hair', 'hairColor'] },
  { id: 'gafas', label: 'Gafas', keys: ['glasses'] },
  { id: 'ropa', label: 'Ropa', keys: ['outfit'] },
  { id: 'fondo', label: 'Fondo', keys: ['bg'] },
]
// Opciones que son solo un color -> círculos de color. El resto -> miniaturas del avatar.
const SWATCH_KEYS = ['skin', 'hairColor', 'bg']

/** Editor de avatar: vista previa grande arriba, pestañas y opciones. Guarda al pulsar «Hecho». */
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
      <div className="avatar-stage">
        <div className="avatar-pop" key={JSON.stringify(draft)}><Avatar avatar={draft} size={180} /></div>
        <button className="pill pill-on" onClick={save} disabled={!changed || saving}>{saving ? 'Guardando…' : 'Hecho'}</button>
      </div>

      <div className="seg avatar-tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {current.keys.map((key) => (
        <div key={key} className={SWATCH_KEYS.includes(key) ? 'swatches' : 'thumbs'}>
          {AVATAR_OPTIONS[key].map((opt) => {
            const on = draft[key] === opt.id
            return SWATCH_KEYS.includes(key) ? (
              <button key={opt.id} className={`swatch ${on ? 'on' : ''}`} style={{ background: opt.color }} onClick={() => pick(key, opt)} aria-label={opt.id} aria-pressed={on} />
            ) : (
              <button key={opt.id} className={`thumb ${on ? 'on' : ''} ${opt.locked ? 'locked' : ''}`} onClick={() => pick(key, opt)} aria-pressed={on} title={opt.locked ? opt.unlock : opt.label}>
                <Avatar avatar={{ ...draft, [key]: opt.id }} size={72} round={false} />
                <span>{opt.label}</span>
                {opt.locked && <span className="lock" aria-label="Bloqueado"><Icon name="lock" size={16} /></span>}
              </button>
            )
          })}
        </div>
      ))}
      {hint && <p className="w-hint avatar-hint"><Icon name="lock" size={14} color="#5F6368" /> {hint}</p>}
      {onSignOut && <button className="btn-secondary avatar-signout" onClick={onSignOut}>Cerrar sesión</button>}
    </div>
  )
}
