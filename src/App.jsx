import { useEffect, useState } from 'react'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import SectionScreen from './screens/SectionScreen.jsx'
import AppHeader from './components/AppHeader.jsx'
import { SECTIONS } from './data/sections.js'
import { getCurrentUser, signOut } from './services/authService.js'

const emptyEntries = () => Object.fromEntries(SECTIONS.map((s) => [s.id, []]))

/**
 *   user === undefined -> cargando · null -> Login · objeto -> app
 *   openSection === null -> Home · 'gym' | 'class' | ... -> pantalla de esa sección
 */
export default function App() {
  const [user, setUser] = useState(undefined)
  const [openSection, setOpenSection] = useState(null)
  const [entries, setEntries] = useState(emptyEntries) // TODO: guardar en backend (D1/KV)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null))
  }, [])

  // Aplica las acciones que decide el asistente: [{ section, title }]
  const applyActions = (actions) => {
    setEntries((prev) => {
      const next = { ...prev }
      for (const a of actions) {
        if (!next[a.section]) continue // sección desconocida: la ignoramos
        next[a.section] = [{ id: crypto.randomUUID(), title: a.title, createdAt: Date.now() }, ...next[a.section]]
      }
      return next
    })
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setOpenSection(null)
    setEntries(emptyEntries())
  }

  if (user === undefined) return <main className="wf-screen wf-center">Loading…</main>
  if (user === null) return <LoginScreen onSignedIn={setUser} />

  return (
    <main className="wf-screen">
      <AppHeader user={user} onSignOut={handleSignOut} />
      {openSection === null ? (
        <HomeScreen entries={entries} onActions={applyActions} onOpenSection={setOpenSection} />
      ) : (
        <SectionScreen sectionId={openSection} entries={entries[openSection]} onBack={() => setOpenSection(null)} />
      )}
    </main>
  )
}
