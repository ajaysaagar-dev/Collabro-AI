import { createContext, useContext, useState, useEffect } from 'react';

interface Session {
  id: string;
  email: string;
  token: string;
}

interface SessionContextValue {
  session: Session | null;
  handleLogin: (email: string, token: string) => Promise<void>;
  handleLogout: () => Promise<void>;
}

const SessionProvider = createContext<SessionContextValue | null>(null);

interface SessionProviderContextProps {
  children: React.ReactNode;
}

const SessionProviderContext = ({ children }: SessionProviderContextProps) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('session');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  useEffect(() => {
    if (session) {
      // Handle session updates
    }
  }, [session]);

  const handleLogin = async (email: string, token: string) => {
    // Implement login logic
  };

  const handleLogout = async () => {
    // Implement logout logic
  };

  return (
    <SessionProvider.Provider value={{ session, handleLogin, handleLogout }}>
      {children}
    </SessionProvider.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionProvider);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionProviderContext;