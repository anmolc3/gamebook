import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onPressRightIcon?: () => void;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  minimal?: boolean;
  forceDark?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onPressRightIcon,
  isPassword,
  containerStyle,
  minimal = false,
  forceDark = false,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = isPassword || secureTextEntry;

  const isDark = forceDark || theme.mode === 'dark';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          minimal
            ? {
                backgroundColor: isDark ? '#121212' : theme.colors.surface,
                borderRadius: 14,
                borderColor: error
                  ? '#FF4D6D'
                  : isFocused
                  ? '#FF5E3A'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : theme.colors.border,
                borderWidth: 1,
                height: 52,
                paddingHorizontal: 14,
              }
            : {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderColor: error
                  ? theme.colors.error
                  : isFocused
                  ? theme.colors.borderFocus
                  : theme.colors.border,
                borderWidth: isFocused || error ? 1.5 : 1,
              },
        ]}
      >
        {leftIcon && (
          <View
            style={[
              styles.leftIconContainer,
              minimal
                ? {
                    backgroundColor: 'transparent',
                    width: 28,
                    height: 28,
                    marginRight: 8,
                  }
                : {
                    backgroundColor: isFocused
                      ? theme.colors.cardTintMint
                      : theme.colors.surfaceElevated,
                    borderRadius: theme.radius.md,
                  },
            ]}
          >
            <Icon
              name={leftIcon}
              size={minimal ? 20 : 18}
              color={
                minimal
                  ? isFocused
                    ? '#FF5E3A'
                    : isDark
                    ? '#7E889B'
                    : theme.colors.textMuted
                  : isFocused
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              strokeWidth={1.8}
            />
          </View>
        )}
        <TextInput
          placeholderTextColor={minimal ? (isDark ? '#64748B' : theme.colors.textMuted) : theme.colors.textMuted}
          cursorColor={isDark ? '#FF2A6D' : theme.colors.primary}
          selectionColor={isDark ? 'rgba(255, 42, 109, 0.35)' : undefined}
          style={[
            styles.input,
            { color: minimal ? (isDark ? '#FFFFFF' : theme.colors.textPrimary) : theme.colors.textPrimary },
            style,
          ]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={isPasswordField ? !isPasswordVisible : false}
          {...props}
        />
        {isPasswordField ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIconContainer}
            activeOpacity={0.7}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={isPasswordVisible ? 'eyeOff' : 'eye'}
              size={20}
              color={
                minimal
                  ? isPasswordVisible
                    ? '#FF2A6D'
                    : isDark
                    ? '#7E889B'
                    : theme.colors.textMuted
                  : isPasswordVisible
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              strokeWidth={1.8}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onPressRightIcon}
            disabled={!onPressRightIcon}
            style={styles.rightIconContainer}
            activeOpacity={onPressRightIcon ? 0.7 : 1}
          >
            <Icon
              name={rightIcon}
              size={18}
              color={minimal ? (isDark ? '#7E889B' : theme.colors.textMuted) : theme.colors.textMuted}
              strokeWidth={1.8}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: '#FF4D6D' }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 10,
  },
  leftIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rightIconContainer: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
