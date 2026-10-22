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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  rightIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'tinted' | 'outline' | 'danger' | 'gradient';
  gradientColors?: readonly [string, string, ...string[]];
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
  gradientColors = ['#FF2A6D', '#FF5E3A', '#FF9500'],
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

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[{ borderRadius: 14, overflow: 'hidden' }, style]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <LinearGradient
          colors={disabled ? ['#2D323E', '#222630'] : (gradientColors as [string, string, ...string[]])}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.button, { borderRadius: 14 }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.content}>
              {icon && (
                <View style={styles.iconWrapper}>
                  <Icon name={icon} size={18} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              )}
              <Text
                style={[
                  theme.typography.button,
                  { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
                  textStyle,
                ]}
              >
                {label}
              </Text>
              {rightIcon && (
                <View style={styles.rightIconWrapper}>
                  <Icon name={rightIcon} size={18} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
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
