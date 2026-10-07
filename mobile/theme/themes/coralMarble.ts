import { ColorTokens, ShadowTokens, ThemeTokens, SPACING, RADIUS, createTypographyTokens } from '../tokens';

const lightColors: ColorTokens = {
  background: '#EDF1FA',
  backgroundSecondary: '#FFF0EB',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F7FD',
  surfacePressed: '#FFEBE3',

  textPrimary: '#2D1217',
  textSecondary: '#7C4A53',
  textMuted: '#AC7B84',
  textDisabled: '#D5BAC0',
  textOnPrimary: '#FFFFFF',

  border: '#E4E9F3',
  borderFocus: '#FF575F',
  divider: '#EDF1FA',

  primary: '#FF575F',
  primaryLight: '#FFA09F',
  primaryDark: '#CA2851',

  secondary: '#3ED598',
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

  backdrop: 'rgba(45, 18, 23, 0.4)',
};

const darkColors: ColorTokens = {
  background: '#2A3C44',
  backgroundSecondary: '#241219',
  surface: '#30444E',
  surfaceElevated: '#384852',
  surfacePressed: '#40525C',

  textPrimary: '#FFEBEF',
  textSecondary: '#96A7AF',
  textMuted: '#966D75',
  textDisabled: '#5A3F45',
  textOnPrimary: '#FFFFFF',

  border: '#3D505A',
  borderFocus: '#FF575F',
  divider: '#354751',

  primary: '#FF575F',
  primaryLight: '#FFA09F',
  primaryDark: '#CA2851',

  secondary: '#3ED598',
  accent: '#FFC542',

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
  inGame: '#755FE2',
  away: '#FFC542',
  offline: '#96A7AF',

  backdrop: 'rgba(0, 0, 0, 0.7)',
};

const lightShadows: ShadowTokens = {
  none: {},
  soft: {
    shadowColor: '#2D1217',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#2D1217',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#2D1217',
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

export const coralMarbleLight: ThemeTokens = {
  id: 'coralMarble',
  name: 'Marble / Coral',
  mode: 'light',
  colors: lightColors,
  typography: createTypographyTokens(lightColors.textPrimary, lightColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: lightShadows,
};

export const coralMarbleDark: ThemeTokens = {
  id: 'coralMarble',
  name: 'Marble / Coral',
  mode: 'dark',
  colors: darkColors,
  typography: createTypographyTokens(darkColors.textPrimary, darkColors.textSecondary),
  spacing: SPACING,
  radius: RADIUS,
  shadows: darkShadows,
};
