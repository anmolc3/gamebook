import { TextStyle, ViewStyle } from 'react-native';

export type ThemeId = 
  | 'coralMarble' 
  | 'moonViolet' 
  | 'violetDusk' 
  | 'midnightNeutral' 
  | 'forestGold';

export type AppearanceMode = 'system' | 'light' | 'dark';

export interface ColorTokens {
  // Surface Hierarchy (Marvie Slate Foundation)
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;

  // Text Hierarchy
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textOnPrimary: string;

  // Borders & Dividers
  border: string;
  borderFocus: string;
  divider: string;

  // Primary Brand Colors (Marvie Mint/Teal Green #3ED598)
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary & Accents
  secondary: string;
  accent: string;

  // Marvie Color Palette Accents
  accentMint: string;
  accentAmber: string;
  accentOrange: string;
  accentCoral: string;
  accentBlue: string;
  accentPurple: string;

  // Marvie Tinted Surface Fills
  cardTintMint: string;
  cardTintCoral: string;
  cardTintAmber: string;
  cardTintOrange: string;
  cardTintBlue: string;
  cardTintPurple: string;

  // Feedback & State Tokens
  success: string;
  warning: string;
  error: string;
  info: string;

  // Real-Time Presence
  online: string;
  inGame: string;
  away: string;
  offline: string;

  // Overlay / Backdrop
  backdrop: string;
}

export interface TypographyTokens {
  display: TextStyle;
  headingLarge: TextStyle;
  headingMedium: TextStyle;
  headingSmall: TextStyle;
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  button: TextStyle;
}

export interface SpacingTokens {
  xxs: number; // 2
  xs: number;  // 4
  sm: number;  // 8
  md: number;  // 12
  lg: number;  // 16
  xl: number;  // 20
  xxl: number; // 24
  xxxl: number;// 32
  massive: number; // 48
}

export interface RadiusTokens {
  none: number;
  xs: number;  // 4
  sm: number;  // 8
  md: number;  // 12
  lg: number;  // 14
  xl: number;  // 18
  card: number;// 25 (Exact Sketch Marvie Card Radius)
  sheet: number;// 25 (Exact Sketch Marvie Sheet Radius)
  full: number;// 9999
}

export interface ShadowTokens {
  none: ViewStyle;
  soft: ViewStyle;
  card: ViewStyle;
  elevated: ViewStyle;
  modal: ViewStyle;
}

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  mode: 'light' | 'dark';
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
}

export const SPACING: SpacingTokens = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  massive: 48,
};

export const RADIUS: RadiusTokens = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  card: 25,
  sheet: 25,
  full: 9999,
};

export const createTypographyTokens = (textColor: string, textSecondaryColor: string): TypographyTokens => ({
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    color: textColor,
    letterSpacing: -0.5,
  },
  headingLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: textColor,
    letterSpacing: -0.3,
  },
  headingMedium: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: textColor,
    letterSpacing: -0.2,
  },
  headingSmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: textColor,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: textColor,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: textSecondaryColor,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: textSecondaryColor,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: textSecondaryColor,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: textSecondaryColor,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
