import { useState } from 'react'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import { signInWithGoogle } from '../services/authService.js'

export default function LoginScreen({ onSignedIn }) {
  const [error, setError] = useState('')

  // Google nos da el "credential" (ID token). Se lo pasamos al backend para que lo verifique.
  const handleCredential = async (credential) => {
    setError('')
    try {
      onSignedIn(await signInWithGoogle(credential))
    } catch (err) {
      setError(err.reason ? `${err.message} (${err.reason})` : err.message)
    }
  }

  return (
    <main className="login">
      <img src="/logo.svg" alt="" width={120} height={120} className="login-logo rise" />
      <h1 className="hello rise" style={{ '--i': 1 }}>inblocks</h1>
      <p className="muted rise" style={{ '--i': 2 }}>Organiza tu día hablando.</p>
      <div className="rise" style={{ '--i': 3 }}><GoogleSignInButton onCredential={handleCredential} /></div>
      {error && <p className="error">{error}</p>}
    </main>
  )
}
