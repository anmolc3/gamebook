import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { NotificationIcon } from '../atoms/NotificationIcon';
import { GameControllerLogo } from '../atoms/GameControllerLogo';

interface AppHeaderProps {
  userName?: string;
  avatarUrl?: string | null;
  greeting?: string;
  hasUnreadNotifications?: boolean;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  avatarUrl,
  greeting = 'Welcome back',
  hasUnreadNotifications = true,
  onPressNotifications,
  onPressProfile,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.divider }]}>
      <TouchableOpacity
        style={styles.left}
        onPress={onPressProfile}
        activeOpacity={onPressProfile ? 0.7 : 1}
        disabled={!onPressProfile}
        accessibilityLabel="View Profile"
      >
        <Avatar displayName={userName || 'Player'} avatarUrl={avatarUrl} size="md" status="online" />
      </TouchableOpacity>

      <View style={styles.centerBrand} pointerEvents="none">
        <GameControllerLogo size={32} color={theme.colors.primary} />
      </View>

      <View style={styles.right}>
        {onPressNotifications && (
          <TouchableOpacity
            onPress={onPressNotifications}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
            style={styles.notifBtn}
          >
            <NotificationIcon size={36} hasUnread={hasUnreadNotifications} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 70,
    borderBottomWidth: 1,
    position: 'relative',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  centerBrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    zIndex: 2,
  },
  notifBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

