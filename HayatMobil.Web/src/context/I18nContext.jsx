import { createContext, useContext } from 'react';
import { useI18n } from '../hooks/useI18n.js';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const value = useI18n();
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18nContext must be used within I18nProvider');
  return ctx;
}
