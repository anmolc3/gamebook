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
  StatusBar,
  Modal,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { useCall } from '../../features/call/CallContext';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MobileSocketService } from '../../services/socket.service';
import { ImagePickerService } from '../../services/imagePicker.service';
import { RoomService, SupportedGameType } from '../../services/room.service';

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
  const { startCall } = useCall();
  const insets = useSafeAreaInsets();

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [peerOnline, setPeerOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [isViewOnce, setIsViewOnce] = useState<boolean>(true);
  const [activeViewOnceItem, setActiveViewOnceItem] = useState<{
    messageId: string;
    imageUri: string;
    senderName: string;
    isOwn: boolean;
  } | null>(null);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingActiveRef = useRef<boolean>(false);

  // Monitor keyboard visibility so input stays pinned directly above keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

    // Listen to view-once opened events in real-time
    const unsubViewOnce = MobileSocketService.onViewOnceOpened(({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                metadata: {
                  ...m.metadata,
                  opened: true,
                  openedAt: new Date().toISOString(),
                },
              }
            : m
        )
      );
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
      unsubViewOnce();
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

  // Image attachment and View Once triggers
  const handlePickImage = async () => {
    try {
      const res = await ImagePickerService.pickImageFromDevice({ quality: 0.85 });
      if (res && res.uri) {
        setPendingImage({ uri: res.uri, base64: res.base64 });
        setIsViewOnce(true);
      }
    } catch (err: any) {
      Alert.alert('Image Picker', err.message || 'Could not pick image');
    }
  };

  const handleOpenViewOnce = (msg: ChatMessage) => {
    if (msg.metadata?.opened) {
      Alert.alert(
        'Photo Expired',
        'This one-time photo has already been opened and is no longer available.'
      );
      return;
    }

    const imageUri = msg.metadata?.imageUri;
    if (!imageUri) {
      Alert.alert('Photo Expired', 'This one-time photo is no longer available.');
      return;
    }

    setActiveViewOnceItem({
      messageId: msg.id,
      imageUri,
      senderName: msg.senderName,
      isOwn: msg.isOwnMessage,
    });
  };

  const handleCloseViewOnce = async () => {
    if (!activeViewOnceItem) return;
    const { messageId, isOwn } = activeViewOnceItem;
    setActiveViewOnceItem(null);

    if (!isOwn && conversationId) {
      try {
        await ChatService.openViewOnceMessage(conversationId, messageId);
      } catch (e) {
        console.log('Error opening view-once on server:', e);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                metadata: {
                  ...m.metadata,
                  opened: true,
                  openedAt: new Date().toISOString(),
                },
              }
            : m
        )
      );
    }
  };

  // Send standard or View Once message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingImage) || !conversationId || isSending) return;

    try {
      const textToSend = trimmed;
      const imageToSend = pendingImage;
      const viewOnceFlag = isViewOnce;

      setIsSending(true);
      setInputText('');
      setPendingImage(null);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      isTypingActiveRef.current = false;
      MobileSocketService.sendTyping(conversationId, false);

      let metadata: Record<string, any> | undefined = undefined;
      if (imageToSend) {
        metadata = {
          isViewOnce: viewOnceFlag,
          imageUri: imageToSend.uri,
          opened: false,
          openedAt: null,
        };
      }

      const contentToSend =
        textToSend || (imageToSend ? (viewOnceFlag ? '① Photo' : 'Photo') : '');

      const newMsg = await ChatService.sendMessage(
        conversationId,
        contentToSend,
        'TEXT',
        metadata
      );

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

  // Send game challenge invite with real room creation on server
  const handleSendGameInvite = async (gameType: SupportedGameType) => {
    if (!conversationId) return;

    try {
      setShowInviteModal(false);
      const serverGameType = gameType === 'TIC_TAC_TOE' ? 'TICTACTOE' : gameType;
      // Real room creation on server
      const room = await RoomService.createRoom(serverGameType as SupportedGameType, true, 2);
      const roomCode = room.code;
      const gameLabel =
        serverGameType === 'TICTACTOE'
          ? 'Tic-Tac-Toe'
          : serverGameType === 'LUDO'
          ? 'Ludo'
          : 'Duel Match';
      const inviteContent = `Challenged you to a game of ${gameLabel}! Room code: ${roomCode}`;

      const newMsg = await ChatService.sendMessage(
        conversationId,
        inviteContent,
        'GAME_INVITE',
        { gameType: serverGameType, roomCode, hostName: authUser?.displayName || 'Host' }
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
              onPress={async () => {
                try {
                  if (!isOwn) {
                    await RoomService.joinRoom(roomCode).catch(() => null);
                  }
                  if (onJoinGameRoom) {
                    onJoinGameRoom(roomCode, gameType);
                  }
                } catch (err: any) {
                  Alert.alert('Join Game Room', err.message || 'Could not join room');
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

    const isViewOnceMsg = !!item.metadata?.isViewOnce;
    if (isViewOnceMsg) {
      const isOpened = !!item.metadata?.opened;
      return (
        <View
          style={[
            styles.messageRow,
            isOwn ? styles.messageRowOwn : styles.messageRowPeer,
          ]}
        >
          <TouchableOpacity
            activeOpacity={isOpened ? 1 : 0.7}
            onPress={() => handleOpenViewOnce(item)}
            style={[
              styles.viewOnceBubble,
              {
                backgroundColor: isOpened
                  ? '#161B26'
                  : isOwn
                  ? '#133526'
                  : '#1A2A38',
                borderColor: isOpened
                  ? '#2B3545'
                  : isOwn
                  ? '#3ED598'
                  : '#38BDF8',
              },
            ]}
          >
            {/* View Once Badge Circle */}
            <View
              style={[
                styles.viewOnceBadgeCircle,
                {
                  backgroundColor: isOpened
                    ? '#242C3C'
                    : isOwn
                    ? '#1E4636'
                    : '#22384A',
                },
              ]}
            >
              <Icon
                name="viewOnce"
                size={20}
                color={isOpened ? '#64748B' : isOwn ? '#3ED598' : '#38BDF8'}
                strokeWidth={2.5}
              />
            </View>

            {/* View Once Text Meta */}
            <View style={styles.viewOnceTextCol}>
              <Text
                style={[
                  styles.viewOnceTitle,
                  { color: isOpened ? '#94A3B8' : '#FFFFFF' },
                ]}
              >
                {isOpened ? 'Opened' : 'Photo'}
              </Text>
              <Text
                style={[
                  styles.viewOnceSub,
                  { color: isOpened ? '#64748B' : isOwn ? '#3ED598' : '#38BDF8' },
                ]}
              >
                {isOpened
                  ? 'Expired'
                  : isOwn
                  ? 'View once sent'
                  : 'Tap to view once'}
              </Text>
            </View>

            {/* Time and Status */}
            <View style={styles.viewOnceTimeCol}>
              <Text style={[styles.timeText, { color: '#64748B' }]}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {isOwn && (
                <View style={styles.statusTick}>
                  {item.status === 'READ' ? (
                    <Icon name="doubleCheck" size={13} color="#3ED598" />
                  ) : item.status === 'DELIVERED' ? (
                    <Icon name="doubleCheck" size={13} color="#64748B" />
                  ) : (
                    <Icon name="check" size={13} color="#64748B" />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
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
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.colors.background,
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20),
        },
      ]}
    >
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

        {/* Header Right Action Shortcuts */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => {
              startCall(peerId, peerName, peerUsername, peerAvatarUrl, 'audio', conversationId || undefined);
            }}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Audio Call"
          >
            <Icon name="audioCall" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              startCall(peerId, peerName, peerUsername, peerAvatarUrl, 'video', conversationId || undefined);
            }}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Video Call"
          >
            <Icon name="videoCall" size={19} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowInviteModal(true)}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Send Game Challenge"
          >
            <Icon name="gamepad" size={19} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
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
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
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

        {/* Pending Image Attachment Bar */}
        {pendingImage && (
          <View style={[styles.pendingImageBar, { backgroundColor: '#141822', borderColor: '#262D3D' }]}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingThumb} resizeMode="cover" />

            <View style={styles.pendingImageTextCol}>
              <Text style={styles.pendingImageTitle}>
                {isViewOnce ? 'View Once Photo' : 'Standard Photo'}
              </Text>
              <Text style={styles.pendingImageSub}>
                {isViewOnce
                  ? 'Recipient can only open this photo once'
                  : 'Photo stays in chat stream'}
              </Text>
            </View>

            {/* View Once Toggle Button (WhatsApp / Telegram ①) */}
            <TouchableOpacity
              onPress={() => setIsViewOnce((prev) => !prev)}
              style={[
                styles.viewOnceToggleBtn,
                isViewOnce
                  ? { backgroundColor: '#133526', borderColor: '#3ED598', borderWidth: 2 }
                  : { backgroundColor: '#1E232E', borderColor: '#475569', borderWidth: 1.5 },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Toggle View Once"
            >
              <Icon
                name="viewOnce"
                size={20}
                color={isViewOnce ? '#3ED598' : '#94A3B8'}
                strokeWidth={2.5}
              />
              <Text style={[styles.viewOnceToggleText, { color: isViewOnce ? '#3ED598' : '#94A3B8' }]}>
                {isViewOnce ? '1' : 'Off'}
              </Text>
            </TouchableOpacity>

            {/* Remove Image */}
            <TouchableOpacity
              onPress={() => {
                setPendingImage(null);
                setIsViewOnce(true);
              }}
              style={styles.discardImageBtn}
              activeOpacity={0.7}
              accessibilityLabel="Remove photo"
            >
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Controls Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopColor: theme.colors.border,
              paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 10),
            },
          ]}
        >
          {/* Game Challenge Button */}
          <TouchableOpacity
            onPress={() => setShowInviteModal(true)}
            style={[styles.inviteTriggerBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel="Game Invite"
          >
            <Icon name="gamepad" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Photo Picker Button */}
          <TouchableOpacity
            onPress={handlePickImage}
            style={[styles.mediaTriggerBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel="Send Photo"
          >
            <Icon name="image" size={20} color={theme.colors.primary} />
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
            placeholder={pendingImage ? 'Add caption (optional)...' : 'Type a message...'}
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={(!inputText.trim() && !pendingImage) || isSending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: (inputText.trim() || pendingImage)
                  ? theme.colors.primary
                  : theme.colors.surface,
                opacity: (inputText.trim() || pendingImage) ? 1 : 0.4,
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
                color={(inputText.trim() || pendingImage) ? theme.colors.textOnPrimary : theme.colors.textMuted}
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

      {/* Full-Screen View Once Image Modal */}
      <Modal
        visible={!!activeViewOnceItem}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseViewOnce}
      >
        <View style={styles.viewOnceModalContainer}>
          <StatusBar barStyle="light-content" />

          {/* Top Bar with Zero Transparency */}
          <View style={styles.viewOnceModalTopBar}>
            <View style={styles.viewOnceSenderInfo}>
              <View style={styles.viewOnceModalBadge}>
                <Icon name="viewOnce" size={18} color="#3ED598" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.viewOnceModalSenderName}>
                  {activeViewOnceItem?.senderName || 'Player'}
                </Text>
                <Text style={styles.viewOnceModalLabel}>
                  View Once Photo • Will disappear on close
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCloseViewOnce}
              style={styles.viewOnceCloseBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close view once photo"
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Screen Image */}
          <View style={styles.viewOnceImageWrapper}>
            {activeViewOnceItem?.imageUri ? (
              <Image
                source={{ uri: activeViewOnceItem.imageUri }}
                style={styles.viewOnceMainImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Bottom Notice */}
          <View style={styles.viewOnceBottomNotice}>
            <Text style={styles.viewOnceBottomNoticeText}>
              This one-time photo will disappear once you close this screen.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // View Once Message Bubble
  viewOnceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    maxWidth: '80%',
  },
  viewOnceBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnceTextCol: {
    flex: 1,
    gap: 2,
  },
  viewOnceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewOnceSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewOnceTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginLeft: 6,
  },
  // Pending Image Bar
  pendingImageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#141822',
    borderTopWidth: 1,
    borderTopColor: '#262D3D',
    gap: 10,
  },
  pendingThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262D3D',
  },
  pendingImageTextCol: {
    flex: 1,
    gap: 2,
  },
  pendingImageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pendingImageSub: {
    fontSize: 11,
  },
  viewOnceToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  viewOnceToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  discardImageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2432',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTriggerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // View Once Full-screen Modal (Zero Transparency)
  viewOnceModalContainer: {
    flex: 1,
    backgroundColor: '#0B0D13',
    justifyContent: 'space-between',
  },
  viewOnceModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#10131B',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2433',
  },
  viewOnceSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewOnceModalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnceModalSenderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewOnceModalLabel: {
    fontSize: 11,
    color: '#3ED598',
    fontWeight: '600',
  },
  viewOnceCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnceImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#07090D',
  },
  viewOnceMainImage: {
    width: '100%',
    height: '100%',
  },
  viewOnceBottomNotice: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#10131B',
    borderTopWidth: 1,
    borderTopColor: '#1F2433',
    alignItems: 'center',
  },
  viewOnceBottomNoticeText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
