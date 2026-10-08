import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../../icons';

interface AppHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  greeting?: string;
  onPressNotifications?: () => void;
  onPressSettings?: () => void;
  onPressThemes?: () => void;
  onPressThemeToggle?: () => void;
  onPressProfile?: () => void;
  onPressFriends?: () => void;
  onPressChat?: () => void;
}

const HEADER_ICONS = {
  chat: require('../../assets/images/chat_icon_logo.webp'),
  friends: require('../../assets/images/friends_add_svg.webp'),
  settings: require('../../assets/images/settings_icon_logo.webp'),
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  avatarUrl,
  greeting = 'Welcome back',
  onPressNotifications,
  onPressSettings,
  onPressThemes,
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
          <TouchableOpacity
            onPress={onPressChat}
            activeOpacity={0.75}
            accessibilityLabel="Direct Messages"
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Image
              source={HEADER_ICONS.chat}
              style={styles.headerIconImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        {onPressFriends && (
          <TouchableOpacity
            onPress={onPressFriends}
            activeOpacity={0.75}
            accessibilityLabel="Social & Friends"
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Image
              source={HEADER_ICONS.friends}
              style={styles.headerIconImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        {onPressThemes && (
          <TouchableOpacity
            onPress={onPressThemes}
            activeOpacity={0.75}
            accessibilityLabel="Theme Studio"
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="palette" size={17} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        {handleSettingsPress && (
          <TouchableOpacity
            onPress={handleSettingsPress}
            activeOpacity={0.75}
            accessibilityLabel="Platform Settings"
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Image
              source={HEADER_ICONS.settings}
              style={styles.headerIconImg}
              resizeMode="contain"
            />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerIconImg: {
    width: 24,
    height: 24,
  },
});
