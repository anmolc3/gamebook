import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export type PresenceType = 'online' | 'inGame' | 'away' | 'offline';

interface StatusIndicatorProps {
  status: PresenceType;
  size?: number;
  style?: ViewStyle;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'offline',
  size = 10,
  style,
}) => {
  const { theme } = useTheme();

  let backgroundColor = theme.colors.offline;
  let borderWidth = 0;
  let borderColor = 'transparent';

  switch (status) {
    case 'online':
      backgroundColor = theme.colors.online;
      break;
    case 'inGame':
      backgroundColor = theme.colors.inGame;
      borderWidth = 1.5;
      borderColor = theme.colors.surface;
      break;
    case 'away':
      backgroundColor = theme.colors.away;
      borderWidth = 1;
      borderColor = theme.colors.surface;
      break;
    case 'offline':
    default:
      backgroundColor = theme.colors.offline;
      break;
  }

  return (
    <View
      accessibilityLabel={`User status: ${status}`}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    />
  );
};
