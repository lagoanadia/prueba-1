import { useEffect, useState } from 'react'
import LoginScreen from './screens/LoginScreen.jsx'
import DesktopApp from './screens/DesktopApp.jsx'
import MobileApp from './screens/MobileApp.jsx'
import VoiceOverlay from './components/VoiceOverlay.jsx'
import useEntries from './hooks/useEntries.js'
import useMediaQuery from './hooks/useMediaQuery.js'
import useVoiceAssistant from './hooks/useVoiceAssistant.js'
import { getCurrentUser, signOut } from './services/authService.js'
import { todayISO } from './lib/dates.js'

/**
 *   user === undefined -> cargando · null -> Login · objeto -> app
 *   Portátil (≥ 900px) y móvil comparten datos y asistente; solo cambia la vista.
 */
export default function App() {
  const [user, setUser] = useState(undefined)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const { entries, add, toggle, error } = useEntries(Boolean(user))
  const assistant = useVoiceAssistant(add)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null))
  }, [])

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
  const today = todayISO()
  const props = {
    firstName,
    user,
    today: entries.filter((e) => e.date === today),
    onToggle: toggle,
    onTalk: openVoice,
    onSignOut: handleSignOut,
  }

  return (
    <>
      {isDesktop ? <DesktopApp {...props} /> : <MobileApp {...props} />}
      <VoiceOverlay open={voiceOpen} onClose={closeVoice} firstName={firstName} assistant={assistant} modal={isDesktop} />
      {error && <p className="toast" role="alert">{error}</p>}
    </>
  )
}
