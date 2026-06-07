import { createContext, useContext } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { useI18nContext } from './I18nContext.jsx';
import { useShellContext } from './ShellContext.jsx';
import { useInvalidateAppData } from '../features/shared/hooks/appDataQuery.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const i18n = useI18nContext();
  const shell = useShellContext();
  const invalidateAppData = useInvalidateAppData();

  const value = useAuth({
    t: i18n.t,
    networkErrorMsg: i18n.networkErrorMsg,
    readApiError: i18n.readApiError,
    toast: shell.toast,
    activeTab: shell.activeTab,
    setActiveTab: shell.setActiveTab,
    invalidateAppData,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
