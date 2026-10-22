import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
  BackHandler,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameLogo } from '../../components/atoms/GameLogo';
import { GameControllerLogo } from '../../components/atoms/GameControllerLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { useCall } from '../../features/call/CallContext';
import { ChatService, ConversationItem } from '../../services/chat.service';
import { MobileSocketService } from '../../services/socket.service';
import { FriendsService, FriendUser } from '../../services/friends.service';
import { CreateGroupModal } from '../../components/organisms/CreateGroupModal';
import { MessageReceiptTicks } from '../../components/atoms/MessageReceiptTicks';

export interface ChatListScreenProps {
  onBack?: () => void;
  onSelectConversation: (
    peerId: string,
    peerName: string,
    peerUsername: string,
    peerAvatarUrl: string | null,
    conversationId?: string,
    isGroup?: boolean,
    groupMeta?: any
  ) => void;
  onNavigateToFriends?: () => void;
}

export interface CallHistoryItem {
  id: string;
  peerId: string;
  peerName: string;
  peerUsername: string;
  peerAvatarUrl: string | null;
  callType: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  durationSeconds?: number;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type ChatFilterType = 'ALL' | 'UNREAD' | 'FAVORITES' | 'GROUPS' | 'LOCKED' | 'ARCHIVED';

export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  onBack,
  onSelectConversation,
  onNavigateToFriends,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const { startCall } = useCall();
  const insets = useSafeAreaInsets();

  // Top Nav Tab: Chats vs Calls (WhatsApp standard)
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');

