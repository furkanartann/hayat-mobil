import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

/** Birleşik facade — mevcut feature bileşenleri için */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppStateProvider');
  return ctx;
}

export { useI18nContext } from './I18nContext.jsx';
export { useShellContext } from './ShellContext.jsx';
export { useAuthContext } from './AuthContext.jsx';
