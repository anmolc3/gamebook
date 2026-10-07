import { ColorTokens, ShadowTokens, ThemeTokens, SPACING, RADIUS, createTypographyTokens } from '../tokens';

const lightColors: ColorTokens = {
  background: '#EDF1FA',
  backgroundSecondary: '#E5EFE7',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F7FD',
  surfacePressed: '#E8EEF8',

  textPrimary: '#08211A',
  textSecondary: '#416053',
  textMuted: '#6B8E80',
  textDisabled: '#ADC1B8',
  textOnPrimary: '#FFFFFF',

  border: '#E4E9F3',
  borderFocus: '#25C685',
  divider: '#EDF1FA',

  primary: '#25C685',
  primaryLight: '#68E2B2',
  primaryDark: '#1A9462',

  secondary: '#FFC542',
  accent: '#B88A52',

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
  inGame: '#FFC542',
  away: '#FF974A',
  offline: '#899A96',

  backdrop: 'rgba(12, 59, 46, 0.45)',
};

const darkColors: ColorTokens = {
  background: '#202F35',
  backgroundSecondary: '#19262C',
  surface: '#283A43',
  surfaceElevated: '#30444E',
  surfacePressed: '#38505B',

  textPrimary: '#EDF7F1',
  textSecondary: '#96A7AF',
  textMuted: '#678B7A',
  textDisabled: '#3D594E',
  textOnPrimary: '#08211A',

  border: '#354852',
  borderFocus: '#3ED598',
  divider: '#2B3D45',

  primary: '#3ED598',
  primaryLight: '#68E2B2',
  primaryDark: '#25C685',

  secondary: '#FFC542',
  accent: '#FFBC25',

  accentMint: '#3ED598',
  accentAmber: '#FFC542',
  accentOrange: '#FF974A',
  accentCoral: '#FF575F',
  accentBlue: '#0062FF',
  accentPurple: '#755FE2',

  cardTintMint: '#286053',
  cardTintCoral: '#623A42',
  cardTintAmber: '#625B39',
  cardTintOrange: '#624D3B',
  cardTintBlue: '#163E72',
  cardTintPurple: '#393D69',

  success: '#3ED598',
  warning: '#FFC542',
  error: '#FF575F',
  info: '#0062FF',

  online: '#3ED598',
  inGame: '#FFC542',
  away: '#FF974A',
  offline: '#96A7AF',

  backdrop: 'rgba(0, 0, 0, 0.75)',
};

const lightShadows: ShadowTokens = {
  none: {},
  soft: {
    shadowColor: '#08211A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#08211A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#08211A',
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

export const forestGoldLight: ThemeTokens = {
  id: 'forestGold',
  name: 'Forest / Gold',
  mode: 'light',
  colors: lightColors,
  typography: createTypographyTokens(lightColors.textPrimary, lightColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: lightShadows,
};

export const forestGoldDark: ThemeTokens = {
  id: 'forestGold',
  name: 'Forest / Gold',
  mode: 'dark',
  colors: darkColors,
  typography: createTypographyTokens(darkColors.textPrimary, darkColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: darkShadows,
};
