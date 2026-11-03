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
    <main className="wf-screen wf-center">
      <div className="wf-box wf-header">[ Logo / App name ]</div>
      <h1>Welcome</h1>
      <p className="wf-placeholder">[ Short pitch: organize your school material with AI ]</p>
      <GoogleSignInButton onCredential={handleCredential} />
      {error && <p className="wf-error">{error}</p>}
    </main>
  )
}
