import { useEffect } from 'react'
import Avatar from './Avatar.jsx'

/** Aviso que entra desde arriba cuando alguien te manda una petición de amistad. «Ver» abre el perfil. */
export default function FriendToast({ toast, onOpen, onClose }) {
  useEffect(() => { if (!toast) return; const id = setTimeout(onClose, 8000); return () => clearTimeout(id) }, [toast, onClose])
  if (!toast) return null
  const open = () => {
    // Al primer «Ver» pedimos permiso para avisar también con la app cerrada o en segundo plano
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
    onOpen()
    onClose()
  }
  return (
    <div className="toast" role="status" aria-live="polite">
      <Avatar avatar={toast.avatar} size={40} />
      <span><b>@{toast.username}</b> quiere ser tu amigo</span>
      <button className="pill pill-on" onClick={open}>Ver</button>
      <button className="toast-x" onClick={onClose} aria-label="Cerrar">×</button>
    </div>
  )
}
