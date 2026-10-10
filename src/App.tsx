import { useState } from 'react';
import type { Credentials } from './api/types';
import { ChatScreen } from './components/ChatScreen';
import { LoginScreen } from './components/LoginScreen';
import { loadCredentials, saveCredentials } from './state/storage';

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);

  const handleLogin = (next: Credentials) => {
    saveCredentials(next);
    setCredentials(next);
  };

  const handleLogout = () => {
    saveCredentials(null);
    setCredentials(null);
  };

  return credentials ? (
    <ChatScreen key={credentials.idInstance} credentials={credentials} onLogout={handleLogout} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  );
}
