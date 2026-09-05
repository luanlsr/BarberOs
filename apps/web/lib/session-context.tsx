'use client';

import { createContext, useContext } from 'react';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';

export { developmentSession };
const SessionContextProvider = createContext<SessionContext | null>(null);

export function SessionProvider({
  children,
  session,
}: Readonly<{ children: React.ReactNode; session?: SessionContext | null }>) {
  const value = session === undefined ? developmentSession : session;
  return (
    <SessionContextProvider.Provider value={value}>{children}</SessionContextProvider.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContextProvider);
}
