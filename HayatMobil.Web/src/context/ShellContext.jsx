import { createContext, useContext } from 'react';
import { useAppShell } from '../hooks/useAppShell.js';

const ShellContext = createContext(null);

export function ShellProvider({ children }) {
  const value = useAppShell();
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellContext() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShellContext must be used within ShellProvider');
  return ctx;
}
