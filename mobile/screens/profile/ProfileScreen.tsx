import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { EditProfileModal } from '../../components/organisms/EditProfileModal';
import { SettingsModal } from '../../components/organisms/SettingsModal';
import { useAuth } from '../../features/auth/AuthContext';
import {
  ProfileService,
  UserProfile,
  RelationshipState,
} from '../../services/profile.service';

export interface ProfileScreenProps {
  userId?: string;
  onBack?: () => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  onChallenge?: (userId: string, username: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userId,
  onBack,
  onNavigateToChat,
  onChallenge,
}) => {
  const { theme } = useTheme();
  const { user: authUser, logout, updateUser } = useAuth();

  const isOwnProfile = !userId || userId === authUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setErrorMsg(null);
      let data: UserProfile;
      if (isOwnProfile) {
        data = await ProfileService.fetchMyProfile();
      } else {
        data = await ProfileService.fetchUserProfile(userId!);
      }
      setProfile(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isOwnProfile, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleProfileUpdated = (updated: UserProfile) => {
    setProfile(updated);
    if (isOwnProfile) {
      updateUser({
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
      });
    }
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'Joined Recently';
    try {
      const date = new Date(dateString);
      return `Joined ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Joined 2026';
    }
  };

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading Player Profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <Icon name="close" size={48} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>
            Unable to Load Profile
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadProfile}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const relationship: RelationshipState = profile?.relationship || 'NONE';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.colors.border }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.navIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navIconButtonPlaceholder} />
        )}

        <Text style={[styles.navTitle, { color: theme.colors.textPrimary }]}>
          {isOwnProfile ? 'My Profile' : profile?.displayName}
        </Text>

        <TouchableOpacity
          onPress={() => setIsSettingsModalVisible(true)}
          style={[styles.navIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Settings"
        >
          <Icon name="settings" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Layered Profile Banner / Hero */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroBackgroundGlow,
              { backgroundColor: theme.colors.primary + '14', borderColor: theme.colors.primary + '28' },
            ]}
          />

          {/* Large Avatar with Presence & Edit capability */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => isOwnProfile && setIsEditModalVisible(true)}
            activeOpacity={isOwnProfile ? 0.8 : 1}
          >
            <View
              style={[
                styles.avatarGlowRing,
                { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
              ]}
            >
              <Avatar
                displayName={profile?.displayName || 'Player'}
                avatarUrl={profile?.avatarUrl}
                size="xl"
                status={profile?.isOnline ? 'online' : 'offline'}
              />
              {isOwnProfile && (
                <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="edit" size={12} color={theme.colors.background} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Player Names & Bio */}
          <View style={styles.identityContainer}>
            <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
              {profile?.displayName}
            </Text>
            <Text style={[styles.usernameText, { color: theme.colors.primary }]}>
              @{profile?.username}
            </Text>

            {/* Member Since Badge */}
            <View
              style={[
                styles.memberBadge,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              ]}
            >
              <Icon name="calendar" size={13} color={theme.colors.textMuted} />
              <Text style={[styles.memberBadgeText, { color: theme.colors.textSecondary }]}>
                {formatJoinDate(profile?.createdAt)}
              </Text>
            </View>

            {/* Bio Quote */}
            {profile?.bio ? (
              <View
                style={[
                  styles.bioBox,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>
                  "{profile.bio}"
                </Text>
              </View>
            ) : isOwnProfile ? (
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(true)}
                style={[
                  styles.addBioPlaceholder,
                  { borderColor: theme.colors.border, borderStyle: 'dashed' },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={14} color={theme.colors.textMuted} />
                <Text style={[styles.addBioText, { color: theme.colors.textMuted }]}>
                  Tap to add your player bio & playstyle
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Action Buttons Bar */}
        <View style={styles.actionBar}>
          {isOwnProfile ? (
            <View style={styles.ownActionRow}>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(true)}
                style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                <Icon name="edit" size={18} color={theme.colors.background} />
                <Text style={[styles.primaryActionBtnText, { color: theme.colors.background }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSettingsModalVisible(true)}
                style={[
                  styles.secondaryActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="settings" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.secondaryActionBtnText, { color: theme.colors.textPrimary }]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.peerActionRow}>
              {/* Contextual Friendship Button */}
              {relationship === 'NONE' && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Icon name="userPlus" size={18} color={theme.colors.background} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.background }]}>
                    Add Friend
                  </Text>
                </TouchableOpacity>
              )}

              {relationship === 'REQUEST_SENT' && (
                <View
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                  ]}
                >
                  <Icon name="check" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.textSecondary }]}>
                    Request Sent
                  </Text>
                </View>
              )}

              {relationship === 'REQUEST_RECEIVED' && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.accent }]}
                  activeOpacity={0.8}
                >
                  <Icon name="userCheck" size={18} color={theme.colors.background} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.background }]}>
                    Accept Request
                  </Text>
                </TouchableOpacity>
              )}

              {relationship === 'FRIENDS' && (
                <View
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: theme.colors.accent + '22', borderColor: theme.colors.accent },
                  ]}
                >
                  <Icon name="userCheck" size={18} color={theme.colors.accent} />
                  <Text style={[styles.primaryActionBtnText, { color: theme.colors.accent }]}>
                    Friends
                  </Text>
                </View>
              )}

              {/* Direct Message Button */}
              <TouchableOpacity
                onPress={() => onNavigateToChat?.(profile!.id, profile!.username)}
                style={[
                  styles.secondaryActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="chat" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.secondaryActionBtnText, { color: theme.colors.textPrimary }]}>
                  Message
                </Text>
              </TouchableOpacity>

              {/* Challenge Button */}
              <TouchableOpacity
                onPress={() => onChallenge?.(profile!.id, profile!.username)}
                style={[
                  styles.iconOnlyActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Challenge to game"
              >
                <Icon name="gamepad" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Performance & Gaming Statistics Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Gaming Statistics
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
            Lifetime Record
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {/* Matches */}
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.statIconBadge, { backgroundColor: theme.colors.primary + '18' }]}>
              <Icon name="dice" size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {profile?.stats?.totalMatches ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Matches Played
            </Text>
          </View>

          {/* Win Rate */}
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.statIconBadge, { backgroundColor: theme.colors.accent + '18' }]}>
              <Icon name="target" size={20} color={theme.colors.accent} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {profile?.stats?.winRate ?? 0}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Win Rate
            </Text>
          </View>

          {/* Total Wins */}
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#F59E0B18' }]}>
              <Icon name="trophy" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {profile?.stats?.totalWins ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Victories
            </Text>
          </View>

          {/* Win Streak / Friends */}
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#EF444418' }]}>
              <Icon name="flame" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {profile?.stats?.highestStreak ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Best Streak
            </Text>
          </View>
        </View>

        {/* Trophies & Achievements Showcase */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Trophies & Badges
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
            {profile?.achievements?.length || 0} Unlocked
          </Text>
        </View>

        <View style={styles.achievementsList}>
          {profile?.achievements && profile.achievements.length > 0 ? (
            profile.achievements.map((ach) => (
              <View
                key={ach.id}
                style={[
                  styles.achievementCard,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
              >
                <View style={[styles.achievementIconBox, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Icon name="award" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.achievementMeta}>
                  <Text style={[styles.achievementTitle, { color: theme.colors.textPrimary }]}>
                    {ach.title}
                  </Text>
                  <Text style={[styles.achievementDesc, { color: theme.colors.textSecondary }]}>
                    {ach.description}
                  </Text>
                </View>
                <View style={[styles.unlockedBadge, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '15' }]}>
                  <Text style={[styles.unlockedBadgeText, { color: theme.colors.accent }]}>Unlocked</Text>
                </View>
              </View>
            ))
          ) : (
            <View
              style={[
                styles.emptyAchievementsCard,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              ]}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surface }]}>
                <Icon name="trophy" size={28} color={theme.colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Trophy Cabinet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Compete in multiplayer Tic-Tac-Toe and Ludo matches to unlock custom badges, achievements, and ranking titles!
              </Text>
            </View>
          )}
        </View>

        {/* Sign Out Action (Own Profile only) */}
        {isOwnProfile && (
          <View style={styles.footerSection}>
            <TouchableOpacity
              onPress={logout}
              style={[
                styles.logoutBtn,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.error + '44' },
              ]}
              activeOpacity={0.7}
            >
              <Icon name="logOut" size={18} color={theme.colors.error} />
              <Text style={[styles.logoutBtnText, { color: theme.colors.error }]}>
                Sign Out of Account
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          currentProfile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Dedicated Settings Modal */}
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 96,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroBackgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 130,
    borderRadius: 25,
    borderWidth: 0,
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 12,
  },
  avatarGlowRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 2,
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityContainer: {
    alignItems: 'center',
    width: '100%',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 10,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 14,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 0,
    width: '100%',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addBioPlaceholder: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBioText: {
    fontSize: 13,
  },
  actionBar: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  ownActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  peerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    borderWidth: 0,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 0,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconOnlyActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  achievementsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
    gap: 12,
  },
  achievementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementMeta: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  achievementDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyAchievementsCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 0,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  footerSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 16,
    borderWidth: 0,
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  unlockedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
