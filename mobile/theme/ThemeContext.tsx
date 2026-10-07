import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId, AppearanceMode, ThemeTokens } from './tokens';
import { resolveTheme } from './themes';

interface ThemeContextValue {
  theme: ThemeTokens;
  themeId: ThemeId;
  appearanceMode: AppearanceMode;
  effectiveMode: 'light' | 'dark';
  setThemeId: (id: ThemeId) => void;
  setAppearanceMode: (mode: AppearanceMode) => void;
}

const STORAGE_KEY_THEME = '@gameapp_theme_id';
const STORAGE_KEY_APPEARANCE = '@gameapp_appearance_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeId, setThemeIdState] = useState<ThemeId>('midnightNeutral');
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore stored preferences on initial mount
  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem(STORAGE_KEY_THEME);
        const storedAppearance = await AsyncStorage.getItem(STORAGE_KEY_APPEARANCE);

        if (storedTheme) {
          setThemeIdState(storedTheme as ThemeId);
        }
        if (storedAppearance) {
          setAppearanceModeState(storedAppearance as AppearanceMode);
        }
      } catch (err) {
        console.warn('Failed to load stored theme preference:', err);
      } finally {
        setIsLoaded(true);
      }
    }

    loadStoredTheme();
  }, []);

  const setThemeId = async (newId: ThemeId) => {
    setThemeIdState(newId);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_THEME, newId);
    } catch (err) {
      console.warn('Failed to persist theme preference:', err);
    }
  };

  const setAppearanceMode = async (newMode: AppearanceMode) => {
    setAppearanceModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_APPEARANCE, newMode);
    } catch (err) {
      console.warn('Failed to persist appearance mode preference:', err);
    }
  };

  // Determine active mode (handling system preference)
  const effectiveMode: 'light' | 'dark' =
    appearanceMode === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : appearanceMode;

  const theme = resolveTheme(themeId, effectiveMode);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        appearanceMode,
        effectiveMode,
        setThemeId,
        setAppearanceMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
