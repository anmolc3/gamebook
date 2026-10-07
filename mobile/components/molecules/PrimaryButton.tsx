import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  rightIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'tinted' | 'outline' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  icon,
  rightIcon,
  loading = false,
  disabled = false,
  variant = 'filled',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  let backgroundColor = theme.colors.primary;
  let textColor = theme.colors.textOnPrimary;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'tinted') {
    backgroundColor = theme.colors.surfaceElevated;
    textColor = theme.colors.primary;
    borderColor = theme.colors.border;
    borderWidth = 1;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = theme.colors.primary;
    borderColor = theme.colors.primary;
    borderWidth = 1.5;
  } else if (variant === 'danger') {
    backgroundColor = theme.colors.error;
    textColor = '#FFFFFF';
  }

  if (disabled) {
    backgroundColor = theme.colors.surfacePressed;
    textColor = theme.colors.textDisabled;
    borderColor = 'transparent';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius.lg,
          borderColor,
          borderWidth,
        },
        variant === 'filled' && !disabled ? theme.shadows.soft : undefined,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && (
            <View style={styles.iconWrapper}>
              <Icon name={icon} size={18} color={textColor} strokeWidth={2.2} />
            </View>
          )}
          <Text
            style={[
              theme.typography.button,
              { color: textColor },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon && (
            <View style={styles.rightIconWrapper}>
              <Icon name={rightIcon} size={18} color={textColor} strokeWidth={2.2} />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  rightIconWrapper: {
    marginLeft: 8,
  },
});
