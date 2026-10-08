import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MobileAuthService, AuthUserData } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MobileSocketService } from '../../services/socket.service';

interface AuthContextType {
  user: AuthUserData | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewlyRegistered: boolean;
  dismissNewRegistration: () => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<AuthUserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewlyRegistered, setIsNewlyRegistered] = useState(false);

  // Restore stored session on launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await MobileAuthService.getStoredToken();
        if (storedToken) {
          const profile = await MobileAuthService.getMe(storedToken);
          setUser(profile);
          setToken(storedToken);
          // Re-register push token on session restore (token may have refreshed)
          NotificationService.initialize().catch(() => null);
          MobileSocketService.connect();
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing stored token');
        await MobileAuthService.clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await MobileAuthService.login({ usernameOrEmail, password });
      setUser(data.user);
      setToken(data.token);
      await MobileAuthService.setStoredToken(data.token);
      // Register push token after successful login
      NotificationService.initialize().catch(() => null);
      MobileSocketService.connect();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      const data = await MobileAuthService.register({ email, username, password, displayName });
      setUser(data.user);
      setToken(data.token);
      setIsNewlyRegistered(true);
      await MobileAuthService.setStoredToken(data.token);
      // Register push token for new accounts
      NotificationService.initialize().catch(() => null);
      MobileSocketService.connect();
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNewRegistration = () => {
    setIsNewlyRegistered(false);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Disconnect socket and unregister push token
      MobileSocketService.disconnect();
      await NotificationService.unregister().catch(() => null);
      await MobileAuthService.clearStoredToken();
      setUser(null);
      setToken(null);
      setIsNewlyRegistered(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: Partial<AuthUserData>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        isNewlyRegistered,
        dismissNewRegistration,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
