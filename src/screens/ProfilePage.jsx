import { useState } from 'react'
import { FriendsProvider, UsernameBox } from '../components/Friends.jsx'
import AreasSettings from './AreasSettings.jsx'
import AvatarEditor from './AvatarEditor.jsx'

const TABS = [['avatar', 'Avatar'], ['ajustes', 'Ajustes']]

/** Perfil en dos pantallas (como en Google): se abre en el avatar y arriba cambias a Ajustes. */
export default function ProfilePage({ avatar, onSaveAvatar, settings, onSaveSettings, onSignOut }) {
  const [tab, setTab] = useState('avatar')
  return (
    <div className="profile-page">
      <div className="tabs profile-tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'avatar' ? (
        <div className="profile-avatar" key="avatar">
          <FriendsProvider><UsernameBox /></FriendsProvider>
          <AvatarEditor avatar={avatar} onSave={onSaveAvatar} withFriends={false} />
        </div>
      ) : (
        <div className="profile-settings" key="ajustes">
          <AreasSettings settings={settings} onSave={onSaveSettings} />
          {onSignOut && <button className="btn-secondary avatar-signout" onClick={onSignOut}>Cerrar sesión</button>}
        </div>
      )}
    </div>
  )
}
