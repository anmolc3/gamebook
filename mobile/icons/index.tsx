import React from 'react';
import { Image } from 'react-native';
import Svg, { Path, Circle, Rect, Polyline, Line, G } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

// 1. Navigation Icons
export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Home'}>
    <Path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const GamepadIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Games'}>
    <Path d="M6 12H10M8 10V14M15 13H15.01M18 11H18.01M17.32 5H6.68C4.65 5 3 6.65 3 8.68V15.32C3 17.35 4.65 19 6.68 19C7.45 19 8.19 18.66 8.68 18.07L10.28 16.15C10.74 15.6 11.41 15.28 12.13 15.28H14.87C15.59 15.28 16.26 15.6 16.72 16.15L18.32 18.07C18.81 18.66 19.55 19 20.32 19C22.35 19 24 17.35 24 15.32V8.68C24 6.65 22.35 5 20.32 5H17.32Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UsersIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Friends'}>
    <Path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13ZM23 21V19C22.99 18.18 22.42 17.47 21.62 17.24M16 5.13C17.7 5.67 18.88 7.21 18.88 9C18.88 10.79 17.7 12.33 16 12.87" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChatIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Chat'}>
    <Path d="M21 11.5C21.01 13.3 20.34 15.05 19.12 16.38C17.9 17.71 16.2 18.54 14.36 18.72C13.58 18.8 12.8 18.76 12.03 18.6L8 20L9.4 16C8.5 14.9 8 13.5 8 12C8 7.58 11.58 4 16 4C18.7 4 21 6.3 21 9V11.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 14.5C3.36 13.58 3 12.49 3 11.36C3 7.85 5.85 5 9.36 5M3 17.5L5.5 16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Profile'}>
    <Path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21M12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 2. Actions & Utility Icons
export const SearchIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Search'}>
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 24, accessibilityLabel }) => (
  <Image
    source={require('../assets/images/settings_icon_logo.webp')}
    style={{ width: size, height: size }}
    resizeMode="contain"
    accessibilityLabel={accessibilityLabel || 'Settings'}
  />
);


export const BellIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Notifications'}>
    <Path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21A2 2 0 0 1 10.27 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Add'}>
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Back'}>
    <Polyline points="15 18 9 12 15 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Forward'}>
    <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Close'}>
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const SendIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Send'}>
    <Path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Sent'}>
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DoubleCheckIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Delivered'}>
    <Path d="M18 6L7 17L2 12M22 10L14 18L12.5 16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Target'}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Play'}>
    <Path d="M5 3L19 12L5 21V3Z" fill={color} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Locked'}>
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M7 11V7A5 5 0 0 1 17 7V11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// 3. Gaming Icons
export const DiceIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Dice'}>
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="8" cy="8" r="1.5" fill={color} />
    <Circle cx="16" cy="8" r="1.5" fill={color} />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
    <Circle cx="8" cy="16" r="1.5" fill={color} />
    <Circle cx="16" cy="16" r="1.5" fill={color} />
  </Svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Trophy'}>
    <Path d="M6 9H3C2.45 9 2 8.55 2 8V5C2 4.45 2.45 4 3 4H6M18 9H21C21.55 9 22 8.55 22 8V5C22 4.45 21.55 4 21 4H18M6 4H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V4ZM12 16V20M8 20H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CrownIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Host'}>
    <Path d="M2 4L5 20H19L22 4L15 10L12 3L9 10L2 4Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const RefreshCwIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Rematch'}>
    <Polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.49 15A9 9 0 1 1 21.21 8.79L23 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SunIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Light Mode'}>
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Dark Mode'}>
    <Path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PaletteIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Theme'}>
    <Path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C12.83 22 13.5 21.33 13.5 20.5C13.5 20.1 13.34 19.74 13.08 19.47C12.82 19.2 12.67 18.84 12.67 18.45C12.67 17.62 13.34 16.95 14.17 16.95H16C19.31 16.95 22 14.26 22 10.95C22 6.01 17.52 2 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="6.5" cy="11.5" r="1.5" fill={color} />
    <Circle cx="9.5" cy="7.5" r="1.5" fill={color} />
    <Circle cx="14.5" cy="7.5" r="1.5" fill={color} />
    <Circle cx="17.5" cy="11.5" r="1.5" fill={color} />
  </Svg>
);

