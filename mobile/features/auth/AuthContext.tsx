import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileAuthService, AuthUserData } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MobileSocketService } from '../../services/socket.service';

import { CacheService } from '../../services/cache.service';

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

  // Restore stored session on launch - zero blocking delay with cached user
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          MobileAuthService.getStoredToken(),
          MobileAuthService.getStoredUser(),
        ]);

        if (storedToken && storedUser) {
          // 1. Immediately activate cached session - no waiting on network!
          if (isMounted) {
            setUser(storedUser);
            setToken(storedToken);
            setIsLoading(false);
          }

          // Preload essential non-sensitive caches into memory cache for 0ms screen loads
          CacheService.preload([
            '@gameapp:cache:conversations',
            '@gameapp:cache:friends',
            '@gameapp:cache:requests',
            '@gameapp:cache:suggested',
            '@gameapp:cache:stories',
            '@gameapp:cache:notifications',
          ]).catch(() => null);

          // 2. Initialize push notifications and socket asynchronously
          NotificationService.initialize().catch(() => null);
          MobileSocketService.connect();

          // 3. Revalidate session with backend in background
          MobileAuthService.getMe(storedToken)
            .then((freshProfile) => {
              if (isMounted && freshProfile) {
                setUser(freshProfile);
                MobileAuthService.setStoredUser(freshProfile).catch(() => null);
              }
            })
            .catch(async (err: any) => {
              // Only invalidate if the server explicitly rejected the token (401/403/invalid)
              const msg = (err?.message || '').toLowerCase();
              if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('jwt')) {
                console.warn('Session expired or revoked, clearing credentials');
                await MobileAuthService.clearStoredToken();
                await MobileAuthService.clearStoredUser();
                await CacheService.clearAllUserScopedData(storedUser.id);
                if (isMounted) {
                  setUser(null);
                  setToken(null);
                }
              } else {
                // Network error / offline - keep using cached session!
                console.log('Background auth revalidation skipped due to network status');
              }
            });
        } else if (storedToken) {
          // Token exists but user cache not yet created (e.g. legacy installation)
          try {
            const profile = await MobileAuthService.getMe(storedToken);
            if (isMounted) {
              setUser(profile);
              setToken(storedToken);
              await MobileAuthService.setStoredUser(profile);
              NotificationService.initialize().catch(() => null);
              MobileSocketService.connect();
            }
          } catch (err) {
            console.warn('Failed to verify token on startup');
            await MobileAuthService.clearStoredToken();
          } finally {
            if (isMounted) setIsLoading(false);
          }
        } else {
          // Unauthenticated user
          if (isMounted) setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error during session restoration:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await MobileAuthService.login({ usernameOrEmail, password });
      setUser(data.user);
      setToken(data.token);
      await Promise.all([
        MobileAuthService.setStoredToken(data.token),
        MobileAuthService.setStoredUser(data.user),
      ]);
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
      await Promise.all([
        MobileAuthService.setStoredToken(data.token),
        MobileAuthService.setStoredUser(data.user),
      ]);
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
      await Promise.all([
        MobileAuthService.setStoredToken(result.token),
        MobileAuthService.setStoredUser(result.user),
      ]);
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
      await Promise.all([
        MobileAuthService.setStoredToken(data.token),
        MobileAuthService.setStoredUser(data.user),
      ]);
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
    const previousUserId = user?.id;
    try {
      // Disconnect socket and unregister push token
      MobileSocketService.disconnect();
      await NotificationService.unregister().catch(() => null);
      await MobileAuthService.clearStoredToken();
      await MobileAuthService.clearStoredUser();
      
      // Clear all cached private user data to prevent cross-account leakage
      await CacheService.clearAllUserScopedData(previousUserId);

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
      await MobileAuthService.clearStoredUser();

      // Clear all account-specific cache keys
      await CacheService.clearAllUserScopedData(currentUserId);

      setUser(null);
      setToken(null);
      setIsNewlyRegistered(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: Partial<AuthUserData>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      MobileAuthService.setStoredUser(merged).catch(() => null);
      return merged;
    });
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
