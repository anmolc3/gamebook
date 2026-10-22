import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  loginWithGoogle: (idToken: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  register: (email: string, username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (options?: { password?: string; googleToken?: string; reason?: string; confirm?: boolean }) => Promise<void>;
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

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const data = await MobileAuthService.googleSignIn(idToken);
      setUser(data.user);
      setToken(data.token);
      await MobileAuthService.setStoredToken(data.token);
      NotificationService.initialize().catch(() => null);
      MobileSocketService.connect();
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await MobileAuthService.promptGoogleOAuth();
      if (!result) {
        return false;
      }
      setUser(result.user);
      setToken(result.token);
      NotificationService.initialize().catch(() => null);
      MobileSocketService.connect();
      return true;
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

  const deleteAccount = async (options?: { password?: string; googleToken?: string; reason?: string; confirm?: boolean }) => {
    setIsLoading(true);
    const currentUserId = user?.id;
    try {
      await MobileAuthService.deleteAccount({
        password: options?.password,
        googleToken: options?.googleToken,
        confirm: options?.confirm !== undefined ? options.confirm : true,
        reason: options?.reason,
      });

      // Disconnect socket and unregister push token
      MobileSocketService.disconnect();
      await NotificationService.unregister().catch(() => null);
      await MobileAuthService.clearStoredToken();

      // Clear account-specific cache keys from local storage
      if (currentUserId) {
        await AsyncStorage.multiRemove([
          `@gameapp:profile_banner_${currentUserId}`,
          `@gameapp:profile_avatar_${currentUserId}`,
          '@gameapp_auth_user',
          '@gameapp:archived_convs',
          '@gameapp:favorite_convs',
          '@gameapp:locked_convs',
        ]).catch(() => null);
      }

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
        loginWithGoogle,
        signInWithGoogle,
        register,
        logout,
        deleteAccount,
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
