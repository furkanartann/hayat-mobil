import React from 'react';
import { useApp } from './context/AppContext.jsx';
import { AppProviders } from './providers/AppProviders.jsx';
import AuthScreen from './features/auth/AuthScreen.jsx';
import AuthenticatedApp from './features/shell/AuthenticatedApp.jsx';

function AppRoutes() {
  const app = useApp();
  return !app.user ? <AuthScreen /> : <AuthenticatedApp />;
}

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