export const EditIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Edit'}>
    <Path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.50001C19.3284 1.67158 20.6716 1.67158 21.5 2.50001C22.3284 3.32844 22.3284 4.67157 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FlameIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Streak'}>
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12C11 10.5 9.5 9 9.5 9C9.5 9 14.5 7.5 14.5 4C14.5 4 19 8.5 19 14C19 17.866 15.866 21 12 21C8.134 21 5 17.866 5 14C5 12.5 5.5 10.5 6.5 9.5C6.5 9.5 6.5 12 8.5 14.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Shield'}>
    <Path d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const AwardIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Award'}>
    <Circle cx="12" cy="8" r="7" stroke={color} strokeWidth={strokeWidth} />
    <Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Calendar'}>
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const LogOutIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Log Out'}>
    <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UserPlusIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Add Friend'}>
    <Path d="M16 21V19C16 16.79 14.21 15 12 15H5C2.79 15 1 16.79 1 19V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="20" y1="8" x2="20" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="23" y1="11" x2="17" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UserCheckIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Friends'}>
    <Path d="M16 21V19C16 16.79 14.21 15 12 15H5C2.79 15 1 16.79 1 19V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17 11 19 13 23 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UserXIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Remove Friend'}>
    <Path d="M16 21V19C16 16.79 14.21 15 12 15H5C2.79 15 1 16.79 1 19V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="18" y1="8" x2="23" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="23" y1="8" x2="18" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const BanIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Block'}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} accessibilityLabel={accessibilityLabel || 'Star'}>
    <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CrossMarkIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 3, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'X Mark'}>
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const CircleMarkIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 3, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'O Mark'}>
    <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Clock'}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const HeartIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} accessibilityLabel={accessibilityLabel || 'Heart'}>
    <Path d="M20.84 4.61A5.5 5.5 0 0 0 12 6.57A5.5 5.5 0 0 0 3.16 4.61C1.98 5.79 1.34 7.39 1.34 9.07C1.34 10.75 1.98 12.35 3.16 13.53L12 22.37L20.84 13.53C22.02 12.35 22.66 10.75 22.66 9.07C22.66 7.39 22.02 5.79 20.84 4.61Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const EyeIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Show password'}>
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="12"
      r="3"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Hide password'}>
    <Path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'Information'}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const BotIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', strokeWidth = 2, accessibilityLabel }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={accessibilityLabel || 'AI Opponent'}>
    <Rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 14H4M20 14H22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 2V8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="13" r="1.5" fill={color} />
    <Circle cx="15" cy="13" r="1.5" fill={color} />
    <Path d="M9 17H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export type IconName =
  | 'home'
  | 'gamepad'
  | 'bot'
  | 'users'
  | 'chat'
  | 'user'
  | 'search'
  | 'settings'
  | 'bell'
  | 'plus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'close'
  | 'send'
  | 'check'
  | 'doubleCheck'
  | 'lock'
  | 'target'
  | 'play'
  | 'dice'
  | 'trophy'
  | 'crown'
  | 'refresh'
  | 'sun'
  | 'moon'
  | 'palette'
  | 'edit'
  | 'flame'
  | 'shield'
  | 'award'
  | 'calendar'
  | 'logOut'
  | 'userPlus'
  | 'userCheck'
  | 'userX'
  | 'ban'
  | 'star'
  | 'crossMark'
  | 'circleMark'
  | 'clock'
  | 'heart'
  | 'eye'
  | 'eyeOff'
  | 'info';

export const Icon: React.FC<{ name: IconName } & IconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'home': return <HomeIcon {...props} />;
    case 'gamepad': return <GamepadIcon {...props} />;
    case 'bot': return <BotIcon {...props} />;
    case 'users': return <UsersIcon {...props} />;
    case 'chat': return <ChatIcon {...props} />;
    case 'user': return <UserIcon {...props} />;
    case 'search': return <SearchIcon {...props} />;
    case 'settings': return <SettingsIcon {...props} />;
    case 'bell': return <BellIcon {...props} />;
    case 'plus': return <PlusIcon {...props} />;
    case 'chevronLeft': return <ChevronLeftIcon {...props} />;
    case 'chevronRight': return <ChevronRightIcon {...props} />;
    case 'close': return <CloseIcon {...props} />;
    case 'send': return <SendIcon {...props} />;
    case 'check': return <CheckIcon {...props} />;
    case 'doubleCheck': return <DoubleCheckIcon {...props} />;
    case 'lock': return <LockIcon {...props} />;
    case 'target': return <TargetIcon {...props} />;
    case 'play': return <PlayIcon {...props} />;
    case 'dice': return <DiceIcon {...props} />;
    case 'trophy': return <TrophyIcon {...props} />;
    case 'crown': return <CrownIcon {...props} />;
    case 'refresh': return <RefreshCwIcon {...props} />;
    case 'sun': return <SunIcon {...props} />;
    case 'moon': return <MoonIcon {...props} />;
    case 'palette': return <PaletteIcon {...props} />;
    case 'edit': return <EditIcon {...props} />;
    case 'flame': return <FlameIcon {...props} />;
    case 'shield': return <ShieldIcon {...props} />;
    case 'award': return <AwardIcon {...props} />;
    case 'calendar': return <CalendarIcon {...props} />;
    case 'logOut': return <LogOutIcon {...props} />;
    case 'userPlus': return <UserPlusIcon {...props} />;
    case 'userCheck': return <UserCheckIcon {...props} />;
    case 'userX': return <UserXIcon {...props} />;
    case 'ban': return <BanIcon {...props} />;
    case 'star': return <StarIcon {...props} />;
    case 'crossMark': return <CrossMarkIcon {...props} />;
    case 'circleMark': return <CircleMarkIcon {...props} />;
    case 'clock': return <ClockIcon {...props} />;
    case 'heart': return <HeartIcon {...props} />;
    case 'eye': return <EyeIcon {...props} />;
    case 'eyeOff': return <EyeOffIcon {...props} />;
    case 'info': return <InfoIcon {...props} />;
    default: return <GamepadIcon {...props} />;
  }
};
