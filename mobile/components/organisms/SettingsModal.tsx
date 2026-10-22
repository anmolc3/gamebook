import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme, AppearanceMode } from '../../theme';
import { THEME_METADATA } from '../../theme/themes';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { ProfileService } from '../../services/profile.service';
import { MobileSocketService } from '../../services/socket.service';
import { FriendsService, BlockedPlayer } from '../../services/friends.service';
import { ChatService, ConversationItem } from '../../services/chat.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SettingsPage =
  | 'root'
  | 'account'
  | 'privacy'
  | 'blocked_users'
  | 'locked_chats'
  | 'notifications'
  | 'chat'
  | 'groups'
  | 'gaming'
  | 'appearance'
  | 'storage'
  | 'help';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onPressNotifications?: () => void;
  onPressOpenThemesPage?: () => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  initialPage?: SettingsPage;
}

interface SelectionOption {
  label: string;
  value: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onPressNotifications,
  onPressOpenThemesPage,
  onNavigateToChat,
  initialPage = 'root',
}) => {
  const { theme, themeId, appearanceMode, setThemeId, setAppearanceMode } = useTheme();
  const { user, logout } = useAuth();
  const isDark = theme.mode === 'dark';
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const iconColor = isDark ? '#94A3B8' : '#64748B';
  const chevronColor = isDark ? '#556275' : '#94A3B8';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#FFFFFF' : theme.colors.textPrimary;
  const descColor = isDark ? '#7E8B9B' : theme.colors.textSecondary;
  const labelColor = isDark ? '#6A788A' : theme.colors.textMuted;
  const bgColor = isDark ? '#000000' : theme.colors.background;
  const cardBg = isDark ? 'rgba(235, 115, 34, 0.12)' : 'rgba(235, 115, 34, 0.08)';
  const cardBorder = isDark ? 'rgba(235, 115, 34, 0.32)' : 'rgba(235, 115, 34, 0.22)';
  const pickerSheetBg = isDark ? '#121620' : '#FFFFFF';
  const pickerBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  const [activePage, setActivePage] = useState<SettingsPage>(initialPage);

  // Selection Modal state for dropdown options
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerOptions, setPickerOptions] = useState<SelectionOption[]>([]);
  const [pickerCurrentValue, setPickerCurrentValue] = useState('');
  const [onSelectOption, setOnSelectOption] = useState<(val: string) => void>(() => () => {});

  // Profile & Privacy states
  const [onlinePrivacy, setOnlinePrivacy] = useState<'EVERYONE' | 'MY_FRIENDS' | 'NOBODY'>('EVERYONE');
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'EVERYONE' | 'MY_FRIENDS' | 'NOBODY'>('EVERYONE');
  const [groupAddPrivacy, setGroupAddPrivacy] = useState<'EVERYONE' | 'MY_FRIENDS' | 'NOBODY'>('EVERYONE');
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<string>('Everyone');
  const [aboutPrivacy, setAboutPrivacy] = useState<string>('Everyone');
  const [statusPrivacy, setStatusPrivacy] = useState<string>('My Contacts');
  const [readReceipts, setReadReceipts] = useState<boolean>(true);
  const [typingIndicators, setTypingIndicators] = useState<boolean>(true);
  const [disappearingMessages, setDisappearingMessages] = useState<string>('Off');
  const [whoCanCallMe, setWhoCanCallMe] = useState<string>('Everyone');
  const [whoCanVideoCallMe, setWhoCanVideoCallMe] = useState<string>('Everyone');

  // Notifications states
  const [doNotDisturb, setDoNotDisturb] = useState<boolean>(false);
  const [quietHours, setQuietHours] = useState<boolean>(false);
  const [messageNotifications, setMessageNotifications] = useState<boolean>(true);
  const [groupNotifications, setGroupNotifications] = useState<boolean>(true);
  const [mentionsAlert, setMentionsAlert] = useState<boolean>(true);
  const [reactionNotifications, setReactionNotifications] = useState<boolean>(true);
  const [showMessagePreview, setShowMessagePreview] = useState<boolean>(true);
  const [notificationSound, setNotificationSound] = useState<string>('Default');
  const [messageVibration, setMessageVibration] = useState<boolean>(true);
  const [incomingCallNotifications, setIncomingCallNotifications] = useState<boolean>(true);
  const [missedCallNotifications, setMissedCallNotifications] = useState<boolean>(true);
  const [ringtone, setRingtone] = useState<string>('Default');
  const [callVibration, setCallVibration] = useState<boolean>(true);

  // Gaming & Gameplay preferences
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
  const [autoRematchOffers, setAutoRematchOffers] = useState<boolean>(true);
  const [showOnlinePresence, setShowOnlinePresence] = useState<boolean>(true);
  const [allowGameChallenges, setAllowGameChallenges] = useState<boolean>(true);

  // Chat settings
  const [enterIsSend, setEnterIsSend] = useState<boolean>(false);
  const [mediaAutoDownload, setMediaAutoDownload] = useState<boolean>(true);

  // Password modal
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState<boolean>(false);
  const [isDeleteAccountVisible, setIsDeleteAccountVisible] = useState<boolean>(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<BlockedPlayer[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState<boolean>(false);

  const loadBlockedUsers = async () => {
    try {
      setIsLoadingBlocked(true);
      const data = await FriendsService.fetchBlocked();
      setBlockedUsers(data);
    } catch (err: any) {
      console.warn('Failed to fetch blocked users:', err);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const handleUnblockUser = (u: BlockedPlayer) => {
    Alert.alert(
      `Unblock ${u.displayName}?`,
      `They will be able to send you messages and invite you to games.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await FriendsService.unblockUser(u.id);
              setBlockedUsers((prev) => prev.filter((b) => b.id !== u.id));
              Alert.alert('Unblocked', `${u.displayName} has been unblocked.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  // Locked chats
  const [lockedConvIds, setLockedConvIds] = useState<string[]>([]);
  const [lockedConversations, setLockedConversations] = useState<ConversationItem[]>([]);
  const [isLoadingLockedChats, setIsLoadingLockedChats] = useState<boolean>(false);

  const loadLockedChats = async () => {
    try {
      setIsLoadingLockedChats(true);
      const stored = await AsyncStorage.getItem('@gameapp:locked_convs');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setLockedConvIds(ids);

      if (ids.length > 0) {
        const allConvs = await ChatService.fetchConversations().catch(() => []);
        const filtered = allConvs.filter((c) => ids.includes(c.id));
        setLockedConversations(filtered);
      } else {
        setLockedConversations([]);
      }
    } catch (err) {
      console.warn('Failed to load locked chats:', err);
    } finally {
      setIsLoadingLockedChats(false);
    }
  };

  const handleUnlockChat = (convId: string, chatTitle: string) => {
    Alert.alert(
      `Unlock ${chatTitle}?`,
      `This conversation will be unhidden and will appear again in your main chat list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          style: 'default',
          onPress: async () => {
            try {
              const updated = lockedConvIds.filter((id) => id !== convId);
              setLockedConvIds(updated);
              setLockedConversations((prev) => prev.filter((c) => c.id !== convId));
              await AsyncStorage.setItem('@gameapp:locked_convs', JSON.stringify(updated));
              Alert.alert('Unlocked', `${chatTitle} has been unlocked.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to unlock chat');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (visible) {
      setActivePage(initialPage || 'root');
      loadLockedChats();
      ProfileService.fetchMyProfile()
        .then((p) => {
          if (p.readReceipts !== undefined) setReadReceipts(p.readReceipts);
          if (p.onlinePrivacy) setOnlinePrivacy(p.onlinePrivacy as any);
          if (p.lastSeenPrivacy) setLastSeenPrivacy(p.lastSeenPrivacy as any);
          if (p.groupAddPrivacy) setGroupAddPrivacy(p.groupAddPrivacy as any);
        })
        .catch(() => null);
    }
  }, [visible, initialPage]);

  const handleToggleReadReceipts = async (value: boolean) => {
    setReadReceipts(value);
    try {
      await ProfileService.updateMyProfile({ readReceipts: value });
    } catch (err) {
      console.warn('Failed to save read receipts:', err);
    }
  };

  const handleUpdatePrivacy = async (
    key: 'onlinePrivacy' | 'lastSeenPrivacy' | 'groupAddPrivacy',
    value: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY'
  ) => {
    if (key === 'onlinePrivacy') setOnlinePrivacy(value);
    if (key === 'lastSeenPrivacy') setLastSeenPrivacy(value);
    if (key === 'groupAddPrivacy') setGroupAddPrivacy(value);
    try {
      await ProfileService.updateMyProfile({ [key]: value });
      if (key !== 'groupAddPrivacy') {
        MobileSocketService.notifyPresencePrivacyUpdate();
      }
    } catch (err) {
      console.warn('Failed to save privacy update:', err);
    }
  };

  const openPicker = (
    title: string,
    currentValue: string,
    options: SelectionOption[],
    onSelect: (val: string) => void
  ) => {
    setPickerTitle(title);
    setPickerCurrentValue(currentValue);
    setPickerOptions(options);
    setOnSelectOption(() => (val: string) => {
      onSelect(val);
      setPickerVisible(false);
    });
    setPickerVisible(true);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            onClose();
            logout();
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (visible) {
      setActivePage(initialPage || 'root');
    }
  }, [visible, initialPage]);

  const handleBack = () => {
    if (pickerVisible) {
      setPickerVisible(false);
      return;
    }
    if (isForgotPasswordVisible) {
      setIsForgotPasswordVisible(false);
      return;
    }
    if (activePage === 'blocked_users' || activePage === 'locked_chats') {
      setActivePage('privacy');
    } else if (activePage !== 'root' && initialPage === 'root') {
      setActivePage('root');
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [visible, activePage, pickerVisible, isForgotPasswordVisible, initialPage]);

  const formatPrivacyLabel = (key: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY') => {
    if (key === 'EVERYONE') return 'Everyone';
    if (key === 'MY_FRIENDS') return 'My Contacts';
    return 'Nobody';
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleBack}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* =========================================================================
                HEADER BAR WITH GAMING DOODLE WATERMARKS
               ========================================================================= */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Back"
              >
                <Icon name="chevronLeft" size={24} color={textColor} strokeWidth={2.5} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: textColor }]}>
                {activePage === 'root' && 'Settings'}
                {activePage === 'privacy' && 'Privacy & Security'}
                {activePage === 'blocked_users' && 'Blocked Users'}
                {activePage === 'locked_chats' && 'Locked Chats'}
                {activePage === 'notifications' && 'Notifications'}
                {activePage === 'account' && 'Account'}
                {activePage === 'chat' && 'Chat'}
                {activePage === 'groups' && 'Groups'}
                {activePage === 'gaming' && 'Gaming'}
                {activePage === 'appearance' && 'Appearance'}
                {activePage === 'storage' && 'Storage and Data'}
                {activePage === 'help' && 'Help & Support'}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* =========================================================================
                  ROOT PAGE (SCREEN 1)
                 ========================================================================= */}
              {activePage === 'root' && (
                <>
                  {/* USER PROFILE CARD WITH COPPER GRADIENT & DECORATIVE GRAPHIC */}
                  <TouchableOpacity
                    style={[styles.profileCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    activeOpacity={0.82}
                    onPress={() => setActivePage('account')}
                  >
                    {/* Otter Mascot Golden SVG Watermark */}
                    <View style={styles.cardGraphicWrap} pointerEvents="none">
                      <Svg width={76} height={76} viewBox="0 0 100 100">
                        <G fill="none" stroke="#A87532" strokeLinecap="round" strokeLinejoin="round" opacity={0.22}>
                          {/* Left ear */}
                          <Path d="M 33 24 C 28 17 21 21 22 29 C 22.5 32 24.5 34 26 35.5" strokeWidth={2.2} />
                          <Path d="M 25 24.5 C 23.5 22.5 20.5 24.5 21.5 27.5" strokeWidth={1.5} opacity={0.7} />
                          
                          {/* Right ear */}
                          <Path d="M 67 24 C 72 17 79 21 78 29 C 77.5 32 75.5 34 74 35.5" strokeWidth={2.2} />
                          <Path d="M 75 24.5 C 76.5 22.5 79.5 24.5 78.5 27.5" strokeWidth={1.5} opacity={0.7} />

                          {/* Top of head connecting ears */}
                          <Path d="M 33 24 C 41 18 59 18 67 24" strokeWidth={2.2} />

                          {/* Cheeks and chin contour */}
                          <Path d="M 26 35.5 C 22 41 24 49 28 55 C 33 62 43 65 50 65 C 57 65 67 62 72 55 C 76 49 78 41 74 35.5" strokeWidth={2.2} />

                          {/* Muzzle / Cream Mask Boundary */}
                          <Path d="M 34 38 C 30 42 31 51 38 54 C 44 56.5 56 56.5 62 54 C 69 51 70 42 66 38" strokeWidth={1.5} opacity={0.65} />

                          {/* Joyful Happy Eyes (Mascot's signature smile curves) */}
                          <Path d="M 34 35 C 36 30 42 30 44 35" strokeWidth={2.4} />
                          <Path d="M 56 35 C 58 30 64 30 66 35" strokeWidth={2.4} />

                          {/* Cute Button Nose */}
                          <Path d="M 46 41 C 47.5 39 52.5 39 54 41 C 54.5 43.5 51 45.5 50 45.5 C 49 45.5 45.5 43.5 46 41 Z" fill="#A87532" fillOpacity={0.35} strokeWidth={1.8} />

                          {/* Muzzle Whiskers Pad / Smile */}
                          <Path d="M 50 45.5 L 50 48" strokeWidth={1.8} />
                          <Path d="M 50 48 C 47 48 43 48.5 41 46.5" strokeWidth={2} />
                          <Path d="M 50 48 C 53 48 57 48.5 59 46.5" strokeWidth={2} />
                          {/* Happy open mouth curve */}
                          <Path d="M 45 49 C 47 53.5 53 53.5 55 49" strokeWidth={1.8} fill="#A87532" fillOpacity={0.25} />

                          {/* Delicate Whiskers */}
                          <Path d="M 29 45 L 21 44" strokeWidth={1.4} opacity={0.6} />
                          <Path d="M 30 49 L 23 50" strokeWidth={1.4} opacity={0.6} />
                          <Path d="M 71 45 L 79 44" strokeWidth={1.4} opacity={0.6} />
                          <Path d="M 70 49 L 77 50" strokeWidth={1.4} opacity={0.6} />

                          {/* Wave Ripples beneath (water theme reference) */}
                          <Path d="M 16 73 C 27 67 36 75 48 70 C 58 66 69 74 84 69" strokeWidth={2} />
                          <Path d="M 28 80 C 37 76 44 82 54 78 C 63 75 70 81 76 78" strokeWidth={1.5} opacity={0.75} />
                          <Path d="M 40 86 C 46 83 50 87 56 84 C 61 82 65 86 68 85" strokeWidth={1.2} opacity={0.5} />

                          {/* Subtle water bubbles / twinkles */}
                          <Circle cx={81} cy={33} r={2} strokeWidth={1.2} opacity={0.6} />
                          <Circle cx={85} cy={27} r={1.2} strokeWidth={1} opacity={0.45} />
                        </G>
                      </Svg>
                    </View>

                    <View style={styles.avatarWrap}>
                      <Avatar
                        displayName={user?.displayName || 'Player'}
                        avatarUrl={user?.avatarUrl}
                        size="lg"
                      />
                      <View style={styles.onlineBadgeDot} />
                    </View>

                    <View style={styles.profileMeta}>
                      <Text style={[styles.profileDisplayName, { color: textColor }]} numberOfLines={1}>
                        {user?.displayName || 'Anirudh Sharma'}
                      </Text>
                      <Text style={styles.profileUsername} numberOfLines={1}>
                        @{user?.username || 'anirudh.sharma'}
                      </Text>
                    </View>

                    <Icon name="chevronRight" size={20} color="#D8893F" strokeWidth={2.5} />
                  </TouchableOpacity>

                  {/* 9 MAIN SETTINGS NAVIGATION ROWS */}
                  <View style={styles.menuList}>
                    {/* 1. Account */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('account')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="user" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Account</Text>
                        <Text style={styles.menuRowDesc}>Profile, email, phone, password</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 2. Privacy & Security */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('privacy')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="shield" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Privacy & Security</Text>
                        <Text style={styles.menuRowDesc}>Last seen, read receipts, blocked users</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 3. Notifications */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('notifications')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="bell" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Notifications</Text>
                        <Text style={styles.menuRowDesc}>Messages, calls, groups, sounds</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 4. Chat */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('chat')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="chat" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Chat</Text>
                        <Text style={styles.menuRowDesc}>Theme, wallpapers, media</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 5. Groups */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('groups')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="users" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Groups</Text>
                        <Text style={styles.menuRowDesc}>Manage groups, permissions</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 6. Gaming */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('gaming')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="gamepad" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Gaming</Text>
                        <Text style={styles.menuRowDesc}>Game preferences, in-game settings</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 7. Appearance */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('appearance')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="palette" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Appearance</Text>
                        <Text style={styles.menuRowDesc}>Theme, language, font size</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 8. Storage and Data */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('storage')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="archive" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Storage and Data</Text>
                        <Text style={styles.menuRowDesc}>Manage storage, auto-download</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>

                    {/* 9. Help & Support */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('help')}
                    >
                      <View style={styles.squircleIcon}>
                        <Icon name="award" size={25} color={iconColor} strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Help & Support</Text>
                        <Text style={styles.menuRowDesc}>FAQ, contact us, app info</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={chevronColor} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* =========================================================================
                  PAGE 2: PRIVACY & SECURITY (SCREEN 2)
                 ========================================================================= */}
              {activePage === 'privacy' && (
                <View style={styles.subPageContainer}>
                  {/* GROUP 1: PROFILE PRIVACY */}
                  <Text style={styles.sectionHeaderLabel}>PROFILE PRIVACY</Text>

                  {/* Last Seen */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can See My Last Seen',
                        formatPrivacyLabel(lastSeenPrivacy),
                        [
                          { label: 'Everyone', value: 'EVERYONE' },
                          { label: 'My Contacts', value: 'MY_FRIENDS' },
                          { label: 'Nobody', value: 'NOBODY' },
                        ],
                        (val) => handleUpdatePrivacy('lastSeenPrivacy', val as any)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="eye" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Last Seen</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{formatPrivacyLabel(lastSeenPrivacy)}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* Profile Photo */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can See My Profile Photo',
                        profilePhotoPrivacy,
                        [
                          { label: 'Everyone', value: 'Everyone' },
                          { label: 'My Contacts', value: 'My Contacts' },
                          { label: 'Nobody', value: 'Nobody' },
                        ],
                        (val) => setProfilePhotoPrivacy(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="image" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Profile Photo</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{profilePhotoPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* About */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can See About Info',
                        aboutPrivacy,
                        [
                          { label: 'Everyone', value: 'Everyone' },
                          { label: 'My Contacts', value: 'My Contacts' },
                          { label: 'Nobody', value: 'Nobody' },
                        ],
                        (val) => setAboutPrivacy(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="info" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>About</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{aboutPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* Status */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can See My Status',
                        statusPrivacy,
                        [
                          { label: 'Everyone', value: 'Everyone' },
                          { label: 'My Contacts', value: 'My Contacts' },
                          { label: 'Nobody', value: 'Nobody' },
                        ],
                        (val) => setStatusPrivacy(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="users" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Status</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{statusPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP 2: MESSAGING PRIVACY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>MESSAGING PRIVACY</Text>

                  {/* Read Receipts (Blue Ticks) */}
                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="doubleCheck" size={24} color={iconColor} strokeWidth={2.4} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Read Receipts (Blue Ticks)</Text>
                      <Text style={styles.subRowDesc}>Show blue ticks when you read messages</Text>
                    </View>
                    <Switch
                      value={readReceipts}
                      onValueChange={handleToggleReadReceipts}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Typing Indicators */}
                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="chat" size={24} color={iconColor} strokeWidth={2.4} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Typing Indicators</Text>
                      <Text style={styles.subRowDesc}>Show when you're typing</Text>
                    </View>
                    <Switch
                      value={typingIndicators}
                      onValueChange={setTypingIndicators}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Disappearing Messages */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Disappearing Messages Timer',
                        disappearingMessages,
                        [
                          { label: 'Off', value: 'Off' },
                          { label: '24 Hours', value: '24 Hours' },
                          { label: '7 Days', value: '7 Days' },
                          { label: '90 Days', value: '90 Days' },
                        ],
                        (val) => setDisappearingMessages(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="clock" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Disappearing Messages</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{disappearingMessages}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP PRIVACY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>GROUPS PRIVACY</Text>

                  {/* Who Can Add Me to Groups */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can Add Me to Groups',
                        formatPrivacyLabel(groupAddPrivacy),
                        [
                          { label: 'Everyone', value: 'EVERYONE' },
                          { label: 'My Contacts', value: 'MY_FRIENDS' },
                          { label: 'Nobody', value: 'NOBODY' },
                        ],
                        (val) => handleUpdatePrivacy('groupAddPrivacy', val as any)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="users" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Who Can Add Me to Groups</Text>
                      <Text style={styles.subRowDesc}>Control who can add you to group chats</Text>
                    </View>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{formatPrivacyLabel(groupAddPrivacy)}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP 3: CALL PRIVACY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>CALL PRIVACY</Text>

                  {/* Who Can Call Me */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can Call Me',
                        whoCanCallMe,
                        [
                          { label: 'Everyone', value: 'Everyone' },
                          { label: 'My Contacts', value: 'My Contacts' },
                          { label: 'Nobody', value: 'Nobody' },
                        ],
                        (val) => setWhoCanCallMe(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="volume" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Who Can Call Me</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{whoCanCallMe}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* Who Can Video Call Me */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can Video Call Me',
                        whoCanVideoCallMe,
                        [
                          { label: 'Everyone', value: 'Everyone' },
                          { label: 'My Contacts', value: 'My Contacts' },
                          { label: 'Nobody', value: 'Nobody' },
                        ],
                        (val) => setWhoCanVideoCallMe(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="videoCall" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Who Can Video Call Me</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{whoCanVideoCallMe}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP 4: SAFETY & PRIVACY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>SAFETY & CHAT LOCK</Text>

                  {/* Locked Chats */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => {
                      loadLockedChats();
                      setActivePage('locked_chats');
                    }}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="lock" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Locked Chats</Text>
                    <View style={styles.subRowRight}>
                      {lockedConvIds.length > 0 && (
                        <Text style={[styles.subRowValue, { color: '#FFA726', fontWeight: '700' }]}>
                          {lockedConvIds.length}
                        </Text>
                      )}
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => {
                      loadBlockedUsers();
                      setActivePage('blocked_users');
                    }}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="ban" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Blocked Users</Text>
                    <View style={styles.subRowRight}>
                      {blockedUsers.length > 0 && (
                        <Text style={styles.subRowValue}>{blockedUsers.length}</Text>
                      )}
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Report a User', 'To report player violations, contact support or use in-chat report.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="shield" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Report a User</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>

                  {/* Password & Reset */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => setIsForgotPasswordVisible(true)}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="lock" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Password & Reset</Text>
                      <Text style={styles.subRowDesc}>Change or reset your password</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => setIsDeleteAccountVisible(true)}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                      <Icon name="trash" size={22} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={[styles.subRowTitle, { color: '#EF4444', fontWeight: '700' }]}>Delete Account & Data</Text>
                      <Text style={styles.subRowDesc}>Permanently erase personal data & history</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* =========================================================================
                  PAGE: BLOCKED USERS
                 ========================================================================= */}
              {activePage === 'blocked_users' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>BLOCKED PLAYERS ({blockedUsers.length})</Text>
                  <Text style={{ fontSize: 13, color: '#8A99AD', marginBottom: 16, lineHeight: 18 }}>
                    Blocked players cannot message you, call you, or challenge you to games. Unblocking them restores standard interaction.
                  </Text>

                  {isLoadingBlocked ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#F58220" />
                      <Text style={{ color: '#8A99AD', fontSize: 13, marginTop: 10 }}>Loading blocked players...</Text>
                    </View>
                  ) : blockedUsers.length === 0 ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A2130', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Icon name="ban" size={32} color="#556275" />
                      </View>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                        No Blocked Users
                      </Text>
                      <Text style={{ color: '#8A99AD', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
                        You haven't blocked anyone yet. Players you block will appear here.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {blockedUsers.map((item) => (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? '#131926' : '#F1F5F9', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isDark ? '#1F293D' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 }}>
                            <Avatar
                              displayName={item.displayName}
                              avatarUrl={item.avatarUrl}
                              size="md"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                                {item.displayName}
                              </Text>
                              <Text style={{ color: '#8A99AD', fontSize: 12 }} numberOfLines={1}>
                                @{item.username}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleUnblockUser(item)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              borderRadius: 20,
                              backgroundColor: '#EF444420',
                              borderWidth: 1,
                              borderColor: '#EF444450',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>
                              Unblock
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* =========================================================================
                  PAGE: LOCKED CHATS
                 ========================================================================= */}
              {activePage === 'locked_chats' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>LOCKED CHATS ({lockedConvIds.length})</Text>
                  <Text style={{ fontSize: 13, color: '#8A99AD', marginBottom: 16, lineHeight: 18 }}>
                    Locked chats are hidden from your conversation list. You can open or unlock them here.
                  </Text>

                  {isLoadingLockedChats ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#F58220" />
                      <Text style={{ color: '#8A99AD', fontSize: 13, marginTop: 10 }}>Loading locked chats...</Text>
                    </View>
                  ) : lockedConversations.length === 0 ? (
                    <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A2130', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Icon name="lock" size={32} color="#556275" />
                      </View>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                        No Locked Chats
                      </Text>
                      <Text style={{ color: '#8A99AD', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
                        You haven't locked any chats yet. Lock a chat from its 3-dot privacy menu to hide it from your chats list.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {lockedConversations.map((item) => {
                        const title = item.isGroup ? (item.group?.title || 'Group') : (item.peer?.displayName || 'Player');
                        const subtitle = item.isGroup ? `${item.group?.memberCount || 0} members` : `@${item.peer?.username || 'player'}`;
                        const avatarUrl = item.isGroup ? item.group?.avatarUrl : item.peer?.avatarUrl;

                        return (
                          <View
                            key={item.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isDark ? '#131926' : '#F1F5F9', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isDark ? '#1F293D' : '#E2E8F0',
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                if (onNavigateToChat && item.peer) {
                                  onClose();
                                  onNavigateToChat(item.peer.id, item.peer.username);
                                }
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 }}
                              activeOpacity={0.7}
                            >
                              <Avatar
                                displayName={title}
                                avatarUrl={avatarUrl}
                                size="md"
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                                  {title}
                                </Text>
                                <Text style={{ color: '#8A99AD', fontSize: 12 }} numberOfLines={1}>
                                  {subtitle}
                                </Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleUnlockChat(item.id, title)}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                                borderRadius: 20,
                                backgroundColor: '#FFA72620',
                                borderWidth: 1,
                                borderColor: '#FFA72650',
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={{ color: '#FFA726', fontSize: 13, fontWeight: '700' }}>
                                Unlock
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* =========================================================================
                  PAGE 3: NOTIFICATIONS (SCREEN 3)
                 ========================================================================= */}
              {activePage === 'notifications' && (
                <View style={styles.subPageContainer}>
                  {/* GROUP 1: GENERAL */}
                  <Text style={styles.sectionHeaderLabel}>GENERAL</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="bell" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Do Not Disturb</Text>
                      <Text style={styles.subRowDesc}>Mute all notifications</Text>
                    </View>
                    <Switch
                      value={doNotDisturb}
                      onValueChange={setDoNotDisturb}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="clock" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Quiet Hours</Text>
                      <Text style={styles.subRowDesc}>10:00 PM - 7:00 AM</Text>
                    </View>
                    <Switch
                      value={quietHours}
                      onValueChange={setQuietHours}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* GROUP 2: MESSAGES */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>MESSAGES</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="chat" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Message Notifications</Text>
                    <Switch
                      value={messageNotifications}
                      onValueChange={setMessageNotifications}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="users" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Group Notifications</Text>
                    <Switch
                      value={groupNotifications}
                      onValueChange={setGroupNotifications}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="atSign" size={24} color={iconColor} strokeWidth={2.2} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Mentions</Text>
                      <Text style={styles.subRowDesc}>Notify when you are mentioned</Text>
                    </View>
                    <Switch
                      value={mentionsAlert}
                      onValueChange={setMentionsAlert}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="heart" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Reaction Notifications</Text>
                      <Text style={styles.subRowDesc}>Notify for message reactions</Text>
                    </View>
                    <Switch
                      value={reactionNotifications}
                      onValueChange={setReactionNotifications}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="eye" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Show Message Preview</Text>
                    <Switch
                      value={showMessagePreview}
                      onValueChange={setShowMessagePreview}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Notification Sound',
                        notificationSound,
                        [
                          { label: 'Default', value: 'Default' },
                          { label: 'Chime', value: 'Chime' },
                          { label: 'Bell', value: 'Bell' },
                          { label: 'Harp', value: 'Harp' },
                        ],
                        (val) => setNotificationSound(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="volume" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Notification Sound</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{notificationSound}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="target" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Vibration</Text>
                    <Switch
                      value={messageVibration}
                      onValueChange={setMessageVibration}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* GROUP 3: CALLS */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>CALLS</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="volume" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Incoming Call Notifications</Text>
                    <Switch
                      value={incomingCallNotifications}
                      onValueChange={setIncomingCallNotifications}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="missedCall" size={24} color={iconColor} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.subRowTitle}>Missed Call Notifications</Text>
                    <Switch
                      value={missedCallNotifications}
                      onValueChange={setMissedCallNotifications}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Ringtone',
                        ringtone,
                        [
                          { label: 'Default', value: 'Default' },
                          { label: 'Guitar', value: 'Guitar' },
                          { label: 'Electronic', value: 'Electronic' },
                          { label: 'Classic', value: 'Classic' },
                        ],
                        (val) => setRingtone(val)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="volume" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Ringtone</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{ringtone}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="target" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Vibration</Text>
                    <Switch
                      value={callVibration}
                      onValueChange={setCallVibration}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              )}

              {/* =========================================================================
                  PAGE 4: ACCOUNT
                 ========================================================================= */}
              {activePage === 'account' && (
                <View style={styles.subPageContainer}>
                  <View style={styles.accountHeaderBox}>
                    <Avatar
                      displayName={user?.displayName || 'Player'}
                      avatarUrl={user?.avatarUrl}
                      size="xl"
                    />
                    <Text style={styles.accountNameBig}>{user?.displayName || 'Anirudh Sharma'}</Text>
                    <Text style={styles.accountUserHandle}>@{user?.username || 'anirudh.sharma'}</Text>
                    {user?.email && <Text style={styles.accountEmailText}>{user.email}</Text>}
                  </View>

                  <Text style={[styles.sectionHeaderLabel, { marginTop: 20 }]}>SECURITY & LOGIN</Text>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => setIsForgotPasswordVisible(true)}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="lock" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Change Password</Text>
                      <Text style={styles.subRowDesc}>Update via email verification code</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>

                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>PLATFORM VERIFICATION</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="shield" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Verified Gaming Platform</Text>
                      <Text style={styles.subRowDesc}>Zero real money stakes • Safe community</Text>
                    </View>
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="info" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>App Version</Text>
                      <Text style={styles.subRowDesc}>v1.19.0 (Stable Release)</Text>
                    </View>
                  </View>

                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>SESSION</Text>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={handleSignOut}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="logOut" size={24} color={iconColor} />
                    </View>
                    <Text style={[styles.subRowTitle, { color: '#FF4B4B' }]}>Sign Out of Account</Text>
                  </TouchableOpacity>

                  {/* DANGER ZONE: ACCOUNT DELETION */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26, color: '#EF4444' }]}>DANGER ZONE</Text>

                  <TouchableOpacity
                    style={[styles.subRow, { borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)' }]}
                    activeOpacity={0.65}
                    onPress={() => setIsDeleteAccountVisible(true)}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                      <Icon name="trash" size={22} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={[styles.subRowTitle, { color: '#EF4444', fontWeight: '800' }]}>Delete Account</Text>
                      <Text style={styles.subRowDesc}>Permanently delete account, personal records & data</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* =========================================================================
                  PAGE 5: GAMING
                 ========================================================================= */}
              {activePage === 'gaming' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>GAMEPLAY PREFERENCES</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="volume" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Game Sound Effects</Text>
                      <Text style={styles.subRowDesc}>Board move, dice roll & win sounds</Text>
                    </View>
                    <Switch
                      value={soundEffects}
                      onValueChange={setSoundEffects}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="target" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Haptic Feedback</Text>
                      <Text style={styles.subRowDesc}>Tactile vibration on turn timers & moves</Text>
                    </View>
                    <Switch
                      value={hapticFeedback}
                      onValueChange={setHapticFeedback}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="refresh" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Instant Rematch Offers</Text>
                      <Text style={styles.subRowDesc}>Quick rematch banner on game completion</Text>
                    </View>
                    <Switch
                      value={autoRematchOffers}
                      onValueChange={setAutoRematchOffers}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="gamepad" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>In-Game Direct Challenges</Text>
                      <Text style={styles.subRowDesc}>Receive live invitations in chat</Text>
                    </View>
                    <Switch
                      value={allowGameChallenges}
                      onValueChange={setAllowGameChallenges}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="eye" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Online Presence Broadcast</Text>
                      <Text style={styles.subRowDesc}>Broadcast playing status to friends</Text>
                    </View>
                    <Switch
                      value={showOnlinePresence}
                      onValueChange={setShowOnlinePresence}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              )}

              {/* =========================================================================
                  PAGE 6: APPEARANCE
                 ========================================================================= */}
              {activePage === 'appearance' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>DISPLAY MODE</Text>

                  {[
                    { mode: 'system' as AppearanceMode, label: 'System Default', icon: 'palette' as const },
                    { mode: 'light' as AppearanceMode, label: 'Light Mode', icon: 'sun' as const },
                    { mode: 'dark' as AppearanceMode, label: 'Dark Mode', icon: 'moon' as const },
                  ].map((opt) => {
                    const isSelected = appearanceMode === opt.mode;
                    return (
                      <TouchableOpacity
                        key={opt.mode}
                        style={styles.subRow}
                        activeOpacity={0.65}
                        onPress={() => setAppearanceMode(opt.mode)}
                      >
                        <View style={styles.squircleIcon}>
                      <Icon name={opt.icon} size={24} color={iconColor} />
                    </View>
                        <Text style={[styles.subRowTitle, isSelected && { color: '#F58220', fontWeight: '700' }]}>
                          {opt.label}
                        </Text>
                        {isSelected && <Icon name="check" size={18} color="#F58220" strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}

                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>COLOR PALETTES</Text>

                  {THEME_METADATA.map((item) => {
                    const isSelected = themeId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.subRow}
                        activeOpacity={0.65}
                        onPress={() => setThemeId(item.id)}
                      >
                        <View style={styles.paletteCircleWrap}>
                          <View style={[styles.colorCircle, { backgroundColor: item.previewColor }]} />
                          <View style={[styles.colorCircle, { backgroundColor: item.accentColor, marginLeft: -8 }]} />
                        </View>
                        <View style={styles.subRowTextCol}>
                          <Text style={[styles.subRowTitle, isSelected && { color: '#F58220', fontWeight: '700' }]}>
                            {item.name}
                          </Text>
                          <Text style={styles.subRowDesc}>
                            {item.id === 'midnightNeutral' ? 'Modern Slate & Obsidian' :
                             item.id === 'coralMarble' ? 'Vibrant Coral & Rose' :
                             item.id === 'forestGold' ? 'Emerald Forest & Gold' :
                             item.id === 'moonViolet' ? 'Moonlit Lavender & Violet' :
                             'Deep Twilight & Indigo'}
                          </Text>
                        </View>
                        {isSelected && <Icon name="check" size={18} color="#F58220" strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}

                  {onPressOpenThemesPage && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onPressOpenThemesPage();
                      }}
                      style={styles.studioLinkBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="palette" size={18} color="#F58220" />
                      <Text style={styles.studioLinkText}>Open Dedicated Theme Studio →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* =========================================================================
                  PAGE 7: CHAT
                 ========================================================================= */}
              {activePage === 'chat' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>MESSAGING SETTINGS</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="chat" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Enter Is Send</Text>
                      <Text style={styles.subRowDesc}>Enter key dispatches chat message</Text>
                    </View>
                    <Switch
                      value={enterIsSend}
                      onValueChange={setEnterIsSend}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="image" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Media Visibility</Text>
                      <Text style={styles.subRowDesc}>Automatically download incoming media</Text>
                    </View>
                    <Switch
                      value={mediaAutoDownload}
                      onValueChange={setMediaAutoDownload}
                      trackColor={{ false: isDark ? '#222938' : '#CBD5E1', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Chat Wallpaper', 'Wallpapers are customizable in Theme Studio.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="palette" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Chat Wallpaper</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* =========================================================================
                  PAGE 8: GROUPS
                 ========================================================================= */}
              {activePage === 'groups' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>GROUP PERMISSIONS</Text>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() =>
                      openPicker(
                        'Who Can Add Me to Groups',
                        formatPrivacyLabel(groupAddPrivacy),
                        [
                          { label: 'Everyone', value: 'EVERYONE' },
                          { label: 'My Contacts', value: 'MY_FRIENDS' },
                          { label: 'Nobody', value: 'NOBODY' },
                        ],
                        (val) => handleUpdatePrivacy('groupAddPrivacy', val as any)
                      )
                    }
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="users" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Who Can Add Me to Groups</Text>
                      <Text style={styles.subRowDesc}>{formatPrivacyLabel(groupAddPrivacy)}</Text>
                    </View>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{formatPrivacyLabel(groupAddPrivacy)}</Text>
                      <Icon name="chevronRight" size={16} color={chevronColor} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Group Notifications', 'Manage per-group sound and mute states from the group conversation header.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="bell" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Group Notification Rules</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* =========================================================================
                  PAGE 9: STORAGE AND DATA
                 ========================================================================= */}
              {activePage === 'storage' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>DATA USAGE</Text>

                  <View style={styles.subRow}>
                    <View style={styles.squircleIcon}>
                      <Icon name="archive" size={24} color={iconColor} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Storage Used</Text>
                      <Text style={styles.subRowDesc}>38.4 MB in cache & images</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Clear Cache', 'Cache cleared successfully.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="refresh" size={24} color={iconColor} />
                    </View>
                    <Text style={[styles.subRowTitle, { color: '#FF4B4B' }]}>Clear Temporary Cache</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* =========================================================================
                  PAGE 10: HELP & SUPPORT
                 ========================================================================= */}
              {activePage === 'help' && (
                <View style={styles.subPageContainer}>
                  <Text style={styles.sectionHeaderLabel}>ASSISTANCE</Text>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('FAQ', 'Frequently asked questions: Check our in-app game rules.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="info" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Help Center & FAQ</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Contact Us', 'Reach us anytime at support@marviegameapp.com')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="chat" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Contact Support</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Terms & Privacy', 'Marvie Platform is committed to user safety and GDPR compliance.')}
                  >
                    <View style={styles.squircleIcon}>
                      <Icon name="shield" size={24} color={iconColor} />
                    </View>
                    <Text style={styles.subRowTitle}>Terms & Privacy Policy</Text>
                    <Icon name="chevronRight" size={16} color={chevronColor} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          DROPDOWN / OPTION SELECTION BOTTOM MODAL
         ========================================================================= */}
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: pickerSheetBg, borderColor: pickerBorder }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitleText, { color: textColor }]}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Icon name="close" size={20} color="#7E8B9B" />
              </TouchableOpacity>
            </View>

            {pickerOptions.map((opt) => {
              const isSelected =
                pickerCurrentValue.toLowerCase() === opt.label.toLowerCase() ||
                pickerCurrentValue.toLowerCase() === opt.value.toLowerCase();
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.pickerRow}
                  activeOpacity={0.7}
                  onPress={() => onSelectOption(opt.value)}
                >
                  <Text
                    style={[
                      styles.pickerRowText,
                      isSelected && { color: '#F58220', fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Icon name="check" size={18} color="#F58220" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <ForgotPasswordModal
        visible={isForgotPasswordVisible}
        onClose={() => setIsForgotPasswordVisible(false)}
        initialIdentifier={user?.email || user?.username}
      />

      <DeleteAccountModal
        visible={isDeleteAccountVisible}
        onClose={() => setIsDeleteAccountVisible(false)}
        onSuccess={() => {
          setIsDeleteAccountVisible(false);
          onClose();
        }}
      />
    </>
  );
};

const getStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 14 : 8,
      paddingBottom: 14,
      position: 'relative',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    },
    backButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginRight: 6,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    /* PROFILE CARD (COPPER / AMBER GRADIENT WITH OTTER WATERMARK) */
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(235, 115, 34, 0.12)' : 'rgba(235, 115, 34, 0.08)',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(235, 115, 34, 0.32)' : 'rgba(235, 115, 34, 0.22)',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 4,
      marginBottom: 18,
      position: 'relative',
      overflow: 'hidden',
    },
    cardGraphicWrap: {
      position: 'absolute',
      right: 14,
      top: '50%',
      marginTop: -38,
      width: 76,
      height: 76,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrap: {
      position: 'relative',
      marginRight: 14,
    },
    onlineBadgeDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#25D366',
      borderWidth: 2,
      borderColor: isDark ? '#000000' : '#FFFFFF',
    },
    profileMeta: {
      flex: 1,
      paddingRight: 8,
    },
    profileDisplayName: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    profileUsername: {
      fontSize: 13,
      color: '#D8893F',
      marginTop: 2,
      fontWeight: '500',
    },

    /* ROOT MENU LIST */
    menuList: {
      paddingTop: 4,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    },
    squircleIcon: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      backgroundColor: 'transparent',
    },
    menuRowContent: {
      flex: 1,
      paddingRight: 10,
    },
    menuRowTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
      letterSpacing: -0.1,
    },
    menuRowDesc: {
      fontSize: 13,
      color: isDark ? '#7E8B9B' : theme.colors.textSecondary,
      marginTop: 2,
    },

    /* SUB-PAGES */
    subPageContainer: {
      paddingTop: 4,
    },
    sectionHeaderLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#6A788A' : theme.colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 6,
      paddingHorizontal: 2,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    },
    subRowTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
      flex: 1,
    },
    subRowTextCol: {
      flex: 1,
      paddingRight: 10,
    },
    subRowDesc: {
      fontSize: 12,
      color: isDark ? '#7E8B9B' : theme.colors.textSecondary,
      marginTop: 2,
    },
    subRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    subRowValue: {
      fontSize: 14,
      color: isDark ? '#8E9AA8' : theme.colors.textSecondary,
      fontWeight: '500',
    },

    /* ACCOUNT DETAILS SPECIFIC */
    accountHeaderBox: {
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    accountNameBig: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
      marginTop: 12,
    },
    accountUserHandle: {
      fontSize: 14,
      color: '#D8893F',
      marginTop: 3,
    },
    accountEmailText: {
      fontSize: 13,
      color: isDark ? '#7E8B9B' : theme.colors.textSecondary,
      marginTop: 2,
    },

    /* PALETTE CIRCLES */
    paletteCircleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 14,
    },
    colorCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isDark ? '#000000' : '#FFFFFF',
    },
    studioLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginTop: 16,
    },
    studioLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#F58220',
    },

    /* SELECTION PICKER SHEET MODAL */
    pickerBackdrop: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: isDark ? '#121620' : '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 36,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    pickerTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
    },
    pickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    pickerRowText: {
      fontSize: 15,
      color: isDark ? '#FFFFFF' : theme.colors.textPrimary,
    },
  });