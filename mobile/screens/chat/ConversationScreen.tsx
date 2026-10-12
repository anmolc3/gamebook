import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Animated,
  PanResponder,
  Share,
  ScrollView,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { useAuth } from '../../features/auth/AuthContext';
import { useCall } from '../../features/call/CallContext';
import { ChatService, ChatMessage, GroupMetaItem } from '../../services/chat.service';
import { MobileSocketService } from '../../services/socket.service';
import { ImagePickerService } from '../../services/imagePicker.service';
import { RoomService, SupportedGameType } from '../../services/room.service';
import { FriendsService, FriendUser } from '../../services/friends.service';
import { usePresenceStatus } from '../../utils/presence';
import { GroupDetailsModal } from '../../components/organisms/GroupDetailsModal';
import { MessageReceiptTicks } from '../../components/atoms/MessageReceiptTicks';
import { MessageInfoModal } from '../../components/organisms/MessageInfoModal';

export interface ConversationScreenProps {
  peerId: string;
  peerName?: string;
  peerUsername?: string;
  peerAvatarUrl?: string | null;
  initialConversationId?: string;
  isGroup?: boolean;
  groupMeta?: any;
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

export type GameCategoryType = 'ALL' | 'BOARD' | 'CASUAL' | 'CARDS' | 'PUZZLE' | 'PARTY';

// ─── Comprehensive Game Catalog for In-Chat Multiplayer Invites ─────────────
export const ALL_GAMES = [
  // Board Games
  { type: 'TIC_TAC_TOE',    serverType: 'TICTACTOE',          category: 'BOARD',  label: 'Tic-Tac-Toe',       desc: 'Classic 3×3 turn-based duel',        icon: 'target',    color: '#3B82F6' },
  { type: 'LUDO',           serverType: 'LUDO',               category: 'BOARD',  label: 'Ludo World Arena',  desc: 'Roll dice & race your tokens',        icon: 'dice',      color: '#F59E0B' },
  { type: 'CHESS',          serverType: 'CHESS',              category: 'BOARD',  label: 'Chess Grandmaster', desc: 'Strategic masterpiece on 8×8',        icon: 'crown',     color: '#8B5CF6' },
  { type: 'CHECKERS',       serverType: 'CHECKERS',           category: 'BOARD',  label: 'Checkers / Draughts',desc: 'Jump & capture to dominate',        icon: 'grid',      color: '#EC4899' },
  { type: 'CONNECT_FOUR',   serverType: 'CONNECT_FOUR',       category: 'BOARD',  label: 'Connect Four',      desc: 'Drop discs & line up 4 in a row',     icon: 'circle',    color: '#10B981' },
  { type: 'REVERSI',        serverType: 'REVERSI',            category: 'BOARD',  label: 'Reversi / Othello', desc: 'Flip tiles & control the board',      icon: 'refresh',   color: '#06B6D4' },
  { type: 'GOMOKU',         serverType: 'GOMOKU',             category: 'BOARD',  label: 'Gomoku (Five in Row)',desc: 'First to line up 5 wins',           icon: 'zap',       color: '#F97316' },
  { type: 'CARROM',         serverType: 'CARROM',             category: 'BOARD',  label: 'Carrom Board',      desc: 'Flick the striker & pocket coins',    icon: 'target',    color: '#EAB308' },
  { type: 'SNAKES_AND_LADDERS', serverType: 'SNAKES_AND_LADDERS', category: 'BOARD', label: 'Snakes & Ladders', desc: 'Climb ladders, dodge snakes',     icon: 'dice',      color: '#22C55E' },
  { type: 'BATTLESHIP',     serverType: 'BATTLESHIP',         category: 'BOARD',  label: 'Battleship Fleet',  desc: 'Call coords & sink enemy ships',      icon: 'shield',    color: '#0284C7' },
  { type: 'DOMINOES',       serverType: 'DOMINOES',           category: 'BOARD',  label: 'Dominoes Duel',     desc: 'Match pips & block opponents',        icon: 'layers',    color: '#6366F1' },
  { type: 'BACKGAMMON',     serverType: 'BACKGAMMON',         category: 'BOARD',  label: 'Backgammon',        desc: 'Tactical checker race duel',          icon: 'dice',      color: '#A855F7' },
  { type: 'MANCALA',        serverType: 'MANCALA',            category: 'BOARD',  label: 'Mancala',           desc: 'Ancient seed sowing strategy',        icon: 'circle',    color: '#D97706' },
  { type: 'CHINESE_CHECKERS', serverType: 'CHINESE_CHECKERS', category: 'BOARD', label: 'Chinese Checkers', desc: 'Hop your marbles across the star',    icon: 'grid',      color: '#FB7185' },

  // Casual & Sports
  { type: 'POOL_8_BALL',    serverType: 'POOL_8_BALL',        category: 'CASUAL', label: '8-Ball Pool',       desc: 'Line up shots & sink the 8-ball',     icon: 'circle',    color: '#059669' },
  { type: 'MINI_GOLF',      serverType: 'MINI_GOLF',          category: 'CASUAL', label: 'Mini Golf Duel',    desc: 'Putt through crazy obstacles',        icon: 'target',    color: '#16A34A' },
  { type: 'AIR_HOCKEY',     serverType: 'AIR_HOCKEY',         category: 'CASUAL', label: 'Air Hockey',        desc: 'High-speed puck deflections',         icon: 'zap',       color: '#2563EB' },
  { type: 'DARTS',          serverType: 'DARTS',              category: 'CASUAL', label: 'Darts Masters',     desc: 'Hit bullseyes in 501 countdown',      icon: 'target',    color: '#DC2626' },
  { type: 'BOWLING',        serverType: 'BOWLING',            category: 'CASUAL', label: 'Bowling Strike',    desc: 'Hook the ball for 10-pin strikes',    icon: 'circle',    color: '#7C3AED' },
  { type: 'TABLE_TENNIS',   serverType: 'TABLE_TENNIS',       category: 'CASUAL', label: 'Table Tennis',      desc: 'Fast-paced ping pong rallies',        icon: 'activity',  color: '#EA580C' },

  // Card Battles
  { type: 'UNO_STYLE',      serverType: 'UNO_STYLE',          category: 'CARDS',  label: 'Uno Color Duel',    desc: 'Match colors, numbers & action cards',icon: 'layers',    color: '#EF4444' },
  { type: 'HEARTS',         serverType: 'HEARTS',             category: 'CARDS',  label: 'Hearts Trick-Taking',desc: 'Avoid hearts & Queen of Spades',     icon: 'heart',     color: '#E11D48' },
  { type: 'SPADES',         serverType: 'SPADES',             category: 'CARDS',  label: 'Spades Partnership', desc: 'Bid tricks with trump spades',       icon: 'shield',    color: '#475569' },
  { type: 'RUMMY',          serverType: 'RUMMY',              category: 'CARDS',  label: 'Rummy Classic',     desc: 'Form runs, sets & declare',           icon: 'layers',    color: '#D97706' },
  { type: 'GIN_RUMMY',      serverType: 'GIN_RUMMY',          category: 'CARDS',  label: 'Gin Rummy Duel',    desc: 'Quick 2-player melding battle',       icon: 'layers',    color: '#CA8A04' },
  { type: 'CRAZY_EIGHTS',   serverType: 'CRAZY_EIGHTS',       category: 'CARDS',  label: 'Crazy Eights',      desc: 'Wild 8s change suit anytime',         icon: 'zap',       color: '#9333EA' },
  { type: 'BLACKJACK',      serverType: 'BLACKJACK',          category: 'CARDS',  label: 'Blackjack 21',      desc: 'Beat the dealer without busting',     icon: 'dollar',    color: '#16A34A' },
  { type: 'POKER',          serverType: 'POKER',              category: 'CARDS',  label: 'Texas Poker Showdown',desc: 'Bluff & play community cards',      icon: 'trophy',    color: '#B45309' },

  // Puzzle & Reflex
  { type: '2048_MULTIPLAYER',serverType: '2048_MULTIPLAYER',  category: 'PUZZLE', label: '2048 Duel',         desc: 'Slide & merge tiles to 2048',         icon: 'grid',      color: '#F59E0B' },
  { type: 'WORDLE_DUEL',    serverType: 'WORDLE_DUEL',        category: 'PUZZLE', label: 'Wordle Duel',       desc: 'Guess hidden 5-letter word first',    icon: 'type',      color: '#10B981' },
  { type: 'MINESWEEPER_DUEL',serverType: 'MINESWEEPER_DUEL',  category: 'PUZZLE', label: 'Minesweeper Duel',  desc: 'Flag mines safely without boom',      icon: 'flag',      color: '#EF4444' },
  { type: 'MEMORY_MATCH',   serverType: 'MEMORY_MATCH',       category: 'PUZZLE', label: 'Memory Match',      desc: 'Uncover & pair identical cards',      icon: 'eye',       color: '#8B5CF6' },
  { type: 'TYPING_RACE',    serverType: 'TYPING_RACE',        category: 'PUZZLE', label: 'Typing Race',       desc: 'Test your WPM live head-to-head',     icon: 'edit',      color: '#06B6D4' },
  { type: 'SPEED_TAP',      serverType: 'SPEED_TAP',          category: 'PUZZLE', label: 'Speed Tap Duel',    desc: 'Fastest fingers win the match',       icon: 'zap',       color: '#EC4899' },
  { type: 'REACTION_TEST',  serverType: 'REACTION_TEST',      category: 'PUZZLE', label: 'Reaction Test',     desc: 'Tap the instant the screen turns green',icon: 'clock',   color: '#14B8A6' },
  { type: 'MATH_BATTLE',    serverType: 'MATH_BATTLE',        category: 'PUZZLE', label: 'Math Battle',       desc: 'Solve equations in rapid fire',       icon: 'helpCircle',color: '#6366F1' },
  { type: 'ROCK_PAPER_SCISSORS',serverType:'ROCK_PAPER_SCISSORS',category:'PUZZLE',label:'Rock Paper Scissors',desc: 'Best-of-5 psychological clash',    icon: 'scissors',  color: '#F97316' },

  // Party Games
  { type: 'WOULD_YOU_RATHER',serverType: 'WOULD_YOU_RATHER',  category: 'PARTY',  label: 'Would You Rather',  desc: 'Dilemmas & hilarious dilemmas',       icon: 'smile',     color: '#EC4899' },
  { type: 'TRUTH_OR_DARE',  serverType: 'TRUTH_OR_DARE',      category: 'PARTY',  label: 'Truth or Dare',     desc: 'Secrets, spicy questions & wild dares',icon: 'flame',     color: '#F43F5E' },
  { type: 'CHARADES',       serverType: 'CHARADES',           category: 'PARTY',  label: 'Charades Acting',   desc: 'Act out words without speaking',      icon: 'video',     color: '#8B5CF6' },
  { type: 'MAFIA',          serverType: 'MAFIA',              category: 'PARTY',  label: 'Mafia & Detective', desc: 'Social deduction & find the killer', icon: 'shield',    color: '#334155' },
  { type: 'DRAW_AND_GUESS', serverType: 'DRAW_AND_GUESS',     category: 'PARTY',  label: 'Draw & Guess',      desc: 'Live sketching & rapid guessing',    icon: 'edit',      color: '#06B6D4' },
  { type: 'NEVER_HAVE_I_EVER',serverType:'NEVER_HAVE_I_EVER', category: 'PARTY',  label: 'Never Have I Ever', desc: 'Confessions & juicy party fun',       icon: 'heart',     color: '#E11D48' },
];

interface ReplyTo {
  messageId: string;
  content: string;
  senderName: string;
  isOwn: boolean;
}

// ─── WhatsApp-Style Slide-To-Reply Message Row ──────────────────────────────
const SwipeableMessageRow: React.FC<{
  children: React.ReactNode;
  onReply: () => void;
  onForward: () => void;
  isOwn: boolean;
}> = ({ children, onReply, onForward, isOwn }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 10 && Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderGrant: () => {
        replyTriggered.current = false;
      },
      onPanResponderMove: (_, gs) => {
        // WhatsApp standard: swipe right on any message
        if (gs.dx > 0) {
          const clamped = Math.min(gs.dx, 76);
          translateX.setValue(clamped);
          if (clamped >= 46 && !replyTriggered.current) {
            replyTriggered.current = true;
            if (Platform.OS !== 'web') {
              try {
                Vibration.vibrate(15);
              } catch {}
            }
            onReply();
          }
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 7,
          speed: 16,
        }).start();
      },
    })
  ).current;

  // Icon scale & opacity based on drag
  const iconScale = translateX.interpolate({
    inputRange: [0, 46, 76],
    outputRange: [0.5, 1.15, 1],
    extrapolate: 'clamp',
  });
  const iconOpacity = translateX.interpolate({
    inputRange: [0, 15, 46],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ overflow: 'hidden', position: 'relative' }}>
      {/* WhatsApp Reply Icon indicator on the left */}
      <Animated.View
        style={[
          styles.swipeReplyIconContainer,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <View style={styles.swipeReplyIconCircle}>
          <Icon name="reply" size={16} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  peerId,
  peerName = 'Player',
  peerUsername = '',
  peerAvatarUrl = null,
  initialConversationId,
  isGroup = false,
  groupMeta = null,
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
  const [groupDetails, setGroupDetails] = useState<GroupMetaItem | null>(groupMeta || null);
  const [isGroupDetailsModalVisible, setIsGroupDetailsModalVisible] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const presenceText = usePresenceStatus(peerOnline, peerLastSeen);
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

  // Reply feature
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  // Forward feature
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [friendsList, setFriendsList] = useState<FriendUser[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Game Invite selection filters
  const [inviteCategory, setInviteCategory] = useState<GameCategoryType>('ALL');
  const [inviteSearch, setInviteSearch] = useState('');

  // Long-press context menu
  const [contextMenu, setContextMenu] = useState<{ message: ChatMessage; y: number } | null>(null);
  const [selectedInfoMessage, setSelectedInfoMessage] = useState<ChatMessage | null>(null);

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

      if (isGroup) {
        targetConvId = initialConversationId || peerId;
        setConversationId(targetConvId);
        try {
          const details = await ChatService.fetchGroupDetails(targetConvId);
          setGroupDetails(details);
        } catch (e) {
          console.warn('Failed to fetch group details:', e);
        }
      } else {
        if (!targetConvId) {
          const conv = await ChatService.getOrCreateConversation(peerId);
          targetConvId = conv.id;
          setConversationId(conv.id);
          if (conv.peer) {
            setPeerOnline(conv.peer.isOnline);
          }
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
  }, [conversationId, peerId, isGroup, initialConversationId]);

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

        // If message is from peer or group member, acknowledge delivery and read
        if (msg.senderId !== authUser?.id) {
          MobileSocketService.sendDeliveryConfirmation(conversationId, [msg.id]);
          MobileSocketService.sendMessagesRead(conversationId);
          ChatService.markAsRead(conversationId).catch(() => null);
        }
      }
    });

    // Listen to delivery confirmation receipts (2 grey ticks)
    const unsubDelivered = MobileSocketService.onMessageDelivered((data) => {
      if (conversationId && data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.isOwnMessage && (m.id === data.messageId || data.isAllDelivered)) {
              return {
                ...m,
                status: m.status === 'READ' ? 'READ' : data.status || 'DELIVERED',
              };
            }
            return m;
          })
        );
      }
    });

    // Listen to read receipts (2 blue ticks)
    const unsubRead = MobileSocketService.onMessagesRead((data) => {
      if (conversationId && data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.isOwnMessage) {
              if (
                !data.messageId ||
                m.id === data.messageId ||
                (data.messageIds && data.messageIds.includes(m.id)) ||
                data.isAllRead
              ) {
                return { ...m, status: data.status || 'READ' };
              }
            }
            return m;
          })
        );
      }
    });

    // Listen to peer typing indicators (1-on-1)
    const unsubTyping = MobileSocketService.onUserTyping((data) => {
      if (!isGroup && conversationId && data.conversationId === conversationId && data.userId === peerId) {
        setIsPeerTyping(data.isTyping);
      }
    });

    // Listen to peer presence updates (1-on-1)
    const unsubPresence = MobileSocketService.onPresenceUpdate(({ userId, isOnline, lastSeen }) => {
      if (!isGroup && userId === peerId) {
        setPeerOnline(isOnline);
        if (lastSeen !== undefined) {
          setPeerLastSeen(lastSeen);
        }
      }
    });

    if (!isGroup) {
      // Query initial peer presence (isOnline and lastSeen)
      MobileSocketService.queryPresence(peerId).then((res) => {
        if (res) {
          setPeerOnline(res.isOnline);
          if (res.lastSeen) setPeerLastSeen(res.lastSeen);
        }
      });
    }

    // Group real-time event listeners
    const unsubGroupUpdated = MobileSocketService.onGroupUpdated((data) => {
      if (conversationId && data.id === conversationId) {
        setGroupDetails((prev) => (prev ? { ...prev, ...data } : null));
      }
    });

    const unsubMembersUpdated = MobileSocketService.onGroupMembersUpdated((data) => {
      if (conversationId && data.groupId === conversationId) {
        ChatService.fetchGroupDetails(conversationId)
          .then((details) => setGroupDetails(details))
          .catch(() => null);
      }
    });

    const unsubMemberRemoved = MobileSocketService.onGroupMemberRemoved((data) => {
      if (conversationId && data.groupId === conversationId) {
        if (data.memberId === authUser?.id) {
          Alert.alert('Group', 'You were removed from this group.');
          onBack();
        } else {
          ChatService.fetchGroupDetails(conversationId)
            .then((details) => setGroupDetails(details))
            .catch(() => null);
        }
      }
    });

    const unsubMemberLeft = MobileSocketService.onGroupMemberLeft((data) => {
      if (conversationId && data.groupId === conversationId) {
        ChatService.fetchGroupDetails(conversationId)
          .then((details) => setGroupDetails(details))
          .catch(() => null);
      }
    });

    const unsubRoleUpdated = MobileSocketService.onGroupRoleUpdated((data) => {
      if (conversationId && data.groupId === conversationId) {
        ChatService.fetchGroupDetails(conversationId)
          .then((details) => setGroupDetails(details))
          .catch(() => null);
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
      unsubDelivered();
      unsubRead();
      unsubTyping();
      unsubPresence();
      unsubViewOnce();
      unsubGroupUpdated();
      unsubMembersUpdated();
      unsubMemberRemoved();
      unsubMemberLeft();
      unsubRoleUpdated();
    };
  }, [conversationId, peerId, isGroup, authUser?.id, initializeConversation, onBack]);

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

  // Reply to a message
  const handleReply = (msg: ChatMessage) => {
    setReplyTo({
      messageId: msg.id,
      content: msg.content,
      senderName: msg.isOwnMessage ? 'You' : msg.senderName,
      isOwn: msg.isOwnMessage,
    });
    setContextMenu(null);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  // Forward a message
  const handleForward = async (msg: ChatMessage) => {
    setForwardMessage(msg);
    setShowForwardModal(true);
    setContextMenu(null);
    setForwardSearch('');
    try {
      const friends = await FriendsService.fetchFriends();
      setFriendsList(friends);
    } catch (err) {
      console.warn('Failed to load friends for forward:', err);
    }
  };

  const handleForwardToFriend = async (targetFriend: FriendUser) => {
    if (!forwardMessage || isForwarding) return;
    try {
      setIsForwarding(true);
      const targetConv = await ChatService.getOrCreateConversation(targetFriend.id);
      await ChatService.sendMessage(
        targetConv.id,
        forwardMessage.content,
        forwardMessage.type,
        {
          forwarded: true,
          originalSender: forwardMessage.senderName,
          ...(forwardMessage.metadata || {}),
        }
      );
      Alert.alert('Forwarded', `Message forwarded to ${targetFriend.displayName}!`);
      setShowForwardModal(false);
      setForwardMessage(null);
    } catch (err: any) {
      Alert.alert('Forward Failed', err.message || 'Could not forward message');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleForwardToSelf = async () => {
    if (!forwardMessage || !conversationId) return;
    try {
      setShowForwardModal(false);
      const fwd = await ChatService.sendMessage(
        conversationId,
        `↪ Forwarded: ${forwardMessage.content}`,
        forwardMessage.type,
        { forwarded: true, originalSender: forwardMessage.senderName, ...(forwardMessage.metadata || {}) }
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === fwd.id)) return prev;
        return [...prev, { ...fwd, isOwnMessage: true }];
      });
    } catch (err: any) {
      Alert.alert('Forward Error', err.message || 'Could not forward message');
    }
    setForwardMessage(null);
  };

  const handleNativeShare = async () => {
    if (!forwardMessage) return;
    try {
      setShowForwardModal(false);
      await Share.share({ message: forwardMessage.content });
    } catch (err) {
      console.log('Share error:', err);
    }
    setForwardMessage(null);
  };

  // Send standard or View Once message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingImage) || !conversationId || isSending) return;

    try {
      const textToSend = trimmed;
      const imageToSend = pendingImage;
      const viewOnceFlag = isViewOnce;
      const replyToData = replyTo;

      setIsSending(true);
      setInputText('');
      setPendingImage(null);
      setReplyTo(null);

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

      // Attach reply info
      if (replyToData) {
        metadata = {
          ...(metadata || {}),
          replyToMessageId: replyToData.messageId,
          replyToContent: replyToData.content,
          replyToSenderName: replyToData.senderName,
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
  const handleSendGameInvite = async (gameType: string, serverType: string) => {
    if (!conversationId) return;

    try {
      setShowInviteModal(false);
      const room = await RoomService.createRoom(serverType as SupportedGameType, true, 2);
      const roomCode = room.code;
      const gameEntry = ALL_GAMES.find((g) => g.type === gameType);
      const gameLabel = gameEntry?.label || 'Game';
      const inviteContent = `Challenged you to a game of ${gameLabel}! Room code: ${roomCode}`;

      const newMsg = await ChatService.sendMessage(
        conversationId,
        inviteContent,
        'GAME_INVITE',
        { gameType: serverType, roomCode, hostName: authUser?.displayName || 'Host' }
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, isOwnMessage: true }];
      });
    } catch (err: any) {
      Alert.alert('Invite Error', err.message || 'Could not send game invitation');
    }
  };

  // ─── Render Reply Quote ────────────────────────────────────────────────────
  const renderReplyQuote = (msg: ChatMessage) => {
    const replyMeta = msg.metadata;
    if (!replyMeta?.replyToMessageId) return null;

    return (
      <View style={[styles.replyQuote, {
        backgroundColor: msg.isOwnMessage ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.07)',
        borderLeftColor: msg.isOwnMessage ? '#FFFFFF88' : '#3ED598',
      }]}>
        <Text style={[styles.replyQuoteName, { color: msg.isOwnMessage ? '#FFFFFFCC' : '#3ED598' }]}>
          {replyMeta.replyToSenderName || 'Message'}
        </Text>
        <Text style={[styles.replyQuoteContent, { color: msg.isOwnMessage ? '#FFFFFFAA' : '#94A3B8' }]} numberOfLines={2}>
          {replyMeta.replyToContent}
        </Text>
      </View>
    );
  };

  // ─── Forwarded badge ──────────────────────────────────────────────────────
  const renderForwardedBadge = (msg: ChatMessage) => {
    if (!msg.metadata?.forwarded) return null;
    return (
      <View style={styles.forwardedBadge}>
        <Icon name="reply" size={10} color="#94A3B8" />
        <Text style={styles.forwardedBadgeText}>Forwarded</Text>
      </View>
    );
  };

  // Render individual message bubble
  const renderMessageBubble = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.isOwnMessage;

    // Render system event notifications (group created, joined, left, details updated)
    if (item.type === 'SYSTEM') {
      return (
        <View style={styles.systemMessageRow}>
          <View
            style={[
              styles.systemMessagePill,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="info" size={12} color={theme.colors.textMuted} />
            <Text style={[styles.systemMessageText, { color: theme.colors.textSecondary }]}>
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    const isGameInvite = item.type === 'GAME_INVITE';

    if (isGameInvite) {
      const gameType = item.metadata?.gameType || 'TIC_TAC_TOE';
      const roomCode = item.metadata?.roomCode || 'TTT-0000';
      const gameEntry = ALL_GAMES.find((g) => g.serverType === gameType || g.type === gameType);
      const gameLabel = gameEntry?.label || 'Game';
      const gameIcon = gameEntry?.icon || 'gamepad';
      const gameColor = gameEntry?.color || '#3B82F6';

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
                  { backgroundColor: gameColor + '20' },
                ]}
              >
                <Icon
                  name={gameIcon as any}
                  size={20}
                  color={gameColor}
                />
              </View>
              <View style={styles.inviteCardTitleCol}>
                <Text style={[styles.inviteCardTitle, { color: theme.colors.textPrimary }]}>
                  {gameLabel} Challenge
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
                  <MessageReceiptTicks status={item.status} size={14} />
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
        <SwipeableMessageRow onReply={() => handleReply(item)} onForward={() => handleForward(item)} isOwn={isOwn}>
          <View
            style={[
              styles.messageRow,
              isOwn ? styles.messageRowOwn : styles.messageRowPeer,
            ]}
          >
            <TouchableOpacity
              activeOpacity={isOpened ? 1 : 0.7}
              onPress={() => handleOpenViewOnce(item)}
              onLongPress={() => setContextMenu({ message: item, y: 0 })}
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
                    <MessageReceiptTicks status={item.status} size={13} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </SwipeableMessageRow>
      );
    }

    return (
      <SwipeableMessageRow onReply={() => handleReply(item)} onForward={() => handleForward(item)} isOwn={isOwn}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => setContextMenu({ message: item, y: 0 })}
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
            {/* Forwarded badge */}
            {renderForwardedBadge(item)}

            {/* Reply quote */}
            {renderReplyQuote(item)}

            {/* Sender name in group conversations for incoming messages */}
            {isGroup && !isOwn && (
              <Text style={[styles.groupSenderLabel, { color: theme.colors.primary }]}>
                {item.senderName || 'Member'}
              </Text>
            )}

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
                  <MessageReceiptTicks
                    status={item.status}
                    size={13}
                    greyColor="rgba(255,255,255,0.7)"
                    blueColor="#34B7F1"
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </SwipeableMessageRow>
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

        {/* Peer or Group Info */}
        {isGroup ? (
          <TouchableOpacity
            onPress={() => setIsGroupDetailsModalVisible(true)}
            style={styles.peerHeaderContent}
            activeOpacity={0.7}
            accessibilityLabel="Group Details"
          >
            {groupDetails?.avatarUrl || peerAvatarUrl ? (
              <Avatar
                displayName={groupDetails?.title || peerName}
                avatarUrl={groupDetails?.avatarUrl || peerAvatarUrl}
                size="sm"
              />
            ) : (
              <View
                style={[
                  styles.groupHeaderAvatarCircle,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Icon name="users" size={18} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.peerHeaderTextCol}>
              <Text style={[styles.peerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {groupDetails?.title || peerName}
              </Text>
              <Text style={[styles.presenceText, { color: theme.colors.textMuted }]}>
                {groupDetails?.memberCount !== undefined
                  ? `${groupDetails.memberCount} members • Tap for info`
                  : 'Tap for info'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
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
                {peerOnline && !isPeerTyping && (
                  <View
                    style={[
                      styles.presenceDot,
                      { backgroundColor: theme.colors.online },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.presenceText,
                    {
                      color: isPeerTyping
                        ? theme.colors.primary
                        : peerOnline
                        ? theme.colors.online
                        : theme.colors.textMuted,
                      fontWeight: isPeerTyping ? '600' : '400',
                    },
                  ]}
                >
                  {isPeerTyping ? 'typing...' : presenceText || 'offline'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Header Right Action Shortcuts */}
        <View style={styles.headerRightActions}>
          {isGroup ? (
            <>
              <TouchableOpacity
                onPress={() => setIsGroupDetailsModalVisible(true)}
                style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                activeOpacity={0.7}
                accessibilityLabel="Group Details"
              >
                <Icon name="info" size={18} color={theme.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowInviteModal(true)}
                style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                activeOpacity={0.7}
                accessibilityLabel="Send Game Challenge"
              >
                <Icon name="gamepad" size={19} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
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
            </>
          )}
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

        {/* Reply Preview Bar */}
        {replyTo && (
          <View style={[styles.replyBar, { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border }]}>
            <View style={[styles.replyBarAccent, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.replyBarContent}>
              <Text style={[styles.replyBarName, { color: theme.colors.primary }]}>
                {replyTo.senderName}
              </Text>
              <Text style={[styles.replyBarText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancelReply} style={styles.replyBarClose} activeOpacity={0.7}>
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
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
            placeholder={pendingImage ? 'Add caption (optional)...' : replyTo ? `Reply to ${replyTo.senderName}...` : 'Type a message...'}
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

      {/* ── Long-press Context Menu ─────────────────────────────────────────── */}
      <Modal
        visible={!!contextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenu(null)}
      >
        <TouchableOpacity
          style={styles.contextMenuBackdrop}
          activeOpacity={1}
          onPress={() => setContextMenu(null)}
        >
          <View
            style={[
              styles.contextMenuCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => contextMenu && handleReply(contextMenu.message)}
              activeOpacity={0.7}
            >
              <Icon name="reply" size={18} color={theme.colors.primary} />
              <Text style={[styles.contextMenuText, { color: theme.colors.textPrimary }]}>Reply</Text>
            </TouchableOpacity>
            <View style={[styles.contextMenuDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => contextMenu && handleForward(contextMenu.message)}
              activeOpacity={0.7}
            >
              <Icon name="send" size={18} color={theme.colors.primary} />
              <Text style={[styles.contextMenuText, { color: theme.colors.textPrimary }]}>Forward</Text>
            </TouchableOpacity>
            <View style={[styles.contextMenuDivider, { backgroundColor: theme.colors.border }]} />
            {/* Message Info Option */}
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                if (contextMenu) {
                  const targetMsg = contextMenu.message;
                  setContextMenu(null);
                  setSelectedInfoMessage(targetMsg);
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="info" size={18} color="#34B7F1" />
              <Text style={[styles.contextMenuText, { color: theme.colors.textPrimary }]}>Message Info</Text>
            </TouchableOpacity>
            <View style={[styles.contextMenuDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                if (contextMenu) {
                  Share.share({ message: contextMenu.message.content });
                  setContextMenu(null);
                }
              }}
              activeOpacity={0.7}
            >
              <Icon name="users" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.contextMenuText, { color: theme.colors.textPrimary }]}>Share</Text>
            </TouchableOpacity>
            <View style={[styles.contextMenuDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => setContextMenu(null)}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={theme.colors.error} />
              <Text style={[styles.contextMenuText, { color: theme.colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Forward Modal – WhatsApp Style with Friend Selection ───────────── */}
      <Modal
        visible={showForwardModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowForwardModal(false); setForwardMessage(null); }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.forwardModalCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Forward Message</Text>
              <TouchableOpacity
                onPress={() => { setShowForwardModal(false); setForwardMessage(null); }}
                style={{ padding: 4 }}
              >
                <Icon name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Message Preview */}
            <View style={[styles.forwardPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="reply" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.forwardPreviewText, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={2}>
                {forwardMessage?.content}
              </Text>
            </View>

            {/* Search Friends */}
            <View style={[styles.modalSearchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search friends to forward..."
                placeholderTextColor={theme.colors.textMuted}
                value={forwardSearch}
                onChangeText={setForwardSearch}
              />
              {forwardSearch.length > 0 && (
                <TouchableOpacity onPress={() => setForwardSearch('')}>
                  <Icon name="close" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.forwardQuickBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flex: 1 }]}
                onPress={handleForwardToSelf}
                activeOpacity={0.8}
              >
                <Icon name="send" size={16} color={theme.colors.primary} />
                <Text style={[styles.forwardQuickBtnText, { color: theme.colors.textPrimary }]}>
                  This Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.forwardQuickBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flex: 1 }]}
                onPress={handleNativeShare}
                activeOpacity={0.8}
              >
                <Icon name="share" size={16} color="#10B981" />
                <Text style={[styles.forwardQuickBtnText, { color: theme.colors.textPrimary }]}>
                  Other Apps
                </Text>
              </TouchableOpacity>
            </View>

            {/* Friends List for Direct Forwarding */}
            <Text style={[styles.forwardSectionLabel, { color: theme.colors.textMuted }]}>
              SEND TO FRIENDS ({friendsList.length})
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {friendsList
                .filter(
                  (f) =>
                    !forwardSearch.trim() ||
                    f.displayName.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                    f.username.toLowerCase().includes(forwardSearch.toLowerCase())
                )
                .map((friend) => (
                  <View
                    key={friend.id}
                    style={[
                      styles.forwardFriendRow,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <Avatar
                      displayName={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      size="sm"
                      status={friend.isOnline ? 'online' : 'offline'}
                    />
                    <View style={styles.forwardFriendMeta}>
                      <Text style={[styles.forwardFriendName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {friend.displayName}
                      </Text>
                      <Text style={[styles.forwardFriendUsername, { color: theme.colors.textMuted }]}>
                        @{friend.username} • {friend.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleForwardToFriend(friend)}
                      disabled={isForwarding}
                      style={[
                        styles.forwardSendBtn,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.forwardSendBtnText, { color: theme.colors.textOnPrimary }]}>
                        Forward
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

              {friendsList.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                    No friends found yet
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => { setShowForwardModal(false); setForwardMessage(null); }}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Game Invite Modal – ALL GAMES with Category Chips & Search ───────── */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.gameInviteFullCard,
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
                Select any game to create an instant live room and duel your friend!
              </Text>
            </View>

            {/* Search Games */}
            <View style={[styles.modalSearchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search games (Chess, Pool, Ludo...)"
                placeholderTextColor={theme.colors.textMuted}
                value={inviteSearch}
                onChangeText={setInviteSearch}
              />
              {inviteSearch.length > 0 && (
                <TouchableOpacity onPress={() => setInviteSearch('')}>
                  <Icon name="close" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              {(['ALL', 'BOARD', 'CASUAL', 'CARDS', 'PUZZLE', 'PARTY'] as GameCategoryType[]).map((cat) => {
                const isActive = inviteCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setInviteCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isActive ? theme.colors.textOnPrimary : theme.colors.textSecondary },
                      ]}
                    >
                      {cat === 'ALL' ? 'All Games' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Games List (Filtered by Category & Search) */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {ALL_GAMES.filter((game) => {
                const matchesCategory = inviteCategory === 'ALL' || game.category === inviteCategory;
                const matchesSearch =
                  !inviteSearch.trim() ||
                  game.label.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                  game.desc.toLowerCase().includes(inviteSearch.toLowerCase());
                return matchesCategory && matchesSearch;
              }).map((game) => (
                <TouchableOpacity
                  key={game.type}
                  onPress={() => handleSendGameInvite(game.type, game.serverType)}
                  style={[
                    styles.gameSelectOption,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gameSelectIcon, { backgroundColor: game.color + '20' }]}>
                    <Icon name={game.icon as any} size={22} color={game.color} />
                  </View>
                  <View style={styles.gameSelectMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.gameSelectTitle, { color: theme.colors.textPrimary }]}>
                        {game.label}
                      </Text>
                      <View style={[styles.gameCategoryBadge, { backgroundColor: game.color + '15' }]}>
                        <Text style={[styles.gameCategoryBadgeText, { color: game.color }]}>
                          {game.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.gameSelectDesc, { color: theme.colors.textMuted }]}>
                      {game.desc}
                    </Text>
                  </View>
                  <View style={[styles.inviteArrowBtn, { backgroundColor: theme.colors.primary + '18' }]}>
                    <Icon name="chevronRight" size={16} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowInviteModal(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 8 }]}
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

      {/* Group Details Modal */}
      {isGroup && conversationId && (
        <GroupDetailsModal
          visible={isGroupDetailsModalVisible}
          groupId={conversationId}
          currentUserId={authUser?.id || ''}
          onClose={() => setIsGroupDetailsModalVisible(false)}
          onGroupUpdated={async () => {
            try {
              const details = await ChatService.fetchGroupDetails(conversationId);
              setGroupDetails(details);
            } catch {}
          }}
          onGroupLeft={() => {
            setIsGroupDetailsModalVisible(false);
            onBack();
          }}
        />
      )}
      {/* Message Info Modal (Read & Delivery Receipts tracking) */}
      <MessageInfoModal
        visible={!!selectedInfoMessage}
        message={selectedInfoMessage}
        conversationId={conversationId || ''}
        isGroup={isGroup}
        onClose={() => setSelectedInfoMessage(null)}
      />
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
  systemMessageRow: {
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 20,
  },
  systemMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '85%',
  },
  systemMessageText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  groupSenderLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  groupHeaderAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginVertical: 2,
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
  // WhatsApp swipe-to-reply icon indicator
  swipeReplyIconContainer: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  swipeReplyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3ED598',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3ED598',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  swipeHint: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Reply quote inside bubble
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyQuoteContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Forwarded badge
  forwardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  forwardedBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  // Reply bar above input
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  replyBarAccent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    minHeight: 32,
  },
  replyBarContent: {
    flex: 1,
    gap: 2,
  },
  replyBarName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyBarText: {
    fontSize: 12,
  },
  replyBarClose: {
    padding: 4,
  },
  // Invite Card (game invite message)
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
  // Context Menu Modal
  contextMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  contextMenuCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  contextMenuText: {
    fontSize: 15,
    fontWeight: '600',
  },
  contextMenuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
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
  gameInviteFullCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  forwardModalCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  forwardPreview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  forwardPreviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  forwardQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  forwardQuickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forwardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  forwardFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  forwardFriendMeta: {
    flex: 1,
  },
  forwardFriendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  forwardFriendUsername: {
    fontSize: 11,
    marginTop: 1,
  },
  forwardSendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  forwardSendBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipsScroll: {
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gameCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  gameCategoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inviteArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
