import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AUTH_API,
  clearSession,
  onSessionExpired,
  readSession,
  writeSession,
} from '../api/client';
import type { AuthResponse, Session } from '../api/types';

interface SessionContextValue {
  session: Session | null;
  login(data: AuthResponse): void;
  logout(): void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// ✅ Best Practice: one provider owns the session's React state; api/client
// owns the actual storage. Components read/act through this hook only.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => onSessionExpired(() => setSession(null)), []);

  const login = useCallback((data: AuthResponse) => {
    const next: Session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      businessName: data.businessName,
    };
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    const current = readSession();
    clearSession();
    setSession(null);
    if (current?.refreshToken) {
      // best-effort — the person is logged out client-side regardless
      fetch(`${AUTH_API}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).catch(() => {});
    }
  }, []);

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
