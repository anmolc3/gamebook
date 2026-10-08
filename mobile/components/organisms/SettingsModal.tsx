import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme, ThemeId, AppearanceMode } from '../../theme';
import { THEME_METADATA, resolveTheme } from '../../theme/themes';
import { Icon } from '../../icons';
import { IconButton } from '../molecules/IconButton';
import { Avatar } from '../atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onPressNotifications?: () => void;
  onPressOpenThemesPage?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onPressNotifications,
  onPressOpenThemesPage,
}) => {
  const { theme, themeId, appearanceMode, effectiveMode, setThemeId, setAppearanceMode } = useTheme();
  const { user, logout } = useAuth();
  const activeMeta = THEME_METADATA.find((m) => m.id === themeId) || THEME_METADATA[0];

  // Local preferences states
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [autoRematchOffers, setAutoRematchOffers] = useState(true);
  const [showOnlinePresence, setShowOnlinePresence] = useState(true);
  const [allowGameChallenges, setAllowGameChallenges] = useState(true);
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);

  // Notification states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [gameInvitesAlert, setGameInvitesAlert] = useState(true);
  const [turnAlerts, setTurnAlerts] = useState(true);
  const [friendAlerts, setFriendAlerts] = useState(true);
  const [showNotificationsList, setShowNotificationsList] = useState(false);

  const appearanceOptions: { mode: AppearanceMode; label: string; icon: 'sun' | 'moon' | 'palette' }[] = [
    { mode: 'system', label: 'System', icon: 'palette' },
    { mode: 'light', label: 'Light', icon: 'sun' },
    { mode: 'dark', label: 'Dark', icon: 'moon' },
  ];

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

  return (
    <>
      <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <SafeAreaView style={styles.sheetContainer}>
          <View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.radius.sheet,
                borderTopRightRadius: theme.radius.sheet,
                borderColor: theme.colors.border,
              },
              theme.shadows.modal,
            ]}
          >
            {/* Grab Handle */}
            <View style={styles.grabHandleWrapper}>
              <View
                style={[
                  styles.grabHandle,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.settingsHeaderIcon,
                    { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                  ]}
                >
                  <Icon name="settings" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Platform Settings
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Theme, appearance & game controls
                  </Text>
                </View>
              </View>
              <IconButton
                icon="close"
                size={36}
                iconSize={18}
                variant="tinted"
                onPress={onClose}
                accessibilityLabel="Close settings modal"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {/* SECTION 1: APPEARANCE & THEMES */}
              <View style={styles.sectionHeader}>
                <Icon name="palette" size={16} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Appearance & Themes
                </Text>
              </View>

              {/* Mode Segmented Control (System, Light, Dark) */}
              <Text style={[styles.subSectionTitle, { color: theme.colors.textSecondary }]}>
                Display Mode
              </Text>
              <View
                style={[
                  styles.modeContainer,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {appearanceOptions.map((opt) => {
                  const isSelected = appearanceMode === opt.mode;
                  return (
                    <TouchableOpacity
                      key={opt.mode}
                      onPress={() => setAppearanceMode(opt.mode)}
                      style={[
                        styles.modeOption,
                        isSelected && {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.modeText,
                          {
                            color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dedicated Interactive Themes Picker */}
              <Text style={[styles.subSectionTitle, { color: theme.colors.textSecondary, marginTop: 18 }]}>
                Color Themes
              </Text>

              <View style={styles.themesGrid}>
                {THEME_METADATA.map((item) => {
                  const isSelected = themeId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setThemeId(item.id)}
                      activeOpacity={0.78}
                      style={[
                        styles.themeItemCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                        isSelected && theme.shadows.soft,
                      ]}
                    >
                      <View style={styles.themeItemLeft}>
                        <View style={styles.themeColorCircles}>
                          <View style={[styles.paletteCircle, { backgroundColor: item.previewColor }]} />
                          <View style={[styles.paletteCircle, { backgroundColor: item.accentColor, marginLeft: -7 }]} />
                        </View>
                        <View style={styles.themeItemMeta}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.themeItemName,
                                {
                                  color: theme.colors.textPrimary,
                                  fontWeight: isSelected ? '700' : '600',
                                },
                              ]}
                            >
                              {item.name}
                            </Text>
                            {isSelected && (
                              <View style={[styles.activeThemeMiniBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Text style={[styles.activeThemeMiniText, { color: theme.colors.primary }]}>Active</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.themeItemDesc, { color: theme.colors.textSecondary }]}>
                            {item.id === 'midnightNeutral' ? 'Modern Slate & Obsidian' :
                             item.id === 'coralMarble' ? 'Vibrant Coral & Rose' :
                             item.id === 'forestGold' ? 'Emerald Forest & Gold' :
                             item.id === 'moonViolet' ? 'Moonlit Lavender & Violet' :
                             'Deep Twilight & Indigo'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.themeRadioCircle,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Icon name="check" size={12} color={theme.colors.textOnPrimary} strokeWidth={3} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {onPressOpenThemesPage && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onPressOpenThemesPage();
                  }}
                  style={[
                    styles.openStudioSecondaryBtn,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Icon name="palette" size={15} color={theme.colors.primary} />
                  <Text style={[styles.openStudioSecondaryText, { color: theme.colors.primary }]}>
                    Open Dedicated Theme Studio →
                  </Text>
                </TouchableOpacity>
              )}

              {/* SECTION 2: NOTIFICATIONS & ALERTS */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Icon name="bell" size={16} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Notifications & Alerts
                </Text>
              </View>



              {/* Notification Preference Toggles Group */}
              <View
                style={[
                  styles.settingsGroup,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 10 },
                ]}
              >
                {/* Push Notifications Master Toggle */}
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Push Notifications
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Receive alerts on lockscreen and banners
                    </Text>
                  </View>
                  <Switch
                    value={pushNotifications}
                    onValueChange={setPushNotifications}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={pushNotifications ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                {/* Game Invites Toggle */}
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Game Match Invites
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Instant alerts when invited to live multiplayer rooms
                    </Text>
                  </View>
                  <Switch
                    value={gameInvitesAlert}
                    onValueChange={setGameInvitesAlert}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={gameInvitesAlert ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                {/* Turn Clocks Toggle */}
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Turn Reminders & Clocks
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Vibration alerts when your turn timer begins
                    </Text>
                  </View>
                  <Switch
                    value={turnAlerts}
                    onValueChange={setTurnAlerts}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={turnAlerts ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                {/* Friend Requests Toggle */}
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Friend Requests & Social
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Notifications for new friendship requests
                    </Text>
                  </View>
                  <Switch
                    value={friendAlerts}
                    onValueChange={setFriendAlerts}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={friendAlerts ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>
              </View>

              {/* SECTION 3: AUDIO & GAMEPLAY FX */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Icon name="target" size={16} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Gameplay & Audio
                </Text>
              </View>

              <View
                style={[
                  styles.settingsGroup,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Game Sound Effects
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Authoritative move, roll & check sounds
                    </Text>
                  </View>
                  <Switch
                    value={soundEffects}
                    onValueChange={setSoundEffects}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={soundEffects ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Haptic Feedback
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Vibration impulses on turns & captures
                    </Text>
                  </View>
                  <Switch
                    value={hapticFeedback}
                    onValueChange={setHapticFeedback}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={hapticFeedback ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Instant Rematch Offers
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Show one-tap rematch dialog upon game conclusion
                    </Text>
                  </View>
                  <Switch
                    value={autoRematchOffers}
                    onValueChange={setAutoRematchOffers}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={autoRematchOffers ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>
              </View>

              {/* SECTION 3: PRIVACY & PASSWORDS */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Icon name="lock" size={16} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Privacy & Passwords
                </Text>
              </View>

              <View
                style={[
                  styles.settingsGroup,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Online Presence Status
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Broadcast online activity to friends
                    </Text>
                  </View>
                  <Switch
                    value={showOnlinePresence}
                    onValueChange={setShowOnlinePresence}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={showOnlinePresence ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.settingItemRow}>
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      In-Game Direct Challenges
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Receive challenge invites in direct messages
                    </Text>
                  </View>
                  <Switch
                    value={allowGameChallenges}
                    onValueChange={setAllowGameChallenges}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={allowGameChallenges ? theme.colors.surface : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: theme.colors.border }]} />

                <TouchableOpacity
                  style={styles.settingItemRow}
                  onPress={() => setIsForgotPasswordVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemMeta}>
                    <Text style={[styles.settingItemLabel, { color: theme.colors.textPrimary }]}>
                      Forgot Password / Reset Password
                    </Text>
                    <Text style={[styles.settingItemDesc, { color: theme.colors.textSecondary }]}>
                      Send a verification code to reset your account password
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* SECTION 4: ACCOUNT & PLATFORM COMPLIANCE */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Icon name="shield" size={16} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Account & Platform
                </Text>
              </View>

              <View
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.accountUserRow}>
                  <Avatar
                    displayName={user?.displayName || 'Player'}
                    avatarUrl={user?.avatarUrl}
                    size="md"
                    status="online"
                  />
                  <View style={styles.accountUserMeta}>
                    <Text style={[styles.accountDisplayName, { color: theme.colors.textPrimary }]}>
                      {user?.displayName || 'Player'}
                    </Text>
                    <Text style={[styles.accountUsername, { color: theme.colors.textSecondary }]}>
                      @{user?.username || 'user'}
                    </Text>
                  </View>
                </View>

                {/* Platform Compliance Badge */}
                <View
                  style={[
                    styles.complianceBadge,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <Icon name="shield" size={14} color={theme.colors.primary} />
                  <Text style={[styles.complianceText, { color: theme.colors.textSecondary }]}>
                    Verified Entertainment Gaming • Zero Real Money Stakes
                  </Text>
                </View>

                <View style={styles.platformMetaRow}>
                  <Text style={[styles.versionLabel, { color: theme.colors.textMuted }]}>
                    App Version
                  </Text>
                  <Text style={[styles.versionValue, { color: theme.colors.textPrimary }]}>
                    v1.19.0 (Marvie iOS Engine)
                  </Text>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={[
                    styles.signOutBtn,
                    { borderColor: theme.colors.error + '55', backgroundColor: theme.colors.surface },
                  ]}
                  activeOpacity={0.8}
                >
                  <Icon name="logOut" size={16} color={theme.colors.error} />
                  <Text style={[styles.signOutBtnText, { color: theme.colors.error }]}>
                    Sign Out of Account
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '92%',
  },
  content: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '100%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    paddingBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeText: {
    fontSize: 13,
    marginLeft: 6,
  },
  themesGrid: {
    gap: 8,
    marginBottom: 8,
  },
  themeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  themeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  themeColorCircles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paletteCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  themeItemMeta: {
    flex: 1,
  },
  themeItemName: {
    fontSize: 14,
  },
  activeThemeMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeThemeMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  themeItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  themeRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  openStudioSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  openStudioSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingsGroup: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingItemMeta: {
    flex: 1,
    paddingRight: 12,
  },
  settingItemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
  },
  accountCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  accountUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  accountUserMeta: {
    flex: 1,
  },
  accountDisplayName: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountUsername: {
    fontSize: 13,
    marginTop: 1,
  },
  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  complianceText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  platformMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  notificationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  notificationIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationCardMeta: {
    flex: 1,
  },
  notificationCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notificationCardDesc: {
    fontSize: 12,
  },
  notificationBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notificationsListWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifItemBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  notifItemTime: {
    fontSize: 10,
  },
});
