import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';

export type NavTab = 'home' | 'games' | 'play' | 'chatList' | 'friends' | 'profile';

interface MarvieBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadMessagesCount?: number;
  pendingRequestsCount?: number;
}

// Custom WebP asset icons per tab (natively supported by React Native Image)
const NAV_IMAGES: Partial<Record<NavTab, ReturnType<typeof require>>> = {
  chatList: require('../../assets/images/chat_icon_logo.webp'),
  friends:  require('../../assets/images/social_icon_logo.webp'),
  profile:  require('../../assets/images/profile_icon_logo.webp'),
  play:     require('../../assets/images/controller_friends_theme.webp'),
};

export const MarvieBottomNav: React.FC<MarvieBottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadMessagesCount = 0,
  pendingRequestsCount = 0,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Balanced modern dynamic bottom padding and height
  const bottomInset = insets.bottom > 0 ? Math.min(insets.bottom, 16) : (Platform.OS === 'ios' ? 10 : 8);
  const navHeight = 54 + bottomInset;

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
          height: navHeight,
          paddingBottom: bottomInset,
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
                    size={20}
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
                    style={styles.navImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    name={tab.icon}
                    size={22}
                    color={isActive ? theme.colors.primary : theme.colors.textPrimary}
                    strokeWidth={2.2}
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingTop: 4,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 50,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingVertical: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerBtnWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    overflow: 'hidden',
  },
  centerNavImage: {
    width: 28,
    height: 28,
  },
  navImage: {
    width: 25,
    height: 25,
  },
});
