import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  variant?: 'ghost' | 'filled' | 'tinted';
  color?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 44,
  iconSize = 22,
  variant = 'ghost',
  color,
  style,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  let backgroundColor = 'transparent';
  let iconColor = color || theme.colors.textPrimary;
  let borderColor = 'transparent';

  if (variant === 'filled') {
    backgroundColor = theme.colors.primary;
    iconColor = color || theme.colors.textOnPrimary;
  } else if (variant === 'tinted') {
    backgroundColor = theme.colors.surfaceElevated;
    borderColor = theme.colors.border;
    iconColor = color || theme.colors.primary;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor,
          borderWidth: variant === 'tinted' ? 1 : 0,
        },
        variant === 'filled' ? theme.shadows.soft : undefined,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name={icon} size={iconSize} color={iconColor} strokeWidth={2} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
