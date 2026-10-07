import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { IconButton } from '../molecules/IconButton';

interface AppHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  greeting?: string;
  onPressNotifications?: () => void;
  onPressSettings?: () => void;
  onPressThemeToggle?: () => void;
  onPressProfile?: () => void;
  onPressFriends?: () => void;
  onPressChat?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  avatarUrl,
  greeting = 'Welcome back',
  onPressNotifications,
  onPressSettings,
  onPressThemeToggle,
  onPressProfile,
  onPressFriends,
  onPressChat,
}) => {
  const { theme } = useTheme();

  const handleSettingsPress = onPressSettings || onPressThemeToggle;

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.divider }]}>
      <TouchableOpacity
        style={styles.left}
        onPress={onPressProfile}
        activeOpacity={onPressProfile ? 0.7 : 1}
        disabled={!onPressProfile}
      >
        <Avatar displayName={userName} avatarUrl={avatarUrl} size="sm" status="online" />
        <View style={styles.textWrapper}>
          <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
            {greeting}
          </Text>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
            {userName}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.right}>
        {onPressChat && (
          <IconButton
            icon="chat"
            onPress={onPressChat}
            size={40}
            iconSize={20}
            variant="tinted"
            accessibilityLabel="Direct Messages"
            style={styles.actionBtn}
          />
        )}
        {onPressFriends && (
          <IconButton
            icon="users"
            onPress={onPressFriends}
            size={40}
            iconSize={20}
            variant="tinted"
            accessibilityLabel="Social & Friends"
            style={styles.actionBtn}
          />
        )}
        {handleSettingsPress && (
          <IconButton
            icon="settings"
            onPress={handleSettingsPress}
            size={40}
            iconSize={20}
            variant="tinted"
            accessibilityLabel="Platform Settings"
            style={styles.actionBtn}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textWrapper: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    marginLeft: 4,
  },
});
