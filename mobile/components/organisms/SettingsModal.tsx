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
} from 'react-native';
import { useTheme, AppearanceMode } from '../../theme';
import { THEME_METADATA } from '../../theme/themes';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { ProfileService } from '../../services/profile.service';
import { MobileSocketService } from '../../services/socket.service';

export type SettingsPage =
  | 'root'
  | 'account'
  | 'privacy'
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
  initialPage = 'root',
}) => {
  const { theme, themeId, appearanceMode, setThemeId, setAppearanceMode } = useTheme();
  const { user, logout } = useAuth();

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

  useEffect(() => {
    if (visible) {
      setActivePage(initialPage || 'root');
      ProfileService.fetchMyProfile()
        .then((p) => {
          if (p.readReceipts !== undefined) setReadReceipts(p.readReceipts);
          if (p.onlinePrivacy) setOnlinePrivacy(p.onlinePrivacy as any);
          if (p.lastSeenPrivacy) setLastSeenPrivacy(p.lastSeenPrivacy as any);
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
    key: 'onlinePrivacy' | 'lastSeenPrivacy',
    value: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY'
  ) => {
    if (key === 'onlinePrivacy') setOnlinePrivacy(value);
    if (key === 'lastSeenPrivacy') setLastSeenPrivacy(value);
    try {
      await ProfileService.updateMyProfile({ [key]: value });
      MobileSocketService.notifyPresencePrivacyUpdate();
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

  const handleBack = () => {
    if (activePage !== 'root') {
      setActivePage('root');
    } else {
      onClose();
    }
  };

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
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Back"
              >
                <Icon name="chevronLeft" size={24} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                {activePage === 'root' && 'Settings'}
                {activePage === 'privacy' && 'Privacy & Security'}
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
                    style={styles.profileCard}
                    activeOpacity={0.82}
                    onPress={() => setActivePage('account')}
                  >
                    {/* Transparent gaming graphic on right side */}
                    <View style={styles.cardGraphicWrap} pointerEvents="none">
                      <Image
                        source={require('../../assets/images/settings_card_graphic.png')}
                        style={styles.cardGraphic}
                        resizeMode="contain"
                      />
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
                      <Text style={styles.profileDisplayName} numberOfLines={1}>
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
                      <View style={[styles.squircleIcon, { backgroundColor: '#FF8A00' }]}>
                        <Icon name="user" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Account</Text>
                        <Text style={styles.menuRowDesc}>Profile, email, phone, password</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 2. Privacy & Security */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('privacy')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#2196F3' }]}>
                        <Icon name="shield" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Privacy & Security</Text>
                        <Text style={styles.menuRowDesc}>Last seen, read receipts, blocked users</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 3. Notifications */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('notifications')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#FF4B4B' }]}>
                        <Icon name="bell" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Notifications</Text>
                        <Text style={styles.menuRowDesc}>Messages, calls, groups, sounds</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 4. Chat */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('chat')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#25D366' }]}>
                        <Icon name="chat" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Chat</Text>
                        <Text style={styles.menuRowDesc}>Theme, wallpapers, media</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 5. Groups */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('groups')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#9C27B0' }]}>
                        <Icon name="users" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Groups</Text>
                        <Text style={styles.menuRowDesc}>Manage groups, permissions</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 6. Gaming */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('gaming')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#FFB300' }]}>
                        <Icon name="gamepad" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Gaming</Text>
                        <Text style={styles.menuRowDesc}>Game preferences, in-game settings</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 7. Appearance */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('appearance')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#00BCD4' }]}>
                        <Icon name="palette" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Appearance</Text>
                        <Text style={styles.menuRowDesc}>Theme, language, font size</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 8. Storage and Data */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('storage')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#607D8B' }]}>
                        <Icon name="archive" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Storage and Data</Text>
                        <Text style={styles.menuRowDesc}>Manage storage, auto-download</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
                    </TouchableOpacity>

                    {/* 9. Help & Support */}
                    <TouchableOpacity
                      style={styles.menuRow}
                      activeOpacity={0.65}
                      onPress={() => setActivePage('help')}
                    >
                      <View style={[styles.squircleIcon, { backgroundColor: '#FF4081' }]}>
                        <Icon name="award" size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View style={styles.menuRowContent}>
                        <Text style={styles.menuRowTitle}>Help & Support</Text>
                        <Text style={styles.menuRowDesc}>FAQ, contact us, app info</Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4B5565" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA726' }]}>
                      <Icon name="eye" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Last Seen</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{formatPrivacyLabel(lastSeenPrivacy)}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA726' }]}>
                      <Icon name="image" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Profile Photo</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{profilePhotoPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA726' }]}>
                      <Icon name="info" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>About</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{aboutPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA726' }]}>
                      <Icon name="users" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Status</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{statusPrivacy}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP 2: MESSAGING PRIVACY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>MESSAGING PRIVACY</Text>

                  {/* Read Receipts (Blue Ticks) */}
                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#1E88E5' }]}>
                      <Icon name="doubleCheck" size={19} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Read Receipts (Blue Ticks)</Text>
                      <Text style={styles.subRowDesc}>Show blue ticks when you read messages</Text>
                    </View>
                    <Switch
                      value={readReceipts}
                      onValueChange={handleToggleReadReceipts}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Typing Indicators */}
                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#1E88E5' }]}>
                      <Icon name="chat" size={19} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Typing Indicators</Text>
                      <Text style={styles.subRowDesc}>Show when you're typing</Text>
                    </View>
                    <Switch
                      value={typingIndicators}
                      onValueChange={setTypingIndicators}
                      trackColor={{ false: '#222938', true: '#F58220' }}
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA726' }]}>
                      <Icon name="clock" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Disappearing Messages</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{disappearingMessages}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="volume" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Who Can Call Me</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{whoCanCallMe}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="videoCall" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Who Can Video Call Me</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{whoCanVideoCallMe}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
                    </View>
                  </TouchableOpacity>

                  {/* GROUP 4: SAFETY */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>SAFETY</Text>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Blocked Users', 'You have no blocked users.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="ban" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Blocked Users</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Report a User', 'To report player violations, contact support or use in-chat report.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="shield" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Report a User</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  {/* Password & Reset */}
                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => setIsForgotPasswordVisible(true)}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#FF7A00' }]}>
                      <Icon name="lock" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Password & Reset</Text>
                      <Text style={styles.subRowDesc}>Change or reset your password</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="bell" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Do Not Disturb</Text>
                      <Text style={styles.subRowDesc}>Mute all notifications</Text>
                    </View>
                    <Switch
                      value={doNotDisturb}
                      onValueChange={setDoNotDisturb}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#7E57C2' }]}>
                      <Icon name="clock" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Quiet Hours</Text>
                      <Text style={styles.subRowDesc}>10:00 PM - 7:00 AM</Text>
                    </View>
                    <Switch
                      value={quietHours}
                      onValueChange={setQuietHours}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* GROUP 2: MESSAGES */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>MESSAGES</Text>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#43A047' }]}>
                      <Icon name="chat" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Message Notifications</Text>
                    <Switch
                      value={messageNotifications}
                      onValueChange={setMessageNotifications}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#43A047' }]}>
                      <Icon name="users" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Group Notifications</Text>
                    <Switch
                      value={groupNotifications}
                      onValueChange={setGroupNotifications}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="award" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Mentions</Text>
                      <Text style={styles.subRowDesc}>Notify when you are mentioned</Text>
                    </View>
                    <Switch
                      value={mentionsAlert}
                      onValueChange={setMentionsAlert}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFA000' }]}>
                      <Icon name="heart" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Reaction Notifications</Text>
                      <Text style={styles.subRowDesc}>Notify for message reactions</Text>
                    </View>
                    <Switch
                      value={reactionNotifications}
                      onValueChange={setReactionNotifications}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#00BCD4' }]}>
                      <Icon name="eye" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Show Message Preview</Text>
                    <Switch
                      value={showMessagePreview}
                      onValueChange={setShowMessagePreview}
                      trackColor={{ false: '#222938', true: '#F58220' }}
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#8E24AA' }]}>
                      <Icon name="volume" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Notification Sound</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{notificationSound}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#7E57C2' }]}>
                      <Icon name="target" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Vibration</Text>
                    <Switch
                      value={messageVibration}
                      onValueChange={setMessageVibration}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* GROUP 3: CALLS */}
                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>CALLS</Text>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#43A047' }]}>
                      <Icon name="volume" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Incoming Call Notifications</Text>
                    <Switch
                      value={incomingCallNotifications}
                      onValueChange={setIncomingCallNotifications}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#43A047' }]}>
                      <Icon name="videoCall" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Missed Call Notifications</Text>
                    <Switch
                      value={missedCallNotifications}
                      onValueChange={setMissedCallNotifications}
                      trackColor={{ false: '#222938', true: '#F58220' }}
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#8E24AA' }]}>
                      <Icon name="volume" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Ringtone</Text>
                    <View style={styles.subRowRight}>
                      <Text style={styles.subRowValue}>{ringtone}</Text>
                      <Icon name="chevronRight" size={16} color="#556275" />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#7E57C2' }]}>
                      <Icon name="target" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Vibration</Text>
                    <Switch
                      value={callVibration}
                      onValueChange={setCallVibration}
                      trackColor={{ false: '#222938', true: '#F58220' }}
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FF8A00' }]}>
                      <Icon name="lock" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Change Password</Text>
                      <Text style={styles.subRowDesc}>Update via email verification code</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  <Text style={[styles.sectionHeaderLabel, { marginTop: 26 }]}>PLATFORM VERIFICATION</Text>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="shield" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Verified Gaming Platform</Text>
                      <Text style={styles.subRowDesc}>Zero real money stakes • Safe community</Text>
                    </View>
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#607D8B' }]}>
                      <Icon name="info" size={19} color="#FFFFFF" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="logOut" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.subRowTitle, { color: '#FF4B4B' }]}>Sign Out of Account</Text>
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="volume" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Game Sound Effects</Text>
                      <Text style={styles.subRowDesc}>Board move, dice roll & win sounds</Text>
                    </View>
                    <Switch
                      value={soundEffects}
                      onValueChange={setSoundEffects}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#FFB300' }]}>
                      <Icon name="target" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Haptic Feedback</Text>
                      <Text style={styles.subRowDesc}>Tactile vibration on turn timers & moves</Text>
                    </View>
                    <Switch
                      value={hapticFeedback}
                      onValueChange={setHapticFeedback}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#2196F3' }]}>
                      <Icon name="refresh" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Instant Rematch Offers</Text>
                      <Text style={styles.subRowDesc}>Quick rematch banner on game completion</Text>
                    </View>
                    <Switch
                      value={autoRematchOffers}
                      onValueChange={setAutoRematchOffers}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#9C27B0' }]}>
                      <Icon name="gamepad" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>In-Game Direct Challenges</Text>
                      <Text style={styles.subRowDesc}>Receive live invitations in chat</Text>
                    </View>
                    <Switch
                      value={allowGameChallenges}
                      onValueChange={setAllowGameChallenges}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="eye" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Online Presence Broadcast</Text>
                      <Text style={styles.subRowDesc}>Broadcast playing status to friends</Text>
                    </View>
                    <Switch
                      value={showOnlinePresence}
                      onValueChange={setShowOnlinePresence}
                      trackColor={{ false: '#222938', true: '#F58220' }}
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
                        <View style={[styles.squircleIcon, { backgroundColor: '#00BCD4' }]}>
                          <Icon name={opt.icon} size={19} color="#FFFFFF" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#25D366' }]}>
                      <Icon name="chat" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Enter Is Send</Text>
                      <Text style={styles.subRowDesc}>Enter key dispatches chat message</Text>
                    </View>
                    <Switch
                      value={enterIsSend}
                      onValueChange={setEnterIsSend}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.subRow}>
                    <View style={[styles.squircleIcon, { backgroundColor: '#2196F3' }]}>
                      <Icon name="image" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Media Visibility</Text>
                      <Text style={styles.subRowDesc}>Automatically download incoming media</Text>
                    </View>
                    <Switch
                      value={mediaAutoDownload}
                      onValueChange={setMediaAutoDownload}
                      trackColor={{ false: '#222938', true: '#F58220' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Chat Wallpaper', 'Wallpapers are customizable in Theme Studio.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#FF8A00' }]}>
                      <Icon name="palette" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Chat Wallpaper</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
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
                    onPress={() => Alert.alert('Group Invites', 'Anyone in your friends list can invite you to a group.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#9C27B0' }]}>
                      <Icon name="users" size={19} color="#FFFFFF" />
                    </View>
                    <View style={styles.subRowTextCol}>
                      <Text style={styles.subRowTitle}>Who Can Add Me to Groups</Text>
                      <Text style={styles.subRowDesc}>My Friends Only</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Group Notifications', 'Manage per-group sound and mute states from the group conversation header.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#43A047' }]}>
                      <Icon name="bell" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Group Notification Rules</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#607D8B' }]}>
                      <Icon name="archive" size={19} color="#FFFFFF" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#E53935' }]}>
                      <Icon name="refresh" size={19} color="#FFFFFF" />
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
                    <View style={[styles.squircleIcon, { backgroundColor: '#FF4081' }]}>
                      <Icon name="info" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Help Center & FAQ</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Contact Us', 'Reach us anytime at support@marviegameapp.com')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#2196F3' }]}>
                      <Icon name="chat" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Contact Support</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subRow}
                    activeOpacity={0.65}
                    onPress={() => Alert.alert('Terms & Privacy', 'Marvie Platform is committed to user safety and GDPR compliance.')}
                  >
                    <View style={[styles.squircleIcon, { backgroundColor: '#4CAF50' }]}>
                      <Icon name="shield" size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.subRowTitle}>Terms & Privacy Policy</Text>
                    <Icon name="chevronRight" size={16} color="#556275" />
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
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitleText}>{pickerTitle}</Text>
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
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 14,
    position: 'relative',
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
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* PROFILE CARD (COPPER / AMBER GRADIENT WITH CROWN WATERMARK) */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 115, 34, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(235, 115, 34, 0.32)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGraphicWrap: {
    position: 'absolute',
    right: -10,
    top: -8,
    bottom: -8,
    width: 155,
  },
  cardGraphic: {
    width: '100%',
    height: '100%',
    opacity: 0.22,
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
    borderColor: '#0B0E14',
  },
  profileMeta: {
    flex: 1,
    paddingRight: 8,
  },
  profileDisplayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  squircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuRowContent: {
    flex: 1,
    paddingRight: 10,
  },
  menuRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  menuRowDesc: {
    fontSize: 13,
    color: '#7E8B9B',
    marginTop: 2,
  },

  /* SUB-PAGES */
  subPageContainer: {
    paddingTop: 4,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A788A',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  subRowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  subRowTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  subRowDesc: {
    fontSize: 12,
    color: '#7E8B9B',
    marginTop: 2,
  },
  subRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subRowValue: {
    fontSize: 14,
    color: '#8E9AA8',
    fontWeight: '500',
  },

  /* ACCOUNT DETAILS SPECIFIC */
  accountHeaderBox: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  accountNameBig: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  accountUserHandle: {
    fontSize: 14,
    color: '#D8893F',
    marginTop: 3,
  },
  accountEmailText: {
    fontSize: 13,
    color: '#7E8B9B',
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
    borderColor: '#0B0E14',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#121620',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pickerRowText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});
