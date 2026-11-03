export default function AppHeader({ user, onSignOut }) {
  return (
    <header className="wf-box wf-header wf-header-row">
      <span>[ Logo ]</span>
      <span className="wf-user">
        {user.picture && <img src={user.picture} alt="" className="wf-avatar" referrerPolicy="no-referrer" />}
        {user.name}
        <button className="wf-link" onClick={onSignOut}>Sign out</button>
      </span>
    </header>
  )
}
