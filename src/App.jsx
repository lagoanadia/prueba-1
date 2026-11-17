import { syncAllFiles } from './lib/fileStore.js'
import UndoToast from './components/UndoToast.jsx'
import { useEffect, useState } from 'react'
import LoginScreen from './screens/LoginScreen.jsx'
import DesktopApp from './screens/DesktopApp.jsx'
import MobileApp from './screens/MobileApp.jsx'
import VoiceOverlay from './components/VoiceOverlay.jsx'
import useEntries from './hooks/useEntries.js'
import useMediaQuery from './hooks/useMediaQuery.js'
import useVoiceAssistant from './hooks/useVoiceAssistant.js'
import useAgenda from './hooks/useAgenda.js'
import { getCurrentUser, signOut } from './services/authService.js'
import { getProfile, saveAvatar, saveSettings } from './services/profileService.js'
import { DEFAULT_AVATAR } from './data/avatar.js'
import { DEFAULT_SETTINGS } from './data/settings.js'
import { getLang, syncLang } from './i18n/index.js'

/**
 *   user === undefined -> cargando · null -> Login · objeto -> app
 *   Portátil (≥ 900px) y móvil comparten datos y asistente; solo cambia la vista.
 */
export default function App() {
  const [user, setUser] = useState(undefined)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const { entries, add, toggle, error } = useEntries(Boolean(user))
  const assistant = useVoiceAssistant(add)
  const agenda = useAgenda(Boolean(user), entries, toggle)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null))
  }, [])

  useEffect(() => {
    if (user) syncAllFiles() // sube los archivos que solo estaban en este navegador, para verlos desde otros ordenadores
    if (user) getProfile().then((p) => { setAvatar(p.avatar); if (p.settings) { setSettings(p.settings); if (p.settings.lang && p.settings.lang !== getLang()) syncLang(p.settings.lang) } }).catch(() => {})
  }, [user])

  const handleSaveAvatar = async (next) => setAvatar((await saveAvatar(next)).avatar)

  // Se aplica al momento y se guarda en segundo plano
  const handleSaveSettings = (next) => {
    setSettings(next)
    return saveSettings(next).catch(() => {}) // devuelve la promesa: el cambio de idioma espera a guardarse antes de recargar
  }

  // Abrir el asistente empieza a escuchar directamente (menos toques).
  const openVoice = () => {
    setVoiceOpen(true)
    assistant.start()
  }
  const closeVoice = () => {
    assistant.reset()
    setVoiceOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  if (user === undefined) return <main className="loading"><span className="spinner" aria-label="Cargando" /></main>
  if (user === null) return <LoginScreen onSignedIn={setUser} />

  const firstName = user.name?.split(' ')[0] ?? ''
  const props = {
    firstName,
    user,
    today: agenda.items,
    entries,
    toggleEntry: toggle,
    onHome: agenda.reload, // al volver a Inicio, recargamos lo de hoy por si cambió algo en las áreas
    onTalk: openVoice,
    onSignOut: handleSignOut,
    avatar,
    onSaveAvatar: handleSaveAvatar,
    settings,
    onSaveSettings: handleSaveSettings,
  }

  return (
    <div className={settings.bigText ? 'big-text' : undefined}>
      {isDesktop ? <DesktopApp {...props} /> : <MobileApp {...props} />}
      <UndoToast />
      <VoiceOverlay open={voiceOpen} onClose={closeVoice} firstName={firstName} assistant={assistant} modal={isDesktop} />
      {error && <p className="toast" role="alert">{error}</p>}
    </div>
  )
}
