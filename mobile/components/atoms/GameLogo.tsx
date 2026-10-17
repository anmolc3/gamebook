import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  StyleProp,
  ImageStyle,
  ViewStyle,
  ImageResizeMode,
} from 'react-native';
import { getGameImage } from '../../constants/gameImages';
import { Icon, IconName } from '../../icons';
import { useTheme } from '../../theme';

export interface GameLogoProps {
  /** The identifier or name of the game (e.g., 'TICTACTOE', 'LUDO', 'CHESS', etc.) */
  gameType?: string | null;
  /** Width and height in points. Logos are strictly 1:1 square. Defaults to 36. */
  size?: number;
  /** Border radius for the square logo container. Defaults to proportional (size * 0.22). */
  borderRadius?: number;
  /** Resize mode for the Image asset. Defaults to 'cover'. */
  resizeMode?: ImageResizeMode;
  /** Fallback icon name to display if no artwork is available. Defaults to 'gamepad'. */
  fallbackIcon?: IconName;
  /** Optional custom color for the fallback icon. Defaults to theme.colors.primary. */
  fallbackIconColor?: string;
  /** Custom style applied to the logo image. */
  style?: StyleProp<ImageStyle>;
  /** Custom style applied to the outer wrapper. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Whether to show a subtle border around the logo. Defaults to false. */
  showBorder?: boolean;
  /** Border color when showBorder is true. */
  borderColor?: string;
  /** Accessibility label for screen readers. */
  accessibilityLabel?: string;
}

/**
 * GameLogo
 * Reusable, centralized 1:1 square game logo component.
 * Maps any game identifier to its authentic 3D emblem/artwork with graceful fallback.
 */
export const GameLogo: React.FC<GameLogoProps> = ({
  gameType,
  size = 36,
  borderRadius,
  resizeMode = 'cover',
  fallbackIcon = 'gamepad',
  fallbackIconColor,
  style,
  containerStyle,
  showBorder = false,
  borderColor,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const radius = borderRadius !== undefined ? borderRadius : Math.round(size * 0.22);
  const imageSource = gameType ? getGameImage(gameType) : null;
  const iconColor = fallbackIconColor || theme.colors.primary;

  const boxStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...(showBorder
      ? {
          borderWidth: 1,
          borderColor: borderColor || theme.colors.border,
        }
      : {}),
  };

  if (!imageSource) {
    return (
      <View
        style={[
          boxStyle,
          { backgroundColor: theme.colors.surfaceElevated },
          containerStyle,
        ]}
        accessibilityLabel={accessibilityLabel || `${gameType || 'Game'} Logo`}
      >
        <Icon
          name={fallbackIcon}
          size={Math.max(16, Math.round(size * 0.62))}
          color={iconColor}
        />
      </View>
    );
  }

  return (
    <View
      style={[boxStyle, { backgroundColor: 'transparent' }, containerStyle]}
      accessibilityLabel={accessibilityLabel || `${gameType || 'Game'} Logo`}
    >
      <Image
        source={imageSource}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          style,
        ]}
        resizeMode={resizeMode}
      />
    </View>
  );
};

export default GameLogo;
