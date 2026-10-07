import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Path, Polygon, G, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export interface PresetAvatarOption {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export const PRESET_AVATARS: PresetAvatarOption[] = [
  { id: 'cyber_ninja', name: 'Cyber Ninja', primaryColor: '#6366F1', secondaryColor: '#A855F7' },
  { id: 'cosmic_voyager', name: 'Cosmic Voyager', primaryColor: '#06B6D4', secondaryColor: '#3B82F6' },
  { id: 'golden_phoenix', name: 'Phoenix', primaryColor: '#F59E0B', secondaryColor: '#EF4444' },
  { id: 'shadow_knight', name: 'Shadow Knight', primaryColor: '#10B981', secondaryColor: '#059669' },
  { id: 'valkyrie_crown', name: 'Valkyrie', primaryColor: '#EC4899', secondaryColor: '#8B5CF6' },
  { id: 'neon_tiger', name: 'Neon Apex', primaryColor: '#E07A5F', secondaryColor: '#F2CC8F' },
];

export interface PresetAvatarProps {
  presetId?: string | null;
  size?: number;
}

export const PresetAvatar: React.FC<PresetAvatarProps> = ({ presetId, size = 64 }) => {
  const normalizedId = presetId || 'cyber_ninja';

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
            {/* Hood / Mask */}
            <Path d="M18 42C18 30 24 20 32 20C40 20 46 30 46 42C46 46 42 50 32 50C22 50 18 46 18 42Z" fill="#312E81" />
            {/* Visor Slit */}
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
            {/* Helmet */}
            <Circle cx="32" cy="32" r="16" fill="#1E293B" stroke="#06B6D4" strokeWidth="2" />
            {/* Visor */}
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
            {/* Phoenix Crest */}
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
            {/* Helm */}
            <Path d="M22 22C22 18 26 15 32 15C38 15 42 18 42 22V36C42 42 37 47 32 49C27 47 22 42 22 36V22Z" fill="#064E3B" stroke="#10B981" strokeWidth="2" />
            {/* Cross Visor */}
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
            {/* Tiara / Wings */}
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
            {/* Ears */}
            <Polygon points="18,24 24,14 28,26" fill="#E07A5F" />
            <Polygon points="46,24 40,14 36,26" fill="#E07A5F" />
            {/* Face */}
            <Path d="M20 28C20 22 25 18 32 18C39 18 44 22 44 28C44 38 38 46 32 48C26 46 20 38 20 28Z" fill="#3D261E" />
            {/* Eyes */}
            <Polygon points="24,30 29,32 26,34" fill="#F2CC8F" />
            <Polygon points="40,30 35,32 38,34" fill="#F2CC8F" />
            {/* Whisker Lines */}
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
