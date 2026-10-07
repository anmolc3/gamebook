import { ThemeId, ThemeTokens } from '../tokens';
import { coralMarbleLight, coralMarbleDark } from './coralMarble';
import { moonVioletLight, moonVioletDark } from './moonViolet';
import { violetDuskLight, violetDuskDark } from './violetDusk';
import { midnightNeutralLight, midnightNeutralDark } from './midnightNeutral';
import { forestGoldLight, forestGoldDark } from './forestGold';

export const THEME_REGISTRY: Record<ThemeId, { light: ThemeTokens; dark: ThemeTokens }> = {
  midnightNeutral: {
    light: midnightNeutralLight,
    dark: midnightNeutralDark,
  },
  coralMarble: {
    light: coralMarbleLight,
    dark: coralMarbleDark,
  },
  forestGold: {
    light: forestGoldLight,
    dark: forestGoldDark,
  },
  moonViolet: {
    light: moonVioletLight,
    dark: moonVioletDark,
  },
  violetDusk: {
    light: violetDuskLight,
    dark: violetDuskDark,
  },
};

export const THEME_METADATA: { id: ThemeId; name: string; previewColor: string; accentColor: string }[] = [
  { id: 'midnightNeutral', name: 'Marvie Slate / Mint', previewColor: '#3ED598', accentColor: '#FFC542' },
  { id: 'coralMarble', name: 'Marble / Coral', previewColor: '#FF575F', accentColor: '#3ED598' },
  { id: 'forestGold', name: 'Forest / Gold', previewColor: '#25C685', accentColor: '#FFC542' },
  { id: 'moonViolet', name: 'Moon / Violet', previewColor: '#755FE2', accentColor: '#3ED598' },
  { id: 'violetDusk', name: 'Violet Dusk', previewColor: '#935073', accentColor: '#FF974A' },
];

export function resolveTheme(themeId: ThemeId, mode: 'light' | 'dark'): ThemeTokens {
  const themeFamily = THEME_REGISTRY[themeId] || THEME_REGISTRY.midnightNeutral;
  return mode === 'dark' ? themeFamily.dark : themeFamily.light;
}
