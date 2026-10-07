import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MobileSocketService } from '../../services/socket.service';

export interface ConversationScreenProps {
  peerId: string;
  peerName?: string;
  peerUsername?: string;
  peerAvatarUrl?: string | null;
  initialConversationId?: string;
  onBack: () => void;
  onJoinGameRoom?: (roomCode: string, gameType: string) => void;
  onNavigateToProfile?: (userId: string) => void;
}

function formatMessageTime(dateString: string): string {
  const d = new Date(dateString);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  peerId,
  peerName = 'Player',
  peerUsername = '',
  peerAvatarUrl = null,
  initialConversationId,
  onBack,
  onJoinGameRoom,
  onNavigateToProfile,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [peerOnline, setPeerOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingActiveRef = useRef<boolean>(false);

  // Initialize conversation and load messages
  const initializeConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      let targetConvId = conversationId;

      if (!targetConvId) {
        const conv = await ChatService.getOrCreateConversation(peerId);
        targetConvId = conv.id;
        setConversationId(conv.id);
        if (conv.peer) {
          setPeerOnline(conv.peer.isOnline);
        }
      }

      if (targetConvId) {
        // Join socket room
        MobileSocketService.joinConversation(targetConvId);
        // Load messages
        const msgs = await ChatService.fetchMessages(targetConvId, 60);
        setMessages(msgs);
        // Mark unread messages as read
        await ChatService.markAsRead(targetConvId);
      }
    } catch (err: any) {
      console.warn('Failed to load conversation:', err);
      Alert.alert('Error', err.message || 'Unable to open conversation');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, peerId]);

  useEffect(() => {
    MobileSocketService.connect();
    initializeConversation();

    // Listen to real-time incoming messages
    const unsubMsg = MobileSocketService.onMessageReceived((msg) => {
      if (conversationId && msg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, isOwnMessage: msg.senderId === authUser?.id }];
        });

        // If message is from peer, mark as read
        if (msg.senderId !== authUser?.id) {
          ChatService.markAsRead(conversationId).catch(() => null);
        }
      }
    });

    // Listen to read receipts from peer
    const unsubRead = MobileSocketService.onMessagesRead(({ conversationId: readConvId }) => {
      if (conversationId && readConvId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.isOwnMessage ? { ...m, status: 'READ' } : m))
        );
      }
    });

    // Listen to peer typing indicators
    const unsubTyping = MobileSocketService.onUserTyping((data) => {
      if (conversationId && data.conversationId === conversationId && data.userId === peerId) {
        setIsPeerTyping(data.isTyping);
      }
    });

    // Listen to peer presence updates
    const unsubPresence = MobileSocketService.onPresenceUpdate(({ userId, isOnline }) => {
      if (userId === peerId) {
        setPeerOnline(isOnline);
      }
    });

    return () => {
      if (conversationId) {
        MobileSocketService.sendTyping(conversationId, false);
        MobileSocketService.leaveConversation(conversationId);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      unsubMsg();
      unsubRead();
      unsubTyping();
      unsubPresence();
    };
  }, [conversationId, peerId, authUser?.id, initializeConversation]);

  // Handle typing debounce
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!conversationId) return;

    if (!isTypingActiveRef.current && text.length > 0) {
      isTypingActiveRef.current = true;
      MobileSocketService.sendTyping(conversationId, true);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (text.length > 0) {
      typingTimerRef.current = setTimeout(() => {
        if (conversationId) {
          MobileSocketService.sendTyping(conversationId, false);
        }
        isTypingActiveRef.current = false;
      }, 2000);
    } else {
      if (conversationId) {
        MobileSocketService.sendTyping(conversationId, false);
      }
      isTypingActiveRef.current = false;
    }
  };

  // Send standard text message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !conversationId || isSending) return;

    try {
      setIsSending(true);
      setInputText('');

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      isTypingActiveRef.current = false;
      MobileSocketService.sendTyping(conversationId, false);

      const newMsg = await ChatService.sendMessage(conversationId, trimmed, 'TEXT');

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, isOwnMessage: true }];
      });
    } catch (err: any) {
      console.warn('Failed to send message:', err);
      Alert.alert('Send Failed', err.message || 'Could not send message');
    } finally {
      setIsSending(false);
    }
  };

  // Send game challenge invite
  const handleSendGameInvite = async (gameType: 'TIC_TAC_TOE' | 'LUDO') => {
    if (!conversationId) return;

    try {
      setShowInviteModal(false);
      const prefix = gameType === 'TIC_TAC_TOE' ? 'TTT' : 'LUDO';
      const roomCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const gameLabel = gameType === 'TIC_TAC_TOE' ? 'Tic-Tac-Toe' : 'Ludo';
      const inviteContent = `Challenged you to a game of ${gameLabel}! Room code: ${roomCode}`;

      const newMsg = await ChatService.sendMessage(
        conversationId,
        inviteContent,
        'GAME_INVITE',
        { gameType, roomCode, hostName: authUser?.displayName || 'Host' }
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, isOwnMessage: true }];
      });
    } catch (err: any) {
      Alert.alert('Invite Error', err.message || 'Could not send game invitation');
    }
  };

  // Render individual message bubble
  const renderMessageBubble = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.isOwnMessage;
    const isGameInvite = item.type === 'GAME_INVITE';

    if (isGameInvite) {
      const gameType = item.metadata?.gameType || 'TIC_TAC_TOE';
      const roomCode = item.metadata?.roomCode || 'TTT-0000';
      const isTicTacToe = gameType === 'TIC_TAC_TOE';

      return (
        <View
          style={[
            styles.messageRow,
            isOwn ? styles.messageRowOwn : styles.messageRowPeer,
          ]}
        >
          <View
            style={[
              styles.inviteCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            {/* Invite Card Header */}
            <View style={styles.inviteCardHeader}>
              <View
                style={[
                  styles.inviteIconCircle,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Icon
                  name={isTicTacToe ? 'target' : 'dice'}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.inviteCardTitleCol}>
                <Text style={[styles.inviteCardTitle, { color: theme.colors.textPrimary }]}>
                  {isTicTacToe ? 'Tic-Tac-Toe Challenge' : 'Ludo Match Challenge'}
                </Text>
                <Text style={[styles.inviteCardSubtitle, { color: theme.colors.textSecondary }]}>
                  {isOwn ? 'You challenged this player' : `Challenge from @${peerUsername}`}
                </Text>
              </View>
            </View>

            {/* Room Code Pill */}
            <View
              style={[
                styles.roomCodePill,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.roomCodeLabel, { color: theme.colors.textMuted }]}>
                Room Code:
              </Text>
              <Text style={[styles.roomCodeValue, { color: theme.colors.accent }]}>
                {roomCode}
              </Text>
            </View>

            {/* Interactive Join / Accept Button */}
            <TouchableOpacity
              onPress={() => {
                if (onJoinGameRoom) {
                  onJoinGameRoom(roomCode, gameType);
                } else {
                  Alert.alert(
                    'Join Game Room',
                    `Joining ${isTicTacToe ? 'Tic-Tac-Toe' : 'Ludo'} room: ${roomCode}.\nGame rooms will open in Phase 7!`
                  );
                }
              }}
              style={[
                styles.joinGameBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              activeOpacity={0.8}
            >
              <Icon name="gamepad" size={16} color={theme.colors.textOnPrimary} />
              <Text style={[styles.joinGameBtnText, { color: theme.colors.textOnPrimary }]}>
                {isOwn ? 'View Room Lobby' : 'Accept & Join Match'}
              </Text>
            </TouchableOpacity>

            {/* Timestamp & Status */}
            <View style={styles.inviteMetaRow}>
              <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {isOwn && (
                <View style={styles.statusTick}>
                  {item.status === 'READ' ? (
                    <Icon name="doubleCheck" size={14} color={theme.colors.primary} />
                  ) : item.status === 'DELIVERED' ? (
                    <Icon name="doubleCheck" size={14} color={theme.colors.textMuted} />
                  ) : (
                    <Icon name="check" size={14} color={theme.colors.textMuted} />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowPeer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isOwn
              ? [
                  styles.bubbleOwn,
                  { backgroundColor: theme.colors.primary },
                ]
              : [
                  styles.bubblePeer,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? theme.colors.textOnPrimary : theme.colors.textPrimary },
            ]}
          >
            {item.content}
          </Text>

          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.timeText,
                { color: isOwn ? theme.colors.textOnPrimary + 'AA' : theme.colors.textMuted },
              ]}
            >
              {formatMessageTime(item.createdAt)}
            </Text>

            {isOwn && (
              <View style={styles.statusTick}>
                {item.status === 'READ' ? (
                  <Icon name="doubleCheck" size={13} color={theme.colors.textOnPrimary} />
                ) : item.status === 'DELIVERED' ? (
                  <Icon
                    name="doubleCheck"
                    size={13}
                    color={theme.colors.textOnPrimary + '88'}
                  />
                ) : (
                  <Icon
                    name="check"
                    size={13}
                    color={theme.colors.textOnPrimary + '88'}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Peer Info with Online Presence */}
        <TouchableOpacity
          onPress={() => onNavigateToProfile?.(peerId)}
          style={styles.peerHeaderContent}
          activeOpacity={0.8}
        >
          <Avatar
            displayName={peerName}
            avatarUrl={peerAvatarUrl}
            size="sm"
            status={peerOnline ? 'online' : 'offline'}
          />
          <View style={styles.peerHeaderTextCol}>
            <Text style={[styles.peerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {peerName}
            </Text>
            <View style={styles.presenceRow}>
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: peerOnline ? theme.colors.online : theme.colors.offline },
                ]}
              />
              <Text
                style={[
                  styles.presenceText,
                  { color: peerOnline ? theme.colors.online : theme.colors.textMuted },
                ]}
              >
                {peerOnline ? 'Active Now' : 'Offline'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Direct Challenge Shortcut */}
        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          style={[styles.challengeIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Send Game Challenge"
        >
          <Icon name="gamepad" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages Stream */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageBubble}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Real-time Typing Indicator */}
        {isPeerTyping && (
          <View
            style={[
              styles.typingIndicatorRow,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.typingDotAnimation}>
              <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.colors.primary, opacity: 0.7 }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.colors.primary, opacity: 0.4 }]} />
            </View>
            <Text style={[styles.typingText, { color: theme.colors.textMuted }]}>
              {peerName} is typing...
            </Text>
          </View>
        )}

        {/* Input Controls Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowInviteModal(true)}
            style={[styles.inviteTriggerBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel="Game Invite"
          >
            <Icon name="gamepad" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim()
                  ? theme.colors.primary
                  : theme.colors.surface,
                opacity: inputText.trim() ? 1 : 0.4,
              },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
            ) : (
              <Icon
                name="send"
                size={18}
                color={inputText.trim() ? theme.colors.textOnPrimary : theme.colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Game Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Icon name="gamepad" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Challenge {peerName}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Select a game to send an instant match invitation directly in this chat.
              </Text>
            </View>

            {/* Game Options */}
            <TouchableOpacity
              onPress={() => handleSendGameInvite('TIC_TAC_TOE')}
              style={[
                styles.gameSelectOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.gameSelectIcon, { backgroundColor: '#3B82F620' }]}>
                <Icon name="target" size={22} color="#3B82F6" />
              </View>
              <View style={styles.gameSelectMeta}>
                <Text style={[styles.gameSelectTitle, { color: theme.colors.textPrimary }]}>
                  Tic-Tac-Toe
                </Text>
                <Text style={[styles.gameSelectDesc, { color: theme.colors.textMuted }]}>
                  Classic 3x3 turn-based duel
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSendGameInvite('LUDO')}
              style={[
                styles.gameSelectOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.gameSelectIcon, { backgroundColor: '#F59E0B20' }]}>
                <Icon name="dice" size={22} color="#F59E0B" />
              </View>
              <View style={styles.gameSelectMeta}>
                <Text style={[styles.gameSelectTitle, { color: theme.colors.textPrimary }]}>
                  Ludo Multiplayer
                </Text>
                <Text style={[styles.gameSelectDesc, { color: theme.colors.textMuted }]}>
                  Roll dice & race your tokens
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowInviteModal(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flexFill: {
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  peerHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 10,
  },
  peerHeaderTextCol: {
    flex: 1,
  },
  peerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '500',
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowPeer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 16,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
  },
  statusTick: {
    marginLeft: 2,
  },
  inviteCard: {
    width: 270,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteCardTitleCol: {
    flex: 1,
  },
  inviteCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inviteCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  roomCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roomCodeLabel: {
    fontSize: 12,
  },
  roomCodeValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  joinGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  joinGameBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inviteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 8,
  },
  typingDotAnimation: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inviteTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  gameSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  gameSelectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameSelectMeta: {
    flex: 1,
    gap: 2,
  },
  gameSelectTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gameSelectDesc: {
    fontSize: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
