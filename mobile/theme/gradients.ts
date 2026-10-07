import { ThemeId } from './tokens';

export interface ThemeGradients {
  hero: [string, string];
  heroBorder: string;
  card: [string, string];
  cardBorder: string;
  statMint: [string, string];
  statAmber: [string, string];
  statCoral: [string, string];
  statBorder: string;
  joinCode: [string, string];
  joinCodeBorder: string;
}

const THEME_GRADIENTS: Record<ThemeId, { dark: ThemeGradients; light: ThemeGradients }> = {
  midnightNeutral: {
    dark: {
      hero: ['#18453B', '#22363E'],
      heroBorder: '#2E6857',
      card: ['#2E4450', '#24353E'],
      cardBorder: '#3A5564',
      statMint: ['#1E4A3E', '#22373F'],
      statAmber: ['#46381C', '#27363D'],
      statCoral: ['#482129', '#27363D'],
      statBorder: '#3C5260',
      joinCode: ['#2A3F4A', '#22333B'],
      joinCodeBorder: '#3B525F',
    },
    light: {
      hero: ['#D7F9EC', '#EBF8F2'],
      heroBorder: '#A9ECD2',
      card: ['#FFFFFF', '#EEF4F7'],
      cardBorder: '#E2EAF0',
      statMint: ['#E0F9EE', '#F2FCF8'],
      statAmber: ['#FFF5DC', '#FFFBF2'],
      statCoral: ['#FFE7EB', '#FFF4F6'],
      statBorder: '#E4ECF2',
      joinCode: ['#FFFFFF', '#EEF4F7'],
      joinCodeBorder: '#E2EAF0',
    },
  },
  coralMarble: {
    dark: {
      hero: ['#541B26', '#2F1E24'],
      heroBorder: '#782E3C',
      card: ['#3D252E', '#291A20'],
      cardBorder: '#52343F',
      statMint: ['#204437', '#2E1C22'],
      statAmber: ['#49361A', '#2E1C22'],
      statCoral: ['#561E29', '#2E1C22'],
      statBorder: '#4F313C',
      joinCode: ['#3D232C', '#291920'],
      joinCodeBorder: '#52333E',
    },
    light: {
      hero: ['#FFE2E6', '#FFF2F4'],
      heroBorder: '#FFB8C2',
      card: ['#FFFFFF', '#FFF0F3'],
      cardBorder: '#F9DCE2',
      statMint: ['#E5FAF0', '#F4FCF7'],
      statAmber: ['#FFF4DE', '#FFFBF4'],
      statCoral: ['#FFE4E8', '#FFF3F5'],
      statBorder: '#F8DCE2',
      joinCode: ['#FFFFFF', '#FFF0F3'],
      joinCodeBorder: '#F9DCE2',
    },
  },
  forestGold: {
    dark: {
      hero: ['#144633', '#1C3227'],
      heroBorder: '#236B4E',
      card: ['#243C32', '#1B2C24'],
      cardBorder: '#355447',
      statMint: ['#194E38', '#1E3329'],
      statAmber: ['#4D3F19', '#1E3329'],
      statCoral: ['#4A2228', '#1E3329'],
      statBorder: '#375447',
      joinCode: ['#243C32', '#1B2B24'],
      joinCodeBorder: '#355346',
    },
    light: {
      hero: ['#D5F7EB', '#EFFBF5'],
      heroBorder: '#A6EECF',
      card: ['#FFFFFF', '#EDF9F3'],
      cardBorder: '#D8F1E5',
      statMint: ['#DCF8EC', '#F2FCF7'],
      statAmber: ['#FFF3D6', '#FFFBF0'],
      statCoral: ['#FFE5EA', '#FFF3F6'],
      statBorder: '#D9F1E5',
      joinCode: ['#FFFFFF', '#EDF9F3'],
      joinCodeBorder: '#D8F1E5',
    },
  },
  moonViolet: {
    dark: {
      hero: ['#391E68', '#251740'],
      heroBorder: '#59369C',
      card: ['#352454', '#251A3B'],
      cardBorder: '#4C3775',
      statMint: ['#1E433E', '#271A3E'],
      statAmber: ['#46381B', '#271A3E'],
      statCoral: ['#49212A', '#271A3E'],
      statBorder: '#4A3572',
      joinCode: ['#332352', '#24183A'],
      joinCodeBorder: '#483370',
    },
    light: {
      hero: ['#EAE4FC', '#F5F1FD'],
      heroBorder: '#C9BAF7',
      card: ['#FFFFFF', '#F2EEFC'],
      cardBorder: '#E2DCF7',
      statMint: ['#E1F9EE', '#F3FCF7'],
      statAmber: ['#FFF4DA', '#FFFBF2'],
      statCoral: ['#FFE7EC', '#FFF4F6'],
      statBorder: '#E2DBF7',
      joinCode: ['#FFFFFF', '#F2EEFC'],
      joinCodeBorder: '#E2DCF7',
    },
  },
  violetDusk: {
    dark: {
      hero: ['#491F38', '#2D1728'],
      heroBorder: '#72375B',
      card: ['#392233', '#281724'],
      cardBorder: '#53344B',
      statMint: ['#1D4139', '#2B1727'],
      statAmber: ['#48351B', '#2B1727'],
      statCoral: ['#4A1F29', '#2B1727'],
      statBorder: '#503348',
      joinCode: ['#382132', '#271623'],
      joinCodeBorder: '#513349',
    },
    light: {
      hero: ['#FBE5F1', '#FCF2F7'],
      heroBorder: '#F0BBD7',
      card: ['#FFFFFF', '#F9EBF3'],
      cardBorder: '#F4D8E9',
      statMint: ['#E1FAF0', '#F3FCF8'],
      statAmber: ['#FFF4DC', '#FFFBF3'],
      statCoral: ['#FFE6EC', '#FFF3F6'],
      statBorder: '#F4D8EA',
      joinCode: ['#FFFFFF', '#F9EBF3'],
      joinCodeBorder: '#F4D8E9',
    },
  },
};

