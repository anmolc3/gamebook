import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ChatService, ConversationItem } from '../../services/chat.service';
import { MobileSocketService } from '../../services/socket.service';

export interface ChatListScreenProps {
  onBack?: () => void;
  onSelectConversation: (
    peerId: string,
    peerName: string,
    peerUsername: string,
    peerAvatarUrl: string | null,
    conversationId?: string
  ) => void;
  onNavigateToFriends?: () => void;
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

export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  onBack,
  onSelectConversation,
  onNavigateToFriends,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await ChatService.fetchConversations();
      setConversations(data);
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

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
    });

    // Real-time message incoming listener
    const unsubMsg = MobileSocketService.onMessageReceived((msg) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversationId);
        if (index !== -1) {
          const updated = [...prev];
          const existing = updated[index];
          const isOwn = msg.senderId === authUser?.id;
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

    // Real-time message read receipts
    const unsubRead = MobileSocketService.onMessagesRead(({ conversationId }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && c.lastMessage.senderId === authUser?.id) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: 'READ',
              },
            };
          }
          return c;
        })
      );
    });

    return () => {
      unsubPresence();
      unsubMsg();
      unsubRead();
    };
  }, [loadConversations, authUser?.id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const displayName = c.peer?.displayName?.toLowerCase() || '';
    const username = c.peer?.username?.toLowerCase() || '';
    return displayName.includes(q) || username.includes(q);
  });

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    if (!item.peer) return null;

    const isOwnLastMessage = item.lastMessage?.senderId === authUser?.id;
    const isUnread = item.unreadCount > 0;

    let previewContent = item.lastMessage ? item.lastMessage.content : 'No messages yet';
    if (item.lastMessage?.type === 'GAME_INVITE') {
      previewContent = 'Challenge: Game Invitation';
    } else if (item.lastMessage?.type === 'GAME_RESULT') {
      previewContent = 'Match Result Summary';
    }

    return (
      <TouchableOpacity
        onPress={() =>
          onSelectConversation(
            item.peer!.id,
            item.peer!.displayName,
            item.peer!.username,
            item.peer!.avatarUrl,
            item.id
          )
        }
        style={[
          styles.conversationCard,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: isUnread ? theme.colors.primary + '50' : theme.colors.border,
          },
        ]}
        activeOpacity={0.7}
      >
        {/* Peer Avatar with Presence */}
        <Avatar
          displayName={item.peer.displayName}
          avatarUrl={item.peer.avatarUrl}
          size="md"
          status={item.peer.isOnline ? 'online' : 'offline'}
        />

        {/* Conversation Metadata */}
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.displayNameText,
                { color: theme.colors.textPrimary },
                isUnread && styles.unreadTextBold,
              ]}
              numberOfLines={1}
            >
              {item.peer.displayName}
            </Text>
            <Text style={[styles.timeAgoText, { color: theme.colors.textMuted }]}>
              {formatTimeAgo(item.lastMessage?.createdAt || item.updatedAt)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.previewContainer}>
              {isOwnLastMessage && item.lastMessage && (
                <View style={styles.deliveryStatusTick}>
                  {item.lastMessage.status === 'READ' ? (
                    <Icon name="doubleCheck" size={14} color={theme.colors.primary} />
                  ) : item.lastMessage.status === 'DELIVERED' ? (
                    <Icon name="doubleCheck" size={14} color={theme.colors.textMuted} />
                  ) : (
                    <Icon name="check" size={14} color={theme.colors.textMuted} />
                  )}
                </View>
              )}
              {item.lastMessage?.type === 'GAME_INVITE' && (
                <View style={styles.inviteIconBadge}>
                  <Icon name="gamepad" size={13} color={theme.colors.accent} />
                </View>
              )}
              <Text
                style={[
                  styles.previewText,
                  {
                    color: isUnread ? theme.colors.textPrimary : theme.colors.textSecondary,
                  },
                  isUnread && styles.unreadTextBold,
                ]}
                numberOfLines={1}
              >
                {previewContent}
              </Text>
            </View>

            {/* Unread Pill Badge */}
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.unreadBadgeText, { color: theme.colors.textOnPrimary }]}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Messages
        </Text>

        {onNavigateToFriends ? (
          <TouchableOpacity
            onPress={onNavigateToFriends}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Friends list"
          >
            <Icon name="users" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Search Input Filter */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Icon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading conversations...
          </Text>
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
              <Icon name="chat" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {searchQuery ? 'No Matches Found' : 'No Conversations Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery
                ? `No conversations match "${searchQuery}"`
                : 'Start a direct chat with your friends, invite them to match challenges, and exchange strategy tips!'}
            </Text>
            {onNavigateToFriends && !searchQuery && (
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayNameText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  unreadTextBold: {
    fontWeight: '700',
  },
  timeAgoText: {
    fontSize: 12,
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  deliveryStatusTick: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteIconBadge: {
    marginRight: 2,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