  // Filter Chips in Chats
  const [filterChip, setFilterChip] = useState<ChatFilterType>('ALL');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Archive, Favorites & Locked state
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [showLockedChats, setShowLockedChats] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);

  // New Call Launcher Drawer
  const [isNewCallModalVisible, setIsNewCallModalVisible] = useState(false);
  const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);

  // Load archived, favorite & locked IDs
  const loadLocalChatState = useCallback(async () => {
    try {
      const [savedArchived, savedFavs, savedLocked] = await Promise.all([
        AsyncStorage.getItem('@gameapp:archived_convs'),
        AsyncStorage.getItem('@gameapp:favorite_convs'),
        AsyncStorage.getItem('@gameapp:locked_convs'),
      ]);
      if (savedArchived) setArchivedIds(JSON.parse(savedArchived));
      if (savedFavs) setFavoriteIds(JSON.parse(savedFavs));
      if (savedLocked) setLockedIds(JSON.parse(savedLocked));
    } catch (err) {
      console.warn('Failed to load local chat state:', err);
    }
  }, []);

  useEffect(() => {
    loadLocalChatState();
  }, [loadLocalChatState]);

  // Save archived IDs
  const toggleArchive = async (convId: string) => {
    const next = archivedIds.includes(convId)
      ? archivedIds.filter((id) => id !== convId)
      : [...archivedIds, convId];
    setArchivedIds(next);
    await AsyncStorage.setItem('@gameapp:archived_convs', JSON.stringify(next)).catch(() => null);
  };

  // Save favorite IDs
  const toggleFavorite = async (convId: string) => {
    const next = favoriteIds.includes(convId)
      ? favoriteIds.filter((id) => id !== convId)
      : [...favoriteIds, convId];
    setFavoriteIds(next);
    await AsyncStorage.setItem('@gameapp:favorite_convs', JSON.stringify(next)).catch(() => null);
  };

  // Save locked IDs
  const toggleLock = async (convId: string) => {
    const next = lockedIds.includes(convId)
      ? lockedIds.filter((id) => id !== convId)
      : [...lockedIds, convId];
    setLockedIds(next);
    await AsyncStorage.setItem('@gameapp:locked_convs', JSON.stringify(next)).catch(() => null);
  };

  // Handle hardware Back button across modals, search, tabs, and screen exit
  useEffect(() => {
    const handleBack = () => {
      if (isActionModalVisible) {
        setIsActionModalVisible(false);
        return true;
      }
      if (isNewCallModalVisible) {
        setIsNewCallModalVisible(false);
        return true;
      }
      if (isCreateGroupModalVisible) {
        setIsCreateGroupModalVisible(false);
        return true;
      }
      if (showLockedChats) {
        setShowLockedChats(false);
        return true;
      }
      if (searchQuery.trim().length > 0) {
        setSearchQuery('');
        return true;
      }
      if (filterChip !== 'ALL') {
        setFilterChip('ALL');
        return true;
      }
      if (activeTab === 'calls') {
        setActiveTab('chats');
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [
    isActionModalVisible,
    isNewCallModalVisible,
    isCreateGroupModalVisible,
    showLockedChats,
    searchQuery,
    filterChip,
    activeTab,
    onBack,
  ]);

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent && conversations.length === 0) {
      setIsLoading(true);
    }
    try {
      const [data, friendsData] = await Promise.all([
        ChatService.fetchConversations().catch(() => []),
        FriendsService.fetchFriends().catch(() => []),
      ]);
      setConversations(data);
      setFriends(friendsData);

      // Initialize mock recent calls if empty
      if (friendsData.length > 0) {
        const sampleCalls: CallHistoryItem[] = friendsData.slice(0, 4).map((f, idx) => ({
          id: `call_${f.id}_${idx}`,
          peerId: f.id,
          peerName: f.displayName,
          peerUsername: f.username,
          peerAvatarUrl: f.avatarUrl,
          callType: idx % 2 === 0 ? 'video' : 'audio',
          direction: idx === 0 ? 'incoming' : idx === 1 ? 'missed' : 'outgoing',
          timestamp: new Date(Date.now() - (idx + 1) * 3600000 * 4).toISOString(),
          durationSeconds: idx === 1 ? 0 : 142 + idx * 80,
        }));
        setCallHistory(sampleCalls);
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [conversations.length]);

  useEffect(() => {
    // 1. Immediately render cached conversations
    let isMounted = true;
    Promise.all([
      ChatService.getCachedConversations(),
      FriendsService.getCachedFriends(),
    ]).then(([cachedConvs, cachedFriends]) => {
      if (!isMounted) return;
      if (cachedConvs && cachedConvs.length > 0) {
        setConversations(cachedConvs);
        setIsLoading(false);
      }
      if (cachedFriends && cachedFriends.length > 0) {
        setFriends(cachedFriends);
      }
    }).catch(() => null);

    // 2. Fetch fresh conversations in the background
    loadConversations(true);

    // Ensure socket connected
    MobileSocketService.connect();

    // Real-time peer presence listener
    const unsubPresence = MobileSocketService.onPresenceUpdate(({ userId, isOnline }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.peer?.id === userId) {
            return {
              ...c,
              peer: {
                ...c.peer,
                isOnline,
              },
            };
          }
          return c;
        })
      );
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, isOnline } : f))
      );
    });

    // Real-time message incoming listener
    const unsubMsg = MobileSocketService.onMessageReceived((msg) => {
      const isOwn = msg.senderId === authUser?.id;

      // Acknowledge delivery to sender if incoming on this device
      if (!isOwn) {
        MobileSocketService.sendDeliveryConfirmation(msg.conversationId, [msg.id]);
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversationId);
        if (index !== -1) {
          const updated = [...prev];
          const existing = updated[index];
          updated[index] = {
            ...existing,
            updatedAt: msg.createdAt,
            unreadCount: isOwn ? existing.unreadCount : existing.unreadCount + 1,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              type: msg.type,
              status: msg.status,
              senderId: msg.senderId,
              createdAt: msg.createdAt,
            },
          };
          // Move conversation to top
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        } else {
          // New conversation was started, re-fetch
          loadConversations();
          return prev;
        }
      });
    });

    // Real-time message delivered receipts (2 grey ticks)
    const unsubDelivered = MobileSocketService.onMessageDelivered(({ conversationId, messageId, status }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && c.lastMessage.senderId === authUser?.id) {
            if (c.lastMessage.status === 'SENT' || status === 'DELIVERED') {
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  status: c.lastMessage.status === 'READ' ? 'READ' : 'DELIVERED',
                },
              };
            }
          }
          return c;
        })
      );
    });

    // Real-time message read receipts (2 blue ticks)
    const unsubRead = MobileSocketService.onMessagesRead(({ conversationId, status }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && c.lastMessage.senderId === authUser?.id) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: status || 'READ',
              },
            };
          }
          return c;
        })
      );
    });

    // Group real-time events
    const unsubGroupCreated = MobileSocketService.onGroupCreated((groupConv) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === groupConv.id)) return prev;
        return [groupConv, ...prev];
      });
    });

    const unsubGroupUpdated = MobileSocketService.onGroupUpdated((data) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.groupId && c.group
            ? {
                ...c,
                group: {
                  ...c.group,
                  title: data.title !== undefined ? data.title : c.group.title,
                  description: data.description !== undefined ? data.description : c.group.description,
                  avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : c.group.avatarUrl,
                },
              }
            : c
        )
      );
    });

    const unsubGroupMembers = MobileSocketService.onGroupMembersUpdated((data) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.id && c.group
            ? {
                ...c,
                group: {
                  ...c.group,
                  memberCount: data.memberCount,
                  members: data.members,
                },
              }
            : c
        )
      );
    });

    return () => {
      unsubPresence();
      unsubMsg();
      unsubDelivered();
      unsubRead();
      unsubGroupCreated();
      unsubGroupUpdated();
      unsubGroupMembers();
    };
  }, [loadConversations, authUser?.id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
    loadLocalChatState();
  };

  // Filter conversations by search and filter chip
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        if (c.isGroup) {
          const title = c.group?.title?.toLowerCase() || '';
          const desc = c.group?.description?.toLowerCase() || '';
          return title.includes(q) || desc.includes(q);
        }
        const displayName = c.peer?.displayName?.toLowerCase() || '';
        const username = c.peer?.username?.toLowerCase() || '';
        return displayName.includes(q) || username.includes(q);
      });
    }

    // Tab-level chip filtering
    if (filterChip === 'ARCHIVED') {
      return result.filter((c) => archivedIds.includes(c.id));
    }

    if (filterChip === 'LOCKED') {
      return result.filter((c) => lockedIds.includes(c.id));
    }

    // Default: exclude archived unless specifically on Archived chip
    result = result.filter((c) => !archivedIds.includes(c.id));

    // Exclude locked conversations unless specifically on Locked chip
    result = result.filter((c) => !lockedIds.includes(c.id));

    if (filterChip === 'UNREAD') {
      result = result.filter((c) => c.unreadCount > 0);
    } else if (filterChip === 'FAVORITES') {
      result = result.filter((c) => favoriteIds.includes(c.id));
    } else if (filterChip === 'GROUPS') {
      result = result.filter((c) => c.isGroup === true);
    }

    return result;
  }, [conversations, searchQuery, filterChip, archivedIds, favoriteIds, lockedIds, showLockedChats]);

  const onlineFriends = useMemo(() => {
    const map = new Map<string, { id: string; name: string; username: string; avatarUrl: string | null }>();
    friends.filter((f) => f.isOnline).forEach((f) => {
      map.set(f.id, { id: f.id, name: f.displayName, username: f.username, avatarUrl: f.avatarUrl });
    });
    conversations.filter((c) => c.peer?.isOnline).forEach((c) => {
      if (c.peer && !map.has(c.peer.id)) {
        map.set(c.peer.id, { id: c.peer.id, name: c.peer.displayName, username: c.peer.username, avatarUrl: c.peer.avatarUrl });
      }
    });
    return Array.from(map.values());
  }, [friends, conversations]);

  const archivedCount = archivedIds.length;

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const isGroup = item.isGroup;
    if (!item.peer && !isGroup) return null;

    const isOwnLastMessage = item.lastMessage?.senderId === authUser?.id;
    const isUnread = item.unreadCount > 0;
    const isFavorited = favoriteIds.includes(item.id);
    const isLocked = lockedIds.includes(item.id);

    const displayName = isGroup
      ? item.group?.title || 'Group Chat'
      : item.peer?.displayName || 'Player';

    const msgType = item.lastMessage?.type;
    const msgMeta = (item.lastMessage as any)?.metadata;
    let previewContent = item.lastMessage ? item.lastMessage.content : 'No messages yet';
    let previewIconName: string | null = null;
    let previewIconColor: string = theme.mode === 'dark' ? '#8E8E93' : theme.colors.textSecondary;

    if (msgType === 'IMAGE') {
      if (msgMeta?.isViewOnce) {
        previewContent = 'One-time photo';
        previewIconName = 'viewOnce';
        previewIconColor = theme.colors.primary;
      } else {
        previewContent = 'Photo';
        previewIconName = 'camera';
      }
    } else if (msgType === 'VOICE' || msgType === 'AUDIO') {
      previewContent = 'Voice message';
      previewIconName = 'mic';
    } else if (msgType === 'FILE') {
      previewContent = 'File';
      previewIconName = 'file';
    } else if (msgType === 'GAME_INVITE') {
      previewContent = 'Challenge: Game Invite';
      previewIconName = 'gamepad';
      previewIconColor = theme.colors.primary;
    } else if (msgType === 'GAME_RESULT') {
      previewContent = 'Match Result Summary';
      previewIconName = 'trophy';
    } else if (item.lastMessage?.content?.toLowerCase().includes('disappearing')) {
      previewIconName = 'clock';
      previewIconColor = theme.mode === 'dark' ? '#8E8E93' : theme.colors.textMuted;
    } else if (msgType === 'SYSTEM') {
      previewContent = item.lastMessage?.content || '';
    } else if (isGroup && item.lastMessage) {
      const senderPrefix = isOwnLastMessage ? 'You: ' : `${item.lastMessage.senderName || 'Member'}: `;
      previewContent = `${senderPrefix}${previewContent}`;
    }

    return (
      <TouchableOpacity
        onPress={() => {
          if (isGroup) {
            onSelectConversation(
              item.id,
              item.group?.title || 'Group Chat',
              `${item.group?.memberCount || 0} members`,
              item.group?.avatarUrl || null,
              item.id,
              true,
              item.group
            );
          } else {
            onSelectConversation(
              item.peer!.id,
              item.peer!.displayName,
              item.peer!.username,
              item.peer!.avatarUrl,
              item.id,
              false,
              null
            );
          }
        }}
        onLongPress={() => {
          setSelectedConversation(item);
          setIsActionModalVisible(true);
        }}
        style={[
          styles.conversationCard,
          {
            backgroundColor: theme.mode === 'dark' ? '#121212' : theme.colors.surface,
            borderColor: theme.mode === 'dark' ? '#1C1C1C' : theme.colors.border,
          },
        ]}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {isGroup ? (
            item.group?.avatarUrl ? (
              <Avatar
                displayName={item.group.title}
                avatarUrl={item.group.avatarUrl}
                size="md"
              />
            ) : (
              <View
                style={[
                  styles.groupAvatarCircle,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Icon name="users" size={22} color={theme.colors.primary} />
              </View>
            )
          ) : (
            <Avatar
              displayName={item.peer!.displayName}
              avatarUrl={item.peer!.avatarUrl}
              size="md"
              status={item.peer!.isOnline ? 'online' : 'offline'}
            />
          )}
        </View>

        {/* Conversation Metadata */}
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[
                styles.displayNameText,
                { color: theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {isGroup && (
              <View style={[styles.groupTagPill, { backgroundColor: theme.colors.primary + '18' }]}>
                <Icon name="users" size={10} color={theme.colors.primary} />
                <Text style={[styles.groupTagText, { color: theme.colors.primary }]}>
                  {item.group?.memberCount || 0}
                </Text>
              </View>
            )}
            {isLocked && (
              <Icon name="lock" size={12} color={theme.colors.warning} />
            )}
            {isFavorited && (
              <Icon name="star" size={12} color="#F59E0B" />
            )}
          </View>

          <View style={styles.previewContainer}>
            {isOwnLastMessage && item.lastMessage && item.lastMessage.type !== 'SYSTEM' && (
              <View style={styles.deliveryStatusTick}>
                <MessageReceiptTicks status={item.lastMessage.status} size={14} />
              </View>
            )}
            {previewIconName && (
              <View style={{ marginRight: 4, alignSelf: 'center' }}>
                <Icon name={previewIconName as any} size={13} color={previewIconColor} />
              </View>
            )}
            {item.lastMessage?.type === 'GAME_INVITE' && (
              <View style={styles.inviteIconBadge}>
                <GameLogo
                  gameType={(item.lastMessage as any)?.metadata?.gameType}
                  size={15}
                  borderRadius={4}
                  fallbackIcon="gamepad"
                />
              </View>
            )}
            <Text
              style={[
                styles.previewText,
                {
                  color: isUnread ? (theme.mode === 'dark' ? '#FFFFFF' : theme.colors.textPrimary) : (theme.mode === 'dark' ? '#94A3B8' : theme.colors.textSecondary),
                  fontStyle: item.lastMessage?.type === 'SYSTEM' ? 'italic' : 'normal',
                },
              ]}
              numberOfLines={1}
            >
              {previewContent}
            </Text>
          </View>
        </View>

        {/* Right Stack: Time, Unread Badge & Call Actions */}
        <View style={styles.cardRightCol}>
          <Text style={[styles.timeAgoText, { color: theme.colors.textMuted }]}>
            {formatTimeAgo(item.lastMessage?.createdAt || item.updatedAt)}
          </Text>

          <View style={styles.cardRightBottomRow}>
            {/* Unread Pill Badge */}
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accentCoral || theme.colors.primary }]}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}

            {/* Quick Call Action Shortcuts (only for 1-on-1 chats) */}
            {!isGroup && item.peer && (
              <View style={styles.cardCallActions}>
                <TouchableOpacity
                  onPress={() =>
                    startCall(
                      item.peer!.id,
                      item.peer!.displayName,
                      item.peer!.username,
                      item.peer!.avatarUrl,
                      'audio'
                    )
                  }
                  style={[
                    styles.cardCallBtn,
                    {
                      backgroundColor: theme.colors.primary + '15',
                      borderColor: theme.colors.primary + '30',
                    },
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Audio Call"
                >
                  <Icon name="audioCall" size={15} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    startCall(
                      item.peer!.id,
                      item.peer!.displayName,
                      item.peer!.username,
                      item.peer!.avatarUrl,
                      'video'
                    )
                  }
                  style={[
                    styles.cardCallBtn,
                    {
                      backgroundColor: theme.colors.primary + '15',
                      borderColor: theme.colors.primary + '30',
                    },
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Video Call"
                >
                  <Icon name="videoCall" size={15} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCallHistoryItem = ({ item }: { item: CallHistoryItem }) => {
    const isMissed = item.direction === 'missed';
    const isIncoming = item.direction === 'incoming';

    return (
      <View
        style={[
          styles.callCard,
          {
            backgroundColor: theme.mode === 'dark' ? '#121212' : theme.colors.surfaceElevated,
            borderColor: theme.mode === 'dark' ? '#1E1E1E' : theme.colors.border,
          },
        ]}
      >
        <Avatar
          displayName={item.peerName}
          avatarUrl={item.peerAvatarUrl}
          size="md"
        />

        <View style={styles.callCardContent}>
          <Text
            style={[
              styles.callPeerName,
              { color: isMissed ? '#EF4444' : theme.colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {item.peerName}
          </Text>

          <View style={styles.callMetaRow}>
            {/* Direction Arrow */}
            <View style={{ transform: [{ rotate: isIncoming ? '45deg' : isMissed ? '135deg' : '-45deg' }] }}>
              <Icon
                name="arrowRight"
                size={13}
                color={isMissed ? '#EF4444' : isIncoming ? '#22C55E' : theme.colors.textMuted}
              />
            </View>
            <Text style={[styles.callTimeText, { color: theme.colors.textMuted }]}>
              {formatTimeAgo(item.timestamp)}
              {item.durationSeconds ? ` • ${Math.floor(item.durationSeconds / 60)}m ${item.durationSeconds % 60}s` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() =>
            startCall(
              item.peerId,
              item.peerName,
              item.peerUsername,
              item.peerAvatarUrl,
              item.callType
            )
          }
          style={[
            styles.callTriggerBtn,
            {
              backgroundColor: theme.colors.primary + '15',
              borderColor: theme.colors.primary + '30',
            },
          ]}
          activeOpacity={0.7}
        >
          <Icon
            name={item.callType === 'video' ? 'videoCall' : 'audioCall'}
            size={16}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Compact Top Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: theme.mode === 'dark' ? '#141414' : theme.colors.border }]}>
        <View style={styles.headerLeftCol}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={[
                styles.headerIconBtn,
                { backgroundColor: theme.mode === 'dark' ? '#141414' : theme.colors.surfaceElevated },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerBrandRow}>
            <Image
              source={require('../../assets/images/chat_icon_logo.webp')}
              style={styles.headerBrandLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerBrandText, { color: theme.colors.textPrimary }]}>Chats</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => searchInputRef.current?.focus()}
            style={[
              styles.headerIconBtn,
              { backgroundColor: theme.mode === 'dark' ? '#141414' : theme.colors.surfaceElevated },
            ]}
            activeOpacity={0.7}
            accessibilityLabel="Search conversations"
          >
            <Icon name="search" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsCreateGroupModalVisible(true)}
            style={[
              styles.newGroupBtn,
              {
                backgroundColor: theme.colors.primary + '15',
                borderColor: theme.colors.primary + '30',
              },
            ]}
            activeOpacity={0.75}
            accessibilityLabel="Create New Group"
          >
            <Icon name="users" size={14} color={theme.colors.primary} />
            <Text style={[styles.newGroupBtnText, { color: theme.colors.primary }]}>
              New Group
            </Text>
          </TouchableOpacity>

          {onNavigateToFriends && (
            <TouchableOpacity
              onPress={onNavigateToFriends}
              style={[
                styles.headerIconBtn,
                { backgroundColor: theme.mode === 'dark' ? '#141414' : theme.colors.surfaceElevated },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Friends list"
            >
              <Icon name="friendsAdd" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* WhatsApp-Style Top Tab Switcher: [ Chats ]  [ Calls ] */}
      <View style={[styles.tabSwitcher, { borderBottomColor: theme.mode === 'dark' ? '#141414' : theme.colors.divider }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('chats')}
          style={styles.tabItem}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabItemText,
              {
                color: activeTab === 'chats' ? theme.colors.primary : theme.colors.textMuted,
                fontWeight: activeTab === 'chats' ? '700' : '600',
              },
            ]}
          >
            Chats
          </Text>
          {activeTab === 'chats' && (
            <View style={[styles.tabActiveBar, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('calls')}
          style={styles.tabItem}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabItemText,
              {
                color: activeTab === 'calls' ? theme.colors.primary : theme.colors.textMuted,
                fontWeight: activeTab === 'calls' ? '700' : '600',
              },
            ]}
          >
            Calls
          </Text>
          {activeTab === 'calls' && (
            <View style={[styles.tabActiveBar, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* CHATS TAB VIEW */}
      {activeTab === 'chats' && (
        <>
          {/* Rounded Pill Search Input */}
          <View style={styles.searchWrapper}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.mode === 'dark' ? '#141414' : theme.colors.surfaceElevated,
                  borderColor: theme.mode === 'dark' ? '#202020' : theme.colors.border,
                },
              ]}
            >
              <Icon name="search" size={17} color={theme.mode === 'dark' ? '#8E8E93' : theme.colors.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search conversations..."
                placeholderTextColor={theme.mode === 'dark' ? '#8E8E93' : theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={15} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Chips (All, Unread, Favorites, Groups, Locked, Archived) without Icons */}
          <View style={styles.filterChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['ALL', 'UNREAD', 'FAVORITES', 'GROUPS', 'LOCKED', 'ARCHIVED'] as ChatFilterType[]).map((chip) => {
                const isSelected = filterChip === chip;
                const label =
                  chip === 'ALL'
                    ? 'All'
                    : chip === 'UNREAD'
                    ? 'Unread'
                    : chip === 'FAVORITES'
                    ? 'Favorites'
                    : chip === 'GROUPS'
                    ? 'Groups'
                    : chip === 'LOCKED'
                    ? `Locked${lockedIds.length > 0 ? ` (${lockedIds.length})` : ''}`
                    : `Archived${archivedCount > 0 ? ` (${archivedCount})` : ''}`;

                const chipBg = isSelected
                  ? theme.colors.primary
                  : theme.colors.surfaceElevated;

                const chipBorder = isSelected
                  ? theme.colors.primary
                  : theme.colors.border;

                const chipTextColor = isSelected
                  ? theme.colors.textOnPrimary
                  : theme.colors.textSecondary;

                return (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => setFilterChip(chip)}
                    style={[
                      styles.filterChipBtn,
                      {
                        backgroundColor: chipBg,
                        borderColor: chipBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: chipTextColor,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Archived Chats Header Banner (when not already on Archived chip and archives exist) */}
          {filterChip !== 'ARCHIVED' && archivedCount > 0 && !searchQuery && (
            <TouchableOpacity
              onPress={() => setFilterChip('ARCHIVED')}
              style={[
                styles.archiveBanner,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <View style={styles.archiveBannerLeft}>
                <View style={[styles.archiveIconCircle, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Icon name="archive" size={16} color={theme.colors.primary} />
                </View>
                <Text style={[styles.archiveBannerTitle, { color: theme.colors.textPrimary }]}>
                  Archived
                </Text>
              </View>
              <Text style={[styles.archiveBannerCount, { color: theme.colors.primary }]}>
                {archivedCount}
              </Text>
            </TouchableOpacity>
          )}

          {/* Online Friends Horizontal Row */}
          {onlineFriends.length > 0 && !searchQuery && filterChip === 'ALL' && (
            <View style={[styles.onlineSection, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.onlineHeaderRow}>
                <View style={[styles.onlineDotIndicator, { backgroundColor: theme.colors.online }]} />
                <Text style={[styles.onlineHeaderTitle, { color: theme.colors.textMuted }]}>
                  ONLINE NOW ({onlineFriends.length})
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.onlineScrollContent}
              >
                {onlineFriends.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => onSelectConversation(f.id, f.name, f.username, f.avatarUrl)}
                    style={styles.onlineFriendItem}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      displayName={f.name}
                      avatarUrl={f.avatarUrl}
                      size="md"
                      status="online"
                    />
                    <Text
                      style={[styles.onlineFriendName, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {f.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content Area */}
          {isLoading && filteredConversations.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surface }]}>
                  <Icon name={filterChip === 'LOCKED' ? 'lock' : 'chat'} size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  {searchQuery
                    ? 'No Matches Found'
                    : filterChip === 'LOCKED'
                    ? 'No Locked Chats'
                    : filterChip === 'ARCHIVED'
                    ? 'No Archived Chats'
                    : filterChip === 'UNREAD'
                    ? 'No Unread Messages'
                    : filterChip === 'GROUPS'
                    ? 'No Groups Yet'
                    : filterChip === 'FAVORITES'
                    ? 'No Favorite Chats'
                    : 'No Conversations Yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  {searchQuery
                    ? `No conversations match "${searchQuery}"`
                    : filterChip === 'LOCKED'
                    ? 'Lock any conversation from its chat menu or long-press options to keep it private.'
                    : filterChip === 'ARCHIVED'
                    ? 'Long-press any conversation card to archive it.'
                    : filterChip === 'FAVORITES'
                    ? 'Long-press any conversation to mark as favorite.'
                    : 'Add friends to see feeds and play! Start direct chats, voice & video calls, and challenges.'}
                </Text>
                {filterChip === 'GROUPS' && !searchQuery && (
                  <TouchableOpacity
                    onPress={() => setIsCreateGroupModalVisible(true)}
                    style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Icon name="users" size={16} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.emptyActionBtnText, { color: theme.colors.textOnPrimary }]}>
                      Create a Group
                    </Text>
                  </TouchableOpacity>
                )}
                {onNavigateToFriends && !searchQuery && filterChip === 'ALL' && (
                  <TouchableOpacity
                    onPress={onNavigateToFriends}
                    style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Icon name="users" size={16} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.emptyActionBtnText, { color: theme.colors.textOnPrimary }]}>
                      Find Friends to Message
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            />
          )}
        </>
      )}

      {/* CALLS TAB VIEW */}
      {activeTab === 'calls' && (
        <View style={{ flex: 1 }}>
          {callHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surface }]}>
                  <Icon name="audioCall" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  No Recent Calls
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Tap the green call button below to start a crystal-clear audio or video call with any friend!
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              data={callHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderCallHistoryItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* WhatsApp-Style Floating Action Call Button (FAB) */}
          <TouchableOpacity
            style={[
              styles.floatingCallFab,
              {
                backgroundColor: '#22C55E',
                bottom: Math.max(98, 70 + (insets.bottom || 0)),
              },
            ]}
            onPress={() => setIsNewCallModalVisible(true)}
            activeOpacity={0.85}
            accessibilityLabel="Start a new call"
          >
            <Icon name="audioCall" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Conversation Long-Press Actions Modal */}
      <Modal
        visible={isActionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsActionModalVisible(false)}
        >
          <View
            style={[
              styles.actionSheetContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.actionSheetGrab, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.actionSheetTitle, { color: theme.colors.textPrimary }]}>
              {selectedConversation?.peer?.displayName || 'Chat Options'}
            </Text>

            {/* Archive / Unarchive */}
            <TouchableOpacity
              style={[styles.actionSheetItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => {
                if (selectedConversation) {
                  toggleArchive(selectedConversation.id);
                  setIsActionModalVisible(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="archive" size={18} color={theme.colors.primary} />
              <Text style={[styles.actionSheetText, { color: theme.colors.textPrimary }]}>
                {selectedConversation && archivedIds.includes(selectedConversation.id)
                  ? 'Unarchive Chat'
                  : 'Archive Chat'}
              </Text>
            </TouchableOpacity>

            {/* Favorite / Unfavorite */}
            <TouchableOpacity
              style={[styles.actionSheetItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => {
                if (selectedConversation) {
                  toggleFavorite(selectedConversation.id);
                  setIsActionModalVisible(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="star" size={18} color="#F59E0B" />
              <Text style={[styles.actionSheetText, { color: theme.colors.textPrimary }]}>
                {selectedConversation && favoriteIds.includes(selectedConversation.id)
                  ? 'Remove from Favorites'
                  : 'Mark as Favorite'}
              </Text>
            </TouchableOpacity>

            {/* Lock / Unlock */}
            <TouchableOpacity
              style={[styles.actionSheetItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => {
                if (selectedConversation) {
                  toggleLock(selectedConversation.id);
                  setIsActionModalVisible(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="lock" size={18} color={theme.colors.warning} />
              <Text style={[styles.actionSheetText, { color: theme.colors.textPrimary }]}>
                {selectedConversation && lockedIds.includes(selectedConversation.id)
                  ? 'Unlock Chat'
                  : 'Lock Chat'}
              </Text>
            </TouchableOpacity>

            {/* Delete Chat */}
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                if (selectedConversation) {
                  setIsActionModalVisible(false);
                  Alert.alert(
                    'Delete Conversation',
                    `Are you sure you want to delete this chat with ${selectedConversation.peer?.displayName}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          setConversations((prev) =>
                            prev.filter((c) => c.id !== selectedConversation.id)
                          );
                        },
                      },
                    ]
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="userX" size={18} color="#EF4444" />
              <Text style={[styles.actionSheetText, { color: '#EF4444' }]}>
                Delete Conversation
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp-Style New Call Drawer Modal */}
      <Modal
        visible={isNewCallModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNewCallModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsNewCallModalVisible(false)}
        >
          <View
            style={[
              styles.newCallDrawerContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.actionSheetGrab, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.actionSheetTitle, { color: theme.colors.textPrimary }]}>
              New Call with Friends
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {friends.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginVertical: 20 }}>
                  No friends found yet. Add friends to start live calls!
                </Text>
              ) : (
                friends.map((friend) => (
                  <View
                    key={friend.id}
                    style={[styles.friendCallRow, { borderBottomColor: theme.colors.divider }]}
                  >
                    <Avatar
                      displayName={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      size="md"
                      status={friend.isOnline ? 'online' : 'offline'}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.friendCallName, { color: theme.colors.textPrimary }]}>
                        {friend.displayName}
                      </Text>
                      <Text style={{ fontSize: 11, color: friend.isOnline ? theme.colors.online : theme.colors.textMuted }}>
                        {friend.isOnline ? 'online' : `@${friend.username}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setIsNewCallModalVisible(false);
                          startCall(friend.id, friend.displayName, friend.username, friend.avatarUrl, 'audio');
                        }}
                        style={[styles.quickCallActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                      >
                        <Icon name="audioCall" size={18} color="#22C55E" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setIsNewCallModalVisible(false);
                          startCall(friend.id, friend.displayName, friend.username, friend.avatarUrl, 'video');
                        }}
                        style={[styles.quickCallActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                      >
                        <Icon name="videoCall" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Create Group Modal */}
      <CreateGroupModal
        visible={isCreateGroupModalVisible}
        onClose={() => setIsCreateGroupModalVisible(false)}
        onGroupCreated={(newGroup) => {
          setConversations((prev) => [newGroup, ...prev.filter((c) => c.id !== newGroup.id)]);
          onSelectConversation(
            newGroup.id,
            newGroup.group?.title || 'Group Chat',
            `${newGroup.group?.memberCount || 0} members`,
            newGroup.group?.avatarUrl || null,
            newGroup.id,
            true,
            newGroup.group
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandLogo: {
    width: 28,
    height: 28,
  },
  headerBrandText: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  newGroupBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    gap: 28,
  },
  tabItem: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  tabItemText: {
    fontSize: 15,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  filterChipsRow: {
    paddingVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  archiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  archiveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  archiveIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  archiveBannerCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
    gap: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  groupAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayNameText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  groupTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  groupTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeAgoText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  cardRightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  deliveryStatusTick: {
    marginRight: 2,
  },
  inviteIconBadge: {
    marginRight: 2,
  },
  previewText: {
    fontSize: 13,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardCallActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  onlineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  onlineDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  onlineFriendItem: {
    alignItems: 'center',
    gap: 5,
    width: 58,
  },
  onlineFriendName: {
    fontSize: 11,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 6,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  callCardContent: {
    flex: 1,
    gap: 3,
  },
  callPeerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  callTimeText: {
    fontSize: 12,
  },
  callTriggerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCallFab: {
    position: 'absolute',
    bottom: 98,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 99,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetGrab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionSheetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newCallDrawerContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  friendCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendCallName: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickCallActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
