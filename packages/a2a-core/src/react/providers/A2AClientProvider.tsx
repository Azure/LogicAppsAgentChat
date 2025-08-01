import React, { createContext, useContext } from 'react';
import type { A2AClient } from '../../client/a2a-client';

interface A2AClientContextValue {
  client: A2AClient | null;
}

const A2AClientContext = createContext<A2AClientContextValue | undefined>(undefined);

export interface A2AClientProviderProps {
  client: A2AClient | null;
  children: React.ReactNode;
}

export function A2AClientProvider({ client, children }: A2AClientProviderProps) {
  return <A2AClientContext.Provider value={{ client }}>{children}</A2AClientContext.Provider>;
}

export function useA2AClient() {
  const context = useContext(A2AClientContext);
  if (!context) {
    throw new Error('useA2AClient must be used within an A2AClientProvider');
  }
  return context;
}
