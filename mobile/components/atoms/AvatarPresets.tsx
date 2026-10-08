import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Path, Polygon, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export interface PresetAvatarOption {
  id: string;
  name: string;
  category: 'Gaming' | 'Cosmic' | 'Heroes' | 'Mythic' | 'Legends';
  primaryColor: string;
  secondaryColor: string;
  imageSource?: any;
}

// 20 WebP Avatars from user-provided avatars folder
export const AVATAR_IMAGE_MAP: Record<string, any> = {
  cosmic_golden_emblem_hero: require('../../assets/images/avatars/cosmic_golden_emblem_hero.webp'),
  einstein_inspired_cosmic_portrait: require('../../assets/images/avatars/einstein_inspired_cosmic_portrait.webp'),
  fiery_rabbit_streetwear_mascot: require('../../assets/images/avatars/fiery_rabbit_streetwear_mascot.webp'),
  flaming_skull_rider_emblem: require('../../assets/images/avatars/flaming_skull_rider_emblem.webp'),
  frostbound_armored_elephant_emblem: require('../../assets/images/avatars/frostbound_armored_elephant_emblem.webp'),
  golden_allah_calligraphy_over_a_glowing_mosque: require('../../assets/images/avatars/golden_allah_calligraphy_over_a_glowing_mosque.webp'),
  golden_crown_panda_gaming_emblem: require('../../assets/images/avatars/golden_crown_panda_gaming_emblem.webp'),
  heroic_village_guardian_avatar: require('../../assets/images/avatars/heroic_village_guardian_avatar.webp'),
  hooded_mage_with_cyan_swirls: require('../../assets/images/avatars/hooded_mage_with_cyan_swirls.webp'),
  icy_crown_raven_emblem: require('../../assets/images/avatars/icy_crown_raven_emblem.webp'),
  indian_tricolor_at_golden_dawn: require('../../assets/images/avatars/indian_tricolor_at_golden_dawn.webp'),
  krishna_playing_a_golden_flute: require('../../assets/images/avatars/krishna_playing_a_golden_flute.webp'),
  moonlit_masked_hero_over_the_city: require('../../assets/images/avatars/moonlit_masked_hero_over_the_city.webp'),
  moonlit_shiva_in_the_himalayas: require('../../assets/images/avatars/moonlit_shiva_in_the_himalayas.webp'),
  neon_astronaut_peace_sign_badge: require('../../assets/images/avatars/neon_astronaut_peace_sign_badge.webp'),
  neon_blue_masked_anime_avatar: require('../../assets/images/avatars/neon_blue_masked_anime_avatar.webp'),
  neon_masked_gamer_avatar: require('../../assets/images/avatars/neon_masked_gamer_avatar.webp'),
  ramanujan_infinite_mathematical_portrait: require('../../assets/images/avatars/ramanujan_infinite_mathematical_portrait.webp'),
  revolutionary_portrait_in_red_and_black: require('../../assets/images/avatars/revolutionary_portrait_in_red_and_black.webp'),
  superhero_kid_over_sunset_cityscape: require('../../assets/images/avatars/superhero_kid_over_sunset_cityscape.webp'),
};

