import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { StatusIndicator, PresenceType } from './StatusIndicator';
import { PresetAvatar } from './AvatarPresets';

interface AvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: PresenceType;
  style?: ViewStyle;
}

const SIZE_MAP = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 90,
};

export const Avatar: React.FC<AvatarProps> = ({
  displayName,
  avatarUrl,
  size = 'md',
  status,
  style,
}) => {
  const { theme } = useTheme();
  const dimension = SIZE_MAP[size];
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '??';

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      {avatarUrl ? (
        <View style={{ width: dimension, height: dimension, borderRadius: dimension / 2, overflow: 'hidden' }}>
          <PresetAvatar presetId={avatarUrl} size={dimension} />
        </View>
      ) : (
        <View
          style={[
            styles.container,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: dimension * 0.38,
                color: theme.colors.primary,
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      {status && (
        <View
          style={[
            styles.statusWrapper,
            {
              borderColor: theme.colors.background,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <StatusIndicator status={status} size={dimension > 48 ? 14 : 10} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  initials: {
    fontWeight: '700',
  },
  statusWrapper: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 99,
  },
});
