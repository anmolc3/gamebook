import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import {
  FriendsService,
  FriendUser,
  FriendRequestItem,
  SearchedPlayer,
} from '../../services/friends.service';
import { MobileSocketService } from '../../services/socket.service';

export interface FriendsScreenProps {
  onBack?: () => void;
  onViewProfile?: (userId: string) => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  onChallenge?: (userId: string, username: string) => void;
}

type TabType = 'friends' | 'requests' | 'discover';

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  onBack,
  onViewProfile,
  onNavigateToChat,
  onChallenge,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedPlayer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load all social data
  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        FriendsService.fetchFriends(),
        FriendsService.fetchRequests(),
      ]);
      setFriends(friendsData);
      setIncomingRequests(requestsData.incoming);
      setOutgoingRequests(requestsData.outgoing);
    } catch (err) {
      console.warn('Failed to load social data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Connect socket and listen for real-time presence & friend events
    MobileSocketService.connect();

    const unsubPresence = MobileSocketService.onPresenceUpdate(({ userId, isOnline }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, isOnline } : f))
      );
    });

    const unsubReqReceived = MobileSocketService.onFriendRequestReceived(() => {
      loadData();
    });

    const unsubReqAccepted = MobileSocketService.onFriendRequestAccepted(() => {
      loadData();
    });

    return () => {
      unsubPresence();
      unsubReqReceived();
      unsubReqAccepted();
    };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  // Handle live search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await FriendsService.searchUsers(text);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Actions
  const handleSendRequest = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      await FriendsService.sendRequest(targetUserId);
      // Update local state in search results
      setSearchResults((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, relationship: 'REQUEST_SENT' } : p))
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Friend Request', err.message || 'Failed to send request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      await FriendsService.acceptRequest(requestId);
      loadData();
    } catch (err: any) {
      Alert.alert('Friend Request', err.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      await FriendsService.rejectRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (err: any) {
      Alert.alert('Friend Request', err.message || 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      await FriendsService.cancelRequest(requestId);
      setOutgoingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (err: any) {
      Alert.alert('Friend Request', err.message || 'Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = (friend: FriendUser) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FriendsService.removeFriend(friend.id);
              setFriends((prev) => prev.filter((f) => f.id !== friend.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const onlineFriendsCount = friends.filter((f) => f.isOnline).length;
  const pendingRequestsCount = incomingRequests.length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
          Social & Friends
        </Text>

        <TouchableOpacity
          onPress={() => setActiveTab('discover')}
          style={[styles.searchShortcutBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Discover players"
        >
          <Icon name="search" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Control Tabs */}
      <View style={[styles.segmentedContainer, { backgroundColor: theme.colors.surfaceElevated }]}>
        {/* Friends Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('friends')}
          style={[
            styles.segmentBtn,
            activeTab === 'friends' && {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Icon
            name="users"
            size={16}
            color={activeTab === 'friends' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'friends' ? theme.colors.textPrimary : theme.colors.textMuted,
                fontWeight: activeTab === 'friends' ? '700' : '500',
              },
            ]}
          >
            Friends
          </Text>
          {friends.length > 0 && (
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor:
                    activeTab === 'friends' ? theme.colors.primary + '20' : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  {
                    color:
                      activeTab === 'friends' ? theme.colors.primary : theme.colors.textMuted,
                  },
                ]}
              >
                {friends.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Requests Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('requests')}
          style={[
            styles.segmentBtn,
            activeTab === 'requests' && {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Icon
            name="bell"
            size={16}
            color={activeTab === 'requests' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'requests' ? theme.colors.textPrimary : theme.colors.textMuted,
                fontWeight: activeTab === 'requests' ? '700' : '500',
              },
            ]}
          >
            Requests
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={[styles.badgePill, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.badgePillText, { color: theme.colors.background }]}>
                {pendingRequestsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Discover Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('discover')}
          style={[
            styles.segmentBtn,
            activeTab === 'discover' && {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Icon
            name="search"
            size={16}
            color={activeTab === 'discover' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'discover' ? theme.colors.textPrimary : theme.colors.textMuted,
                fontWeight: activeTab === 'discover' ? '700' : '500',
              },
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
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
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
              Syncing social graph...
            </Text>
          </View>
        ) : activeTab === 'friends' ? (
          /* ============================================================ */
          /* 1. FRIENDS TAB                                               */
          /* ============================================================ */
          <View>
            {/* Header with Presence Count */}
            <View style={styles.listHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                  All Friends ({friends.length})
                </Text>
                <Text style={[styles.sectionSubheading, { color: theme.colors.textMuted }]}>
                  {onlineFriendsCount} Online Now
                </Text>
              </View>
              {onlineFriendsCount > 0 && (
                <View
                  style={[
                    styles.onlineBadge,
                    { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.success },
                  ]}
                >
                  <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={[styles.onlineBadgeText, { color: theme.colors.success }]}>
                    Active
                  </Text>
                </View>
              )}
            </View>

            {friends.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surface }]}>
                  <Icon name="users" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary }]}>
                  No Friends Yet
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                  Connect with other players to challenge them to Tic-Tac-Toe, play Ludo matches, and track each other's achievements!
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('discover')}
                  style={[styles.emptyCtaBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Icon name="search" size={16} color={theme.colors.background} />
                  <Text style={[styles.emptyCtaBtnText, { color: theme.colors.background }]}>
                    Discover Players
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => onViewProfile?.(friend.id)}
                    style={[
                      styles.playerCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {/* Avatar with Presence */}
                    <Avatar
                      displayName={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      size="md"
                      status={friend.isOnline ? 'online' : 'offline'}
                    />

                    {/* Player Info */}
                    <View style={styles.playerMeta}>
                      <Text
                        style={[styles.playerName, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {friend.displayName}
                      </Text>
                      <Text style={[styles.playerUsername, { color: theme.colors.primary }]}>
                        @{friend.username}
                      </Text>
                      <Text style={[styles.playerStatsText, { color: theme.colors.textMuted }]}>
                        {friend.totalWins} Wins • {friend.winRate}% Win Rate
                      </Text>
                    </View>

                    {/* Quick Action Buttons */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        onPress={() => onNavigateToChat?.(friend.id, friend.username)}
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        ]}
                        activeOpacity={0.7}
                        accessibilityLabel="Direct Message"
                      >
                        <Icon name="chat" size={16} color={theme.colors.textPrimary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => onChallenge?.(friend.id, friend.username)}
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary },
                        ]}
                        activeOpacity={0.7}
                        accessibilityLabel="Challenge to game"
                      >
                        <Icon name="gamepad" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveFriend(friend)}
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        ]}
                        activeOpacity={0.7}
                        accessibilityLabel="More options"
                      >
                        <Icon name="userX" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : activeTab === 'requests' ? (
          /* ============================================================ */
          /* 2. REQUESTS TAB                                              */
          /* ============================================================ */
          <View>
            {/* Incoming Requests */}
            <View style={styles.listHeaderRow}>
              <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                Incoming Requests ({incomingRequests.length})
              </Text>
            </View>

            {incomingRequests.length === 0 ? (
              <View
                style={[
                  styles.emptySubCard,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
              >
                <Icon name="check" size={24} color={theme.colors.textMuted} />
                <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
                  No pending friend invitations
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {incomingRequests.map((req) => (
                  <View
                    key={req.requestId}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => onViewProfile?.(req.user.id)}
                      style={styles.requestUserRow}
                      activeOpacity={0.8}
                    >
                      <Avatar
                        displayName={req.user.displayName}
                        avatarUrl={req.user.avatarUrl}
                        size="md"
                        status={req.user.isOnline ? 'online' : 'offline'}
                      />
                      <View style={styles.playerMeta}>
                        <Text style={[styles.playerName, { color: theme.colors.textPrimary }]}>
                          {req.user.displayName}
                        </Text>
                        <Text style={[styles.playerUsername, { color: theme.colors.primary }]}>
                          @{req.user.username}
                        </Text>
                        <Text style={[styles.playerStatsText, { color: theme.colors.textMuted }]}>
                          {req.user.totalWins} Wins • {req.user.winRate}% Win Rate
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Accept / Decline Action Buttons */}
                    <View style={styles.requestButtonRow}>
                      <TouchableOpacity
                        onPress={() => handleAcceptRequest(req.requestId)}
                        disabled={actionLoadingId === req.requestId}
                        style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                        activeOpacity={0.8}
                      >
                        {actionLoadingId === req.requestId ? (
                          <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                          <>
                            <Icon name="check" size={16} color={theme.colors.background} />
                            <Text style={[styles.btnText, { color: theme.colors.background }]}>
                              Accept
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeclineRequest(req.requestId)}
                        disabled={actionLoadingId === req.requestId}
                        style={[
                          styles.declineBtn,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Icon name="close" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Outgoing Requests */}
            <View style={[styles.listHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                Sent Requests ({outgoingRequests.length})
              </Text>
            </View>

            {outgoingRequests.length === 0 ? (
              <View
                style={[
                  styles.emptySubCard,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>
                  No outgoing requests awaiting response
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {outgoingRequests.map((req) => (
                  <View
                    key={req.requestId}
                    style={[
                      styles.sentCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sentUserRow}>
                      <Avatar
                        displayName={req.user.displayName}
                        avatarUrl={req.user.avatarUrl}
                        size="sm"
                      />
                      <View style={styles.playerMeta}>
                        <Text style={[styles.playerName, { color: theme.colors.textPrimary }]}>
                          {req.user.displayName}
                        </Text>
                        <Text style={[styles.playerUsername, { color: theme.colors.textMuted }]}>
                          @{req.user.username}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(req.requestId)}
                        disabled={actionLoadingId === req.requestId}
                        style={[
                          styles.cancelSentBtn,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelSentText, { color: theme.colors.textMuted }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ============================================================ */
          /* 3. DISCOVER / SEARCH TAB                                     */
          /* ============================================================ */
          <View>
            {/* Search Input Bar */}
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Icon name="search" size={20} color={theme.colors.primary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search players by tag or name..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => handleSearchChange('')}>
                  <Icon name="close" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Results List */}
            {searchQuery.trim().length >= 2 ? (
              searchResults.length === 0 && !isSearching ? (
                <View
                  style={[
                    styles.emptySubCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      marginTop: 16,
                    },
                  ]}
                >
                  <Icon name="search" size={28} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary, marginTop: 8 }]}>
                    No Players Found
                  </Text>
                  <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>
                    No registered player matches "{searchQuery}".
                  </Text>
                </View>
              ) : (
                <View style={[styles.cardsList, { marginTop: 16 }]}>
                  {searchResults.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      onPress={() => onViewProfile?.(player.id)}
                      style={[
                        styles.playerCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Avatar
                        displayName={player.displayName}
                        avatarUrl={player.avatarUrl}
                        size="md"
                        status={player.isOnline ? 'online' : 'offline'}
                      />

                      <View style={styles.playerMeta}>
                        <Text style={[styles.playerName, { color: theme.colors.textPrimary }]}>
                          {player.displayName}
                        </Text>
                        <Text style={[styles.playerUsername, { color: theme.colors.primary }]}>
                          @{player.username}
                        </Text>
                        <Text style={[styles.playerStatsText, { color: theme.colors.textMuted }]}>
                          {player.totalWins} Wins • {player.winRate}% Win Rate
                        </Text>
                      </View>

                      {/* Relationship Action / Badge */}
                      <View>
                        {player.relationship === 'NONE' && (
                          <TouchableOpacity
                            onPress={() => handleSendRequest(player.id)}
                            disabled={actionLoadingId === player.id}
                            style={[styles.addFriendBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.8}
                          >
                            {actionLoadingId === player.id ? (
                              <ActivityIndicator size="small" color={theme.colors.background} />
                            ) : (
                              <>
                                <Icon name="userPlus" size={15} color={theme.colors.background} />
                                <Text style={[styles.addFriendText, { color: theme.colors.background }]}>
                                  Add
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {player.relationship === 'REQUEST_SENT' && (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            ]}
                          >
                            <Icon name="check" size={14} color={theme.colors.textMuted} />
                            <Text style={[styles.statusBadgeText, { color: theme.colors.textMuted }]}>
                              Sent
                            </Text>
                          </View>
                        )}

                        {player.relationship === 'REQUEST_RECEIVED' && (
                          <TouchableOpacity
                            onPress={() => {
                              if (player.requestId) handleAcceptRequest(player.requestId);
                            }}
                            style={[styles.addFriendBtn, { backgroundColor: theme.colors.accent }]}
                            activeOpacity={0.8}
                          >
                            <Icon name="userCheck" size={15} color={theme.colors.background} />
                            <Text style={[styles.addFriendText, { color: theme.colors.background }]}>
                              Accept
                            </Text>
                          </TouchableOpacity>
                        )}

                        {player.relationship === 'FRIENDS' && (
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: theme.colors.accent + '18',
                                borderColor: theme.colors.accent,
                              },
                            ]}
                          >
                            <Icon name="userCheck" size={14} color={theme.colors.accent} />
                            <Text style={[styles.statusBadgeText, { color: theme.colors.accent }]}>
                              Friends
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    marginTop: 16,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surface }]}>
                  <Icon name="search" size={28} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary }]}>
                  Discover Fellow Competitors
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                  Type at least 2 characters to search by gamer tag or username across the entire platform.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchShortcutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 0,
  },
  segmentText: {
    fontSize: 13,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubheading: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    borderWidth: 0,
    gap: 12,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  playerUsername: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  playerStatsText: {
    fontSize: 11,
    marginTop: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
    gap: 12,
  },
  requestUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    gap: 6,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 0,
    gap: 6,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sentCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 0,
  },
  sentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelSentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0,
  },
  cancelSentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 0,
    gap: 10,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addFriendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 0,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  emptyCtaBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptySubText: {
    fontSize: 13,
    marginTop: 4,
  },
});