export const PRESET_AVATARS: PresetAvatarOption[] = [
  // 1. Gaming & Mascot Avatars
  {
    id: 'neon_masked_gamer_avatar',
    name: 'Neon Gamer',
    category: 'Gaming',
    primaryColor: '#00F0FF',
    secondaryColor: '#7000FF',
    imageSource: AVATAR_IMAGE_MAP.neon_masked_gamer_avatar,
  },
  {
    id: 'golden_crown_panda_gaming_emblem',
    name: 'Crown Panda',
    category: 'Gaming',
    primaryColor: '#FFD700',
    secondaryColor: '#FF6B00',
    imageSource: AVATAR_IMAGE_MAP.golden_crown_panda_gaming_emblem,
  },
  {
    id: 'fiery_rabbit_streetwear_mascot',
    name: 'Fire Rabbit',
    category: 'Gaming',
    primaryColor: '#FF4757',
    secondaryColor: '#FFA502',
    imageSource: AVATAR_IMAGE_MAP.fiery_rabbit_streetwear_mascot,
  },
  {
    id: 'flaming_skull_rider_emblem',
    name: 'Skull Rider',
    category: 'Gaming',
    primaryColor: '#FF3838',
    secondaryColor: '#7158E2',
    imageSource: AVATAR_IMAGE_MAP.flaming_skull_rider_emblem,
  },
  {
    id: 'frostbound_armored_elephant_emblem',
    name: 'Frost Elephant',
    category: 'Gaming',
    primaryColor: '#17C0EB',
    secondaryColor: '#18DCFF',
    imageSource: AVATAR_IMAGE_MAP.frostbound_armored_elephant_emblem,
  },
  {
    id: 'icy_crown_raven_emblem',
    name: 'Crown Raven',
    category: 'Gaming',
    primaryColor: '#4BCFFA',
    secondaryColor: '#0BC88B',
    imageSource: AVATAR_IMAGE_MAP.icy_crown_raven_emblem,
  },

  // 2. Heroes & Anime
  {
    id: 'neon_blue_masked_anime_avatar',
    name: 'Anime Shinobi',
    category: 'Heroes',
    primaryColor: '#34E7E4',
    secondaryColor: '#05C46B',
    imageSource: AVATAR_IMAGE_MAP.neon_blue_masked_anime_avatar,
  },
  {
    id: 'moonlit_masked_hero_over_the_city',
    name: 'Moonlit Vigilante',
    category: 'Heroes',
    primaryColor: '#3C40C6',
    secondaryColor: '#575FCC',
    imageSource: AVATAR_IMAGE_MAP.moonlit_masked_hero_over_the_city,
  },
  {
    id: 'superhero_kid_over_sunset_cityscape',
    name: 'Sunset Hero',
    category: 'Heroes',
    primaryColor: '#FF5E57',
    secondaryColor: '#FFC048',
    imageSource: AVATAR_IMAGE_MAP.superhero_kid_over_sunset_cityscape,
  },
  {
    id: 'hooded_mage_with_cyan_swirls',
    name: 'Cyan Mage',
    category: 'Heroes',
    primaryColor: '#0BE881',
    secondaryColor: '#00D8D6',
    imageSource: AVATAR_IMAGE_MAP.hooded_mage_with_cyan_swirls,
  },
  {
    id: 'heroic_village_guardian_avatar',
    name: 'Village Guardian',
    category: 'Heroes',
    primaryColor: '#E15F41',
    secondaryColor: '#F5CD79',
    imageSource: AVATAR_IMAGE_MAP.heroic_village_guardian_avatar,
  },

  // 3. Cosmic & Sci-Fi
  {
    id: 'cosmic_golden_emblem_hero',
    name: 'Cosmic Golden',
    category: 'Cosmic',
    primaryColor: '#F39C12',
    secondaryColor: '#8E44AD',
    imageSource: AVATAR_IMAGE_MAP.cosmic_golden_emblem_hero,
  },
  {
    id: 'neon_astronaut_peace_sign_badge',
    name: 'Neon Astro',
    category: 'Cosmic',
    primaryColor: '#9B59B6',
    secondaryColor: '#1ABC9C',
    imageSource: AVATAR_IMAGE_MAP.neon_astronaut_peace_sign_badge,
  },
  {
    id: 'einstein_inspired_cosmic_portrait',
    name: 'Cosmic Genius',
    category: 'Cosmic',
    primaryColor: '#3498DB',
    secondaryColor: '#E67E22',
    imageSource: AVATAR_IMAGE_MAP.einstein_inspired_cosmic_portrait,
  },

  // 4. Cultural & Mythic
  {
    id: 'krishna_playing_a_golden_flute',
    name: 'Divine Krishna',
    category: 'Mythic',
    primaryColor: '#2980B9',
    secondaryColor: '#F1C40F',
    imageSource: AVATAR_IMAGE_MAP.krishna_playing_a_golden_flute,
  },
  {
    id: 'moonlit_shiva_in_the_himalayas',
    name: 'Moonlit Shiva',
    category: 'Mythic',
    primaryColor: '#16A085',
    secondaryColor: '#2C3E50',
    imageSource: AVATAR_IMAGE_MAP.moonlit_shiva_in_the_himalayas,
  },
  {
    id: 'golden_allah_calligraphy_over_a_glowing_mosque',
    name: 'Golden Light',
    category: 'Mythic',
    primaryColor: '#D4AF37',
    secondaryColor: '#27AE60',
    imageSource: AVATAR_IMAGE_MAP.golden_allah_calligraphy_over_a_glowing_mosque,
  },

  // 5. Legends & Patriotic
  {
    id: 'indian_tricolor_at_golden_dawn',
    name: 'Golden Dawn',
    category: 'Legends',
    primaryColor: '#FF9933',
    secondaryColor: '#138808',
    imageSource: AVATAR_IMAGE_MAP.indian_tricolor_at_golden_dawn,
  },
  {
    id: 'ramanujan_infinite_mathematical_portrait',
    name: 'Infinite Mind',
    category: 'Legends',
    primaryColor: '#8E44AD',
    secondaryColor: '#D35400',
    imageSource: AVATAR_IMAGE_MAP.ramanujan_infinite_mathematical_portrait,
  },
  {
    id: 'revolutionary_portrait_in_red_and_black',
    name: 'Revolutionary',
    category: 'Legends',
    primaryColor: '#C0392B',
    secondaryColor: '#2C3E50',
    imageSource: AVATAR_IMAGE_MAP.revolutionary_portrait_in_red_and_black,
  },

  // Legacy SVG Presets for full backwards compatibility
  { id: 'cyber_ninja', name: 'Cyber Ninja (Classic)', category: 'Gaming', primaryColor: '#6366F1', secondaryColor: '#A855F7' },
  { id: 'cosmic_voyager', name: 'Cosmic Voyager (Classic)', category: 'Cosmic', primaryColor: '#06B6D4', secondaryColor: '#3B82F6' },
  { id: 'golden_phoenix', name: 'Phoenix (Classic)', category: 'Heroes', primaryColor: '#F59E0B', secondaryColor: '#EF4444' },
  { id: 'shadow_knight', name: 'Shadow Knight (Classic)', category: 'Gaming', primaryColor: '#10B981', secondaryColor: '#059669' },
  { id: 'valkyrie_crown', name: 'Valkyrie (Classic)', category: 'Heroes', primaryColor: '#EC4899', secondaryColor: '#8B5CF6' },
  { id: 'neon_tiger', name: 'Neon Apex (Classic)', category: 'Gaming', primaryColor: '#E07A5F', secondaryColor: '#F2CC8F' },
];

