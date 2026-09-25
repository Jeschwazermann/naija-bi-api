import { SessionProvider, useSession } from './hooks/useSession';
import { TopBar } from './components/TopBar';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';

function Shell() {
  const { session } = useSession();
  return (
    <>
      <TopBar />
      <main id="app">{session ? <DashboardView /> : <AuthView />}</main>
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