export function getThemeGradients(themeId: ThemeId, mode: 'light' | 'dark'): ThemeGradients {
  const family = THEME_GRADIENTS[themeId] || THEME_GRADIENTS.midnightNeutral;
  return mode === 'dark' ? family.dark : family.light;
}

export function getThemeCardGradient(
  themeId: ThemeId,
  mode: 'light' | 'dark',
  accentColor?: string
): { colors: [string, string]; borderColor: string } {
  const g = getThemeGradients(themeId, mode);
  if (!accentColor) {
    return { colors: g.card, borderColor: g.cardBorder };
  }

  // Determine accent category
  const lower = accentColor.toLowerCase();
  const isMint =
    lower.includes('3ed') ||
    lower.includes('25c') ||
    lower.includes('2ecc') ||
    lower.includes('10b9') ||
    lower.includes('22c5');
  const isAmber =
    lower.includes('ffc') ||
    lower.includes('f59') ||
    lower.includes('f1c') ||
    lower.includes('f97') ||
    lower.includes('eab');
  const isCoral =
    lower.includes('ff5') ||
    lower.includes('ef4') ||
    lower.includes('dc2') ||
    lower.includes('ca2') ||
    lower.includes('e11');
  const isBlue =
    lower.includes('006') ||
    lower.includes('028') ||
    lower.includes('38b') ||
    lower.includes('06b') ||
    lower.includes('14b');
  const isPurple =
    lower.includes('755') ||
    lower.includes('7c3') ||
    lower.includes('636') ||
    lower.includes('8b5') ||
    lower.includes('935');

  if (mode === 'dark') {
    if (isMint) return { colors: g.statMint, borderColor: g.heroBorder };
    if (isAmber) return { colors: g.statAmber, borderColor: '#5C4A22' };
    if (isCoral) return { colors: g.statCoral, borderColor: '#632B36' };
    if (isBlue) return { colors: ['#1C334E', g.card[1]], borderColor: '#2E4C73' };
    if (isPurple) return { colors: ['#322256', g.card[1]], borderColor: '#4C357F' };
    return { colors: g.card, borderColor: g.cardBorder };
  } else {
    if (isMint) return { colors: g.statMint, borderColor: g.heroBorder };
    if (isAmber) return { colors: g.statAmber, borderColor: '#FFE4A8' };
    if (isCoral) return { colors: g.statCoral, borderColor: '#FFCCD4' };
    if (isBlue) return { colors: ['#FFFFFF', '#EAF3FF'], borderColor: '#D3E4FD' };
    if (isPurple) return { colors: ['#FFFFFF', '#F2EEFD'], borderColor: '#DDD6FA' };
    return { colors: g.card, borderColor: g.cardBorder };
  }
}
