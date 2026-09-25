import { useSession } from '../hooks/useSession';

export function TopBar() {
  const { session, logout } = useSession();

  return (
    <header className="topbar">
      <div className="wordmark">Ledger</div>
      {session && (
        <div className="topbar-right">
          <span className="business-name">{session.businessName}</span>
          <button className="btn-ghost" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
