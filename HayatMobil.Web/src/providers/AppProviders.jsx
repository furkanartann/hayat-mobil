import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../api/queryClient.js';
import { I18nProvider } from '../context/I18nContext.jsx';
import { ShellProvider } from '../context/ShellContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { AppStateProvider } from './AppStateProvider.jsx';

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ShellProvider>
          <AuthProvider>
            <AppStateProvider>
              {children}
            </AppStateProvider>
          </AuthProvider>
        </ShellProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
