import { useEffect, useState } from 'react'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import AssistantScreen from './screens/AssistantScreen.jsx'
import AppHeader from './components/AppHeader.jsx'
import { getCurrentUser, signOut } from './services/authService.js'

/**
 * App decide qué pantalla se ve. Sin router: con 3 pantallas, un estado basta.
 *
 *   user === undefined -> aún preguntando al backend si hay sesión ("loading")
 *   user === null      -> no hay sesión          -> LoginScreen
 *   user === {...}     -> sesión iniciada        -> Home o Assistant
 */
export default function App() {
  const [user, setUser] = useState(undefined)
  const [screen, setScreen] = useState('home') // 'home' | 'assistant'
  const [material, setMaterial] = useState(null)

  // Al arrancar: ¿ya hay cookie de sesión de otra visita?
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setScreen('home')
    setMaterial(null)
  }

  const openAssistant = (newMaterial) => {
    setMaterial(newMaterial)
    setScreen('assistant')
  }

  if (user === undefined) return <main className="wf-screen wf-center">Loading…</main>
  if (user === null) return <LoginScreen onSignedIn={setUser} />

  return (
    <main className="wf-screen">
      <AppHeader user={user} onSignOut={handleSignOut} />
      {screen === 'home' && <HomeScreen onMaterialReady={openAssistant} onOpenAssistant={() => openAssistant(null)} />}
      {screen === 'assistant' && <AssistantScreen material={material} onBack={() => setScreen('home')} />}
    </main>
  )
}
