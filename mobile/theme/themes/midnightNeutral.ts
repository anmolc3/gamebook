import { ColorTokens, ShadowTokens, ThemeTokens, SPACING, RADIUS, createTypographyTokens } from '../tokens';

const lightColors: ColorTokens = {
  background: '#EDF1FA',
  backgroundSecondary: '#E4E9F3',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F7FD',
  surfacePressed: '#E8EEF8',

  textPrimary: '#1A3B34',
  textSecondary: '#899A96',
  textMuted: '#A4B5B1',
  textDisabled: '#CBD7D3',
  textOnPrimary: '#FFFFFF',

  border: '#E4E9F3',
  borderFocus: '#3ED598',
  divider: '#EDF1FA',

  primary: '#3ED598',
  primaryLight: '#68E2B2',
  primaryDark: '#25C685',

  secondary: '#FFC542',
  accent: '#FF974A',

  accentMint: '#3ED598',
  accentAmber: '#FFC542',
  accentOrange: '#FF974A',
  accentCoral: '#FF575F',
  accentBlue: '#0062FF',
  accentPurple: '#755FE2',

  cardTintMint: '#D4F5E9',
  cardTintCoral: '#FFE5E7',
  cardTintAmber: '#FEF3D9',
  cardTintOrange: '#FFEFE3',
  cardTintBlue: '#E3EEFF',
  cardTintPurple: '#EDEAFD',

  success: '#3ED598',
  warning: '#FFC542',
  error: '#FF575F',
  info: '#0062FF',

  online: '#3ED598',
  inGame: '#755FE2',
  away: '#FFC542',
  offline: '#899A96',

  backdrop: 'rgba(26, 59, 52, 0.45)',
};

const darkColors: ColorTokens = {
  // Pure / Deep Obsidian Black Foundation
  background: '#0B0D12',
  backgroundSecondary: '#111319',
  surface: '#171A22',
  surfaceElevated: '#1F232E',
  surfacePressed: '#272B38',

  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textOnPrimary: '#0B0D12',

  border: '#222632',
  borderFocus: '#3ED598',
  divider: '#1A1D27',

  primary: '#3ED598',
  primaryLight: '#68E2B2',
  primaryDark: '#25C685',

  secondary: '#FFC542',
  accent: '#FF974A',

  accentMint: '#3ED598',
  accentAmber: '#FFC542',
  accentOrange: '#FF974A',
  accentCoral: '#FF575F',
  accentBlue: '#0062FF',
  accentPurple: '#755FE2',

  cardTintMint: '#132C23',
  cardTintCoral: '#35181E',
  cardTintAmber: '#332714',
  cardTintOrange: '#332014',
  cardTintBlue: '#13213C',
  cardTintPurple: '#221639',

  success: '#3ED598',
  warning: '#FFC542',
  error: '#FF575F',
  info: '#0062FF',

  online: '#3ED598',
  inGame: '#755FE2',
  away: '#FFC542',
  offline: '#64748B',

  backdrop: 'rgba(0, 0, 0, 0.78)',
};

const lightShadows: ShadowTokens = {
  none: {},
  soft: {
    shadowColor: '#1A3B34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#1A3B34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#1A3B34',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 16,
  },
};

const darkShadows: ShadowTokens = {
  none: {},
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.60,
    shadowRadius: 32,
    elevation: 16,
  },
};

export const midnightNeutralLight: ThemeTokens = {
  id: 'midnightNeutral',
  name: 'Marvie Slate / Mint',
  mode: 'light',
  colors: lightColors,
  typography: createTypographyTokens(lightColors.textPrimary, lightColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: lightShadows,
};

export const midnightNeutralDark: ThemeTokens = {
  id: 'midnightNeutral',
  name: 'Marvie Slate / Mint',
  mode: 'dark',
  colors: darkColors,
  typography: createTypographyTokens(darkColors.textPrimary, darkColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: darkShadows,
};
