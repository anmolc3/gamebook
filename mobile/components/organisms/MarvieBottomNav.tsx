import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

export type NavTab = 'home' | 'games' | 'play' | 'chatList' | 'friends' | 'profile';

interface MarvieBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadMessagesCount?: number;
  pendingRequestsCount?: number;
}

// Custom SVG asset icons per tab
const NAV_IMAGES: Partial<Record<NavTab, ReturnType<typeof require>>> = {
  chatList: require('../../assets/images/chat_icon_logo.svg'),
  friends:  require('../../assets/images/controller_friends_theme.svg'),
  profile:  require('../../assets/images/profile_icon_logo.svg'),
  play:     require('../../assets/images/game_joystick_icon.svg'),
};

export const MarvieBottomNav: React.FC<MarvieBottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadMessagesCount = 0,
  pendingRequestsCount = 0,
}) => {
  const { theme } = useTheme();

  interface TabItem {
    id: NavTab;
    label: string;
    icon: IconName;
    badgeCount?: number;
    isCenterAction?: boolean;
  }

  const tabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'friends', label: 'Social', icon: 'users', badgeCount: pendingRequestsCount },
    { id: 'play', label: 'Play', icon: 'gamepad', isCenterAction: true },
    { id: 'chatList', label: 'Chat', icon: 'chat', badgeCount: unreadMessagesCount },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ];

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        theme.shadows.elevated,
      ]}
    >
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const customImg = NAV_IMAGES[tab.id];

          if (tab.isCenterAction) {
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onSelectTab(tab.id)}
                activeOpacity={0.85}
                style={[
                  styles.centerBtnWrapper,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surface,
                  },
                  theme.shadows.soft,
                ]}
                accessibilityLabel="Quick Play or Join Room"
              >
                {customImg ? (
                  <Image
                    source={customImg}
                    style={styles.centerNavImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    name={tab.icon}
                    size={24}
                    color={theme.colors.textOnPrimary}
                    strokeWidth={2.4}
                  />
                )}
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.75}
              style={styles.tabButton}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconWrapper}>
                {customImg ? (
                  <Image
                    source={customImg}
                    style={[
                      styles.navImage,
                      { opacity: isActive ? 1 : 0.55 },
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    name={tab.icon}
                    size={22}
                    color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                )}

                {/* Badge Pill */}
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <View
                    style={[
                      styles.badgeDot,
                      { backgroundColor: theme.colors.accentCoral },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>

              {/* Active Indicator Dot */}
              {isActive && (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    height: Platform.OS === 'ios' ? 84 : 70,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingHorizontal: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerBtnWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    overflow: 'hidden',
  },
  centerNavImage: {
    width: 36,
    height: 36,
  },
  navImage: {
    width: 28,
    height: 28,
  },
});