export interface PresetAvatarProps {
  presetId?: string | null;
  size?: number;
}

export const PresetAvatar: React.FC<PresetAvatarProps> = ({ presetId, size = 64 }) => {
  const normalizedId = presetId || 'neon_masked_gamer_avatar';

  // 1. Check if user selected one of the 20 WebP avatars
  if (AVATAR_IMAGE_MAP[normalizedId]) {
    return (
      <Image
        source={AVATAR_IMAGE_MAP[normalizedId]}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  // 2. Check if user uploaded a custom image from local storage (data URI or file URI or http)
  if (
    normalizedId.startsWith('data:') ||
    normalizedId.startsWith('file:') ||
    normalizedId.startsWith('http://') ||
    normalizedId.startsWith('https://') ||
    normalizedId.startsWith('content:')
  ) {
    return (
      <Image
        source={{ uri: normalizedId }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  // 3. Fallback to classic SVGs
  const renderGraphic = () => {
    switch (normalizedId) {
      case 'cyber_ninja':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="cnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#6366F1" />
                <Stop offset="100%" stopColor="#A855F7" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#1E1B4B" />
            <Circle cx="32" cy="32" r="28" stroke="url(#cnGrad)" strokeWidth="2.5" />
            <Path d="M18 42C18 30 24 20 32 20C40 20 46 30 46 42C46 46 42 50 32 50C22 50 18 46 18 42Z" fill="#312E81" />
            <Rect x="22" y="30" width="20" height="4" rx="2" fill="#38BDF8" />
            <Path d="M30 16L32 10L34 16" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );

      case 'cosmic_voyager':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="cvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#06B6D4" />
                <Stop offset="100%" stopColor="#3B82F6" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#0F172A" />
            <Circle cx="32" cy="32" r="28" stroke="url(#cvGrad)" strokeWidth="2.5" />
            <Circle cx="32" cy="32" r="16" fill="#1E293B" stroke="#06B6D4" strokeWidth="2" />
            <Path d="M22 30C22 25 26.5 22 32 22C37.5 22 42 25 42 30C42 34 38 37 32 37C26 37 22 34 22 30Z" fill="url(#cvGrad)" />
            <Circle cx="30" cy="27" r="1.5" fill="#FFFFFF" opacity="0.8" />
          </Svg>
        );

      case 'golden_phoenix':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="gpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#EF4444" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#2A1208" />
            <Circle cx="32" cy="32" r="28" stroke="url(#gpGrad)" strokeWidth="2.5" />
            <Path d="M32 14L37 26L48 24L40 34L46 46L32 40L18 46L24 34L16 24L27 26L32 14Z" fill="url(#gpGrad)" />
            <Circle cx="32" cy="32" r="3" fill="#FEF08A" />
          </Svg>
        );

      case 'shadow_knight':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="skGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#047857" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#06251E" />
            <Circle cx="32" cy="32" r="28" stroke="url(#skGrad)" strokeWidth="2.5" />
            <Path d="M22 22C22 18 26 15 32 15C38 15 42 18 42 22V36C42 42 37 47 32 49C27 47 22 42 22 36V22Z" fill="#064E3B" stroke="#10B981" strokeWidth="2" />
            <Rect x="26" y="27" width="12" height="3" fill="#34D399" />
            <Rect x="30.5" y="24" width="3" height="9" fill="#34D399" />
          </Svg>
        );

      case 'valkyrie_crown':
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="vcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#EC4899" />
                <Stop offset="100%" stopColor="#8B5CF6" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#270929" />
            <Circle cx="32" cy="32" r="28" stroke="url(#vcGrad)" strokeWidth="2.5" />
            <Path d="M14 26C20 28 24 35 24 44M50 26C44 28 40 35 40 44" stroke="url(#vcGrad)" strokeWidth="3" strokeLinecap="round" />
            <Path d="M24 38L32 20L40 38L32 34L24 38Z" fill="url(#vcGrad)" />
            <Circle cx="32" cy="27" r="2" fill="#FFFFFF" />
          </Svg>
        );

      case 'neon_tiger':
      default:
        return (
          <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
              <LinearGradient id="ntGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#E07A5F" />
                <Stop offset="100%" stopColor="#F2CC8F" />
              </LinearGradient>
            </Defs>
            <Rect width="64" height="64" rx={size / 2} fill="#261A16" />
            <Circle cx="32" cy="32" r="28" stroke="url(#ntGrad)" strokeWidth="2.5" />
            <Polygon points="18,24 24,14 28,26" fill="#E07A5F" />
            <Polygon points="46,24 40,14 36,26" fill="#E07A5F" />
            <Path d="M20 28C20 22 25 18 32 18C39 18 44 22 44 28C44 38 38 46 32 48C26 46 20 38 20 28Z" fill="#3D261E" />
            <Polygon points="24,30 29,32 26,34" fill="#F2CC8F" />
            <Polygon points="40,30 35,32 38,34" fill="#F2CC8F" />
            <Line x1="16" y1="36" x2="22" y2="37" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
            <Line x1="48" y1="36" x2="42" y2="37" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );
    }
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {renderGraphic()}
    </View>
  );
};
