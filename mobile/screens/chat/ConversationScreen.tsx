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
  Switch,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameLogo } from '../../components/atoms/GameLogo';
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

  // New upgraded Chat & Messaging state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [disappearingOption, setDisappearingOption] = useState<'off' | '24h' | '7d' | '30d' | '90d'>('off');
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [isNotificationsMuted, setIsNotificationsMuted] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [inChatSearch, setInChatSearch] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaTab, setMediaTab] = useState<'media' | 'files' | 'links'>('media');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter messages by disappearing messages threshold and in-chat search
  const displayedMessages = useMemo(() => {
    let result = messages;

    // Filter by disappearing messages threshold
    if (disappearingOption !== 'off') {
      const now = Date.now();
      const durationMs =
        disappearingOption === '24h'
          ? 24 * 3600 * 1000
          : disappearingOption === '7d'
          ? 7 * 24 * 3600 * 1000
          : disappearingOption === '30d'
          ? 30 * 24 * 3600 * 1000
          : 90 * 24 * 3600 * 1000;

      result = result.filter((m) => {
        const msgTime = new Date(m.createdAt).getTime();
        return now - msgTime < durationMs;
      });
    }

    // Filter by search in chat
    if (isSearchActive && inChatSearch.trim()) {
      const q = inChatSearch.toLowerCase();
      result = result.filter((m) => m.content?.toLowerCase().includes(q));
    }

    return result;
  }, [messages, disappearingOption, isSearchActive, inChatSearch]);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingActiveRef = useRef<boolean>(false);

  // Handle Android hardware Back button
  useEffect(() => {
    if (!onBack) return;
    const backAction = () => {
      if (activeViewOnceItem) {
        handleCloseViewOnce();
        return true;
      }
      if (pendingImage) {
        setPendingImage(null);
        return true;
      }
      if (showForwardModal) {
        setShowForwardModal(false);
        return true;
      }
      if (showAttachmentMenu) {
        setShowAttachmentMenu(false);
        return true;
      }
      if (showThreeDotMenu) {
        setShowThreeDotMenu(false);
        return true;
      }
      if (showInviteModal) {
        setShowInviteModal(false);
        return true;
      }
      if (showDisappearingModal) {
        setShowDisappearingModal(false);
        return true;
      }
      if (showBlockModal) {
        setShowBlockModal(false);
        return true;
      }
      if (showReportModal) {
        setShowReportModal(false);
        return true;
      }
      if (showMediaGallery) {
        setShowMediaGallery(false);
        return true;
      }
      if (contextMenu) {
        setContextMenu(null);
        return true;
      }
      if (selectedInfoMessage) {
        setSelectedInfoMessage(null);
        return true;
      }
      if (isGroupDetailsModalVisible) {
        setIsGroupDetailsModalVisible(false);
        return true;
      }
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
        return true;
      }
      if (isSearchActive) {
        setIsSearchActive(false);
        setInChatSearch('');
        return true;
      }
      if (replyTo) {
        setReplyTo(null);
        return true;
      }
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [
    onBack,
    activeViewOnceItem,
    pendingImage,
    showForwardModal,
    showAttachmentMenu,
    showThreeDotMenu,
    showInviteModal,
    showDisappearingModal,
    showBlockModal,
    showReportModal,
    showMediaGallery,
    contextMenu,
    selectedInfoMessage,
    isGroupDetailsModalVisible,
    showEmojiPicker,
    isSearchActive,
    replyTo,
  ]);

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
      let targetConvId = conversationId || initialConversationId || (isGroup ? peerId : undefined);

      // 1. Immediately display cached messages if available
      if (targetConvId) {
        try {
          const cached = await ChatService.getCachedMessages(targetConvId);
          if (cached && cached.length > 0) {
            setMessages(cached);
            setIsLoading(false);
          }
        } catch {}
      }

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
        // Load fresh messages in background
        const msgs = await ChatService.fetchMessages(targetConvId, 60);
        setMessages(msgs);
        // Mark unread messages as read
        await ChatService.markAsRead(targetConvId);
      }
    } catch (err: any) {
      console.warn('Failed to load conversation:', err);
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

  // Load conversation preferences and check block status
  useEffect(() => {
    if (!conversationId && !peerId) return;
    (async () => {
      try {
        if (conversationId) {
          const [disappearing, muted, lockedStr] = await Promise.all([
            AsyncStorage.getItem(`@gameapp:disappearing_${conversationId}`),
            AsyncStorage.getItem(`@gameapp:muted_${conversationId}`),
            AsyncStorage.getItem('@gameapp:locked_convs'),
          ]);
          if (disappearing) setDisappearingOption(disappearing as any);
          if (muted) setIsNotificationsMuted(muted === 'true');
          if (lockedStr) {
            const lockedList = JSON.parse(lockedStr);
            if (Array.isArray(lockedList) && lockedList.includes(conversationId)) {
              setIsChatLocked(true);
            }
          }
        }

        // Check if peer is blocked
        if (!isGroup && peerId) {
          const blocked = await FriendsService.fetchBlocked().catch(() => []);
          const isPeerBlocked = blocked.some((b) => b.id === peerId);
          setIsBlocked(isPeerBlocked);
        }
      } catch (e) {
        console.warn('Failed to load chat preferences:', e);
      }
    })();
  }, [conversationId, peerId, isGroup]);

  // Clean up voice timer on unmount
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  // Voice message recording handlers
  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingDuration(0);
    voiceTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleCancelVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingDuration(0);
  };

  const handleSendVoiceRecording = async () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    const duration = recordingDuration;
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    if (duration < 1 || !conversationId) return;

    try {
      const mins = Math.floor(duration / 60);
      const secs = (duration % 60).toString().padStart(2, '0');
      const timeStr = `${mins}:${secs}`;
      const newMsg = await ChatService.sendMessage(
        conversationId,
        `🎤 Voice message (${timeStr})`,
        'TEXT',
        { isVoiceNote: true, duration, durationFormatted: timeStr }
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, isOwnMessage: true }];
      });
    } catch (err: any) {
      Alert.alert('Voice Message', err.message || 'Could not send voice message');
    }
  };

  // Block & Unblock handlers
  const handleConfirmBlock = async () => {
    try {
      setShowBlockModal(false);
      setShowThreeDotMenu(false);
      await FriendsService.blockUser(peerId);
      setIsBlocked(true);
      setPeerOnline(false);
      Alert.alert('Blocked', `${peerName} has been blocked.`);
    } catch (err: any) {
      Alert.alert('Block Error', err.message || 'Could not block user');
    }
  };

  const handleUnblock = async () => {
    try {
      await FriendsService.unblockUser(peerId);
      setIsBlocked(false);
      Alert.alert('Unblocked', `${peerName} has been unblocked.`);
    } catch (err: any) {
      Alert.alert('Unblock Error', err.message || 'Could not unblock user');
    }
  };

  // Disappearing messages preference handler
  const handleSelectDisappearing = async (option: 'off' | '24h' | '7d' | '30d' | '90d') => {
    setDisappearingOption(option);
    setShowDisappearingModal(false);
    if (conversationId) {
      await AsyncStorage.setItem(`@gameapp:disappearing_${conversationId}`, option).catch(() => null);
      const durationLabels: Record<string, string> = {
        'off': 'Off',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
      };
      const durationText = durationLabels[option] || option;
      try {
        await ChatService.sendMessage(
          conversationId,
          `Disappearing messages: ${durationText}`,
          'SYSTEM'
        );
      } catch {}
    }
  };

  // Chat lock toggle handler
  const handleToggleChatLock = async (value: boolean) => {
    setIsChatLocked(value);
    if (!conversationId) return;
    try {
      const stored = await AsyncStorage.getItem('@gameapp:locked_convs');
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (value) {
        if (!list.includes(conversationId)) list.push(conversationId);
      } else {
        list = list.filter((id) => id !== conversationId);
      }
      await AsyncStorage.setItem('@gameapp:locked_convs', JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to toggle chat lock:', err);
    }
  };

  // Mute notifications toggle handler
  const handleToggleMute = async (value: boolean) => {
    setIsNotificationsMuted(value);
    if (!conversationId) return;
    await AsyncStorage.setItem(`@gameapp:muted_${conversationId}`, value ? 'true' : 'false').catch(() => null);
  };

  // Image picking handlers
  const handlePickNormalImage = async () => {
    setShowAttachmentMenu(false);
    try {
      const res = await ImagePickerService.pickImageFromDevice({ quality: 0.85 });
      if (res && res.uri) {
        setPendingImage({ uri: res.uri, base64: res.base64 });
        setIsViewOnce(false);
      }
    } catch (err: any) {
      Alert.alert('Image Picker', err.message || 'Could not pick image');
    }
  };

  const handlePickOneTimeImage = async () => {
    setShowAttachmentMenu(false);
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

  const handleCaptureCamera = async (oneTime: boolean = false) => {
    setShowAttachmentMenu(false);
    try {
      const res = await ImagePickerService.takePhotoWithCamera({ quality: 0.85 });
      if (res && res.uri) {
        setPendingImage({ uri: res.uri, base64: res.base64 });
        setIsViewOnce(oneTime);
      }
    } catch (err: any) {
      Alert.alert('Camera', err.message || 'Could not capture photo');
    }
  };

  const handleReportUser = (reason: string) => {
    setShowReportModal(false);
    Alert.alert(
      'Report Submitted',
      `Thank you for reporting this user for "${reason}". Our moderators will review this chat.`
    );
  };

  // Image attachment and View Once triggers (legacy wrapper)
  const handlePickImage = handlePickNormalImage;

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

    // Render system event notifications (disappearing messages, group events, etc.)
    if (item.type === 'SYSTEM') {
      let displayContent = item.content;
      if (displayContent.includes('Disappearing messages')) {
        const match = displayContent.match(/(24\s*h(?:ours?)?|7\s*d(?:ays?)?|30\s*d(?:ays?)?|90\s*d(?:ays?)?|off|turned off)/i);
        if (match) {
          const m = match[1].toLowerCase();
          const cleanDuration =
            m.includes('24') ? '24 hours' :
            m.includes('7') ? '7 days' :
            m.includes('30') ? '30 days' :
            m.includes('90') ? '90 days' : 'Off';
          displayContent = `Disappearing messages: ${cleanDuration}`;
        } else {
          displayContent = displayContent.replace(/^[⏱️\s]+/, '').trim();
        }
      }

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
            <Text
              style={[styles.systemMessageText, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {displayContent}
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
              <GameLogo
                gameType={gameType}
                size={44}
                borderRadius={10}
                fallbackIcon={gameIcon as any}
              />
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

    // ─── Voice Note Message Bubble ──────────────────────────────────────────
    const isVoiceNote = !!item.metadata?.isVoiceNote;
    if (isVoiceNote) {
      const isPlaying = playingVoiceId === item.id;
      return (
        <SwipeableMessageRow onReply={() => handleReply(item)} onForward={() => handleForward(item)} isOwn={isOwn}>
          <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowPeer]}>
            <View
              style={[
                styles.voiceBubble,
                {
                  backgroundColor: isOwn ? theme.colors.cardTintMint || '#142E24' : theme.colors.surfaceElevated,
                  borderColor: isOwn ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.voicePlayBtn, { backgroundColor: isOwn ? theme.colors.primary : theme.colors.surface }]}
                onPress={() => setPlayingVoiceId(isPlaying ? null : item.id)}
                activeOpacity={0.8}
              >
                <Icon
                  name={isPlaying ? 'close' : 'play'}
                  size={14}
                  color={isOwn ? theme.colors.textOnPrimary : theme.colors.primary}
                />
              </TouchableOpacity>
              <View style={styles.voiceWaveformContainer}>
                {[6, 12, 18, 10, 16, 22, 14, 8, 20, 16, 12, 18, 24, 14, 8, 12, 6].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        height: h,
                        backgroundColor: isPlaying && i < 9 ? theme.colors.primary : theme.colors.textMuted,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.voiceDurationText, { color: theme.colors.textSecondary }]}>
                {item.metadata?.durationFormatted || '0:05'}
              </Text>
              <View style={styles.voiceFooter}>
                <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                  {formatMessageTime(item.createdAt)}
                </Text>
                {isOwn && (
                  <View style={styles.statusTick}>
                    <MessageReceiptTicks status={item.status} size={13} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </SwipeableMessageRow>
      );
    }

    // ─── View Once Photo Message Bubble ──────────────────────────────────────
    const isViewOnceMsg = !!item.metadata?.isViewOnce;
    if (isViewOnceMsg) {
      const isOpened = !!item.metadata?.opened;

      if (!isOwn) {
        // Recipient View (Reference Card 6: "View One-time Image" or "After Viewing: Photo expired")
        return (
          <SwipeableMessageRow onReply={() => handleReply(item)} onForward={() => handleForward(item)} isOwn={isOwn}>
            <View style={[styles.messageRow, styles.messageRowPeer]}>
              {!isOpened ? (
                // View One-time Image (Active)
                <View style={[styles.viewOnceCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
                  <View style={styles.viewOnceCardHeader}>
                    <View style={[styles.viewOnceIconLarge, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Icon name="viewOnce" size={24} color={theme.colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.viewOnceTitleLarge, { color: theme.colors.textPrimary }]}>
                      This photo can only be viewed once
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.viewPhotoBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleOpenViewOnce(item)}
                    activeOpacity={0.8}
                  >
                    <Icon name="eye" size={16} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.viewPhotoBtnText, { color: theme.colors.textOnPrimary }]}>
                      View Photo
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.viewOnceCardFooter}>
                    <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ) : (
                // After Viewing (Expired)
                <View style={[styles.viewOnceCard, styles.viewOnceCardExpired, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.viewOnceCardHeader}>
                    <View style={[styles.viewOnceIconLarge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <Icon name="image" size={22} color={theme.colors.textMuted} />
                    </View>
                    <Text style={[styles.viewOnceTitleLarge, { color: theme.colors.textMuted }]}>
                      Photo expired
                    </Text>
                    <Text style={[styles.viewOnceSubtitleSmall, { color: theme.colors.textMuted }]}>
                      This photo can no longer be viewed.
                    </Text>
                  </View>
                  <View style={styles.viewOnceCardFooter}>
                    <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </SwipeableMessageRow>
        );
      }

      // Sender View (Reference Card 6: "Send One-time Image", shows 1 icon)
      return (
        <SwipeableMessageRow onReply={() => handleReply(item)} onForward={() => handleForward(item)} isOwn={isOwn}>
          <View style={[styles.messageRow, styles.messageRowOwn]}>
            <View
              style={[
                styles.bubble,
                styles.bubbleOwn,
                {
                  backgroundColor: theme.colors.cardTintMint || '#142E24',
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                  maxWidth: 240,
                },
              ]}
            >
              {item.metadata?.imageUri ? (
                <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                  <Image source={{ uri: item.metadata.imageUri }} style={styles.bubblePhoto} resizeMode="cover" />
                  <View style={styles.viewOnceBadgeOverlay}>
                    <Icon name="viewOnce" size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.viewOnceBadgeOverlayText}>1</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.viewOnceIconLarge, { alignSelf: 'center', marginVertical: 8, backgroundColor: theme.colors.primary + '20' }]}>
                  <Icon name="viewOnce" size={24} color={theme.colors.primary} strokeWidth={2.5} />
                </View>
              )}
              <View style={styles.bubbleFooter}>
                <View style={styles.viewOnceTag}>
                  <Text style={[styles.viewOnceTagText, { color: theme.colors.primary }]}>① One-time Photo</Text>
                </View>
                <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                  {formatMessageTime(item.createdAt)}
                </Text>
                <View style={styles.statusTick}>
                  <MessageReceiptTicks status={item.status} size={13} />
                </View>
              </View>
            </View>
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
        {isSearchActive ? (
          <View style={styles.searchHeaderBar}>
            <TouchableOpacity
              onPress={() => {
                setIsSearchActive(false);
                setInChatSearch('');
              }}
              style={styles.searchHeaderBackBtn}
              activeOpacity={0.7}
            >
              <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={[styles.searchHeaderInputBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchHeaderInput, { color: theme.colors.textPrimary }]}
                placeholder="Search messages..."
                placeholderTextColor={theme.colors.textMuted}
                value={inChatSearch}
                onChangeText={setInChatSearch}
                autoFocus
              />
              {inChatSearch.length > 0 && (
                <TouchableOpacity onPress={() => setInChatSearch('')}>
                  <Icon name="close" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.searchMatchCount, { color: theme.colors.primary }]}>
              {displayedMessages.length} found
            </Text>
          </View>
        ) : (
          <>
            {/* Back Button */}
            <TouchableOpacity
              onPress={onBack}
              style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityLabel="Back to chats"
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
                  status={isBlocked ? 'offline' : peerOnline ? 'online' : 'offline'}
                />
                <View style={styles.peerHeaderTextCol}>
                  <Text style={[styles.peerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {peerName}
                  </Text>
                  <View style={styles.presenceRow}>
                    {!isBlocked && peerOnline && !isPeerTyping && (
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
                          color: isBlocked
                            ? '#EF4444'
                            : isPeerTyping
                            ? theme.colors.primary
                            : peerOnline
                            ? theme.colors.online
                            : theme.colors.textMuted,
                          fontWeight: isPeerTyping ? '600' : '400',
                        },
                      ]}
                    >
                      {isBlocked
                        ? 'Blocked'
                        : isPeerTyping
                        ? 'typing...'
                        : presenceText || 'offline'}
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

                  <TouchableOpacity
                    onPress={() => setShowThreeDotMenu(true)}
                    style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Chat Options"
                  >
                    <Icon name="moreVertical" size={19} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      if (isBlocked) {
                        Alert.alert('Cannot Call', 'You cannot call a blocked player.');
                        return;
                      }
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
                      if (isBlocked) {
                        Alert.alert('Cannot Call', 'You cannot call a blocked player.');
                        return;
                      }
                      startCall(peerId, peerName, peerUsername, peerAvatarUrl, 'video', conversationId || undefined);
                    }}
                    style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Video Call"
                  >
                    <Icon name="videoCall" size={19} color={theme.colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (isBlocked) {
                        Alert.alert('Cannot Invite', 'You cannot invite a blocked player to games.');
                        return;
                      }
                      setShowInviteModal(true);
                    }}
                    style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Send Game Challenge"
                  >
                    <Icon name="gamepad" size={19} color={theme.colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowThreeDotMenu(true)}
                    style={[styles.headerActionBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Chat Options"
                  >
                    <Icon name="moreVertical" size={19} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Messages Stream */}
        {isLoading && displayedMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...displayedMessages].reverse()}
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

        {/* Quick Emoji Strip */}
        {showEmojiPicker && (
          <View style={[styles.emojiPickerStrip, { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border }]}>
            {['😀', '😂', '🔥', '👍', '🎮', '🎯', '❤️', '🏆', '🎉', '👋'].map((em) => (
              <TouchableOpacity
                key={em}
                onPress={() => {
                  setInputText((prev) => prev + em);
                  setShowEmojiPicker(false);
                }}
                style={styles.emojiPickerItem}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 22 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input Controls Bar / Blocked Banner / Voice Recording Bar ──── */}
        {isBlocked ? (
          <View style={[styles.blockedComposerBanner, { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.blockedBannerInner}>
              <Icon name="ban" size={20} color="#EF4444" />
              <Text style={[styles.blockedBannerText, { color: theme.colors.textSecondary }]}>
                You blocked {peerName}. Unblock to send messages or start calls.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleUnblock}
              style={[styles.unblockBannerBtn, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.unblockBannerBtnText, { color: theme.colors.textOnPrimary }]}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ) : isRecordingVoice ? (
          <View
            style={[
              styles.voiceRecordingBar,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderTopColor: theme.colors.border,
                paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 10),
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleCancelVoiceRecording}
              style={[styles.voiceActionBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
              activeOpacity={0.7}
              accessibilityLabel="Cancel Recording"
            >
              <Icon name="close" size={18} color="#EF4444" />
            </TouchableOpacity>

            <View style={styles.voiceRecordingCenter}>
              <View style={styles.recordingPulseDot} />
              <Text style={[styles.voiceTimerText, { color: theme.colors.textPrimary }]}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
              <View style={styles.recordingWaveBars}>
                {[10, 18, 14, 24, 12, 20, 26, 16, 8, 22].map((h, i) => (
                  <View key={i} style={[styles.recordingWaveBar, { height: h, backgroundColor: theme.colors.primary }]} />
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSendVoiceRecording}
              style={[styles.voiceActionBtn, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.8}
              accessibilityLabel="Send Voice Message"
            >
              <Icon name="send" size={16} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        ) : (
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
            {/* (+) Attachment Menu Trigger Button (Reference Card 2) */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(true)}
              style={[styles.composerAttachmentBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityLabel="Attachment Menu"
            >
              <Icon name="plus" size={20} color={theme.colors.primary} />
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

            {/* Emoji Button */}
            <TouchableOpacity
              onPress={() => setShowEmojiPicker((prev) => !prev)}
              style={[styles.composerIconBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityLabel="Emoji"
            >
              <Icon name="smile" size={19} color={showEmojiPicker ? theme.colors.primary : theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Quick Camera Capture */}
            <TouchableOpacity
              onPress={() => handleCaptureCamera(false)}
              style={[styles.composerIconBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityLabel="Camera"
            >
              <Icon name="camera" size={19} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Quick Gallery Pick */}
            <TouchableOpacity
              onPress={handlePickNormalImage}
              style={[styles.composerIconBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              accessibilityLabel="Gallery"
            >
              <Icon name="image" size={19} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Voice Message Mic or Send Button */}
            {inputText.trim() || pendingImage ? (
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={isSending}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: theme.colors.primary,
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
                    color={theme.colors.textOnPrimary}
                  />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStartVoiceRecording}
                style={[styles.composerIconBtn, { backgroundColor: theme.colors.surface }]}
                activeOpacity={0.7}
                accessibilityLabel="Record Voice Message"
              >
                <Icon name="mic" size={19} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
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
                  <GameLogo
                    gameType={game.serverType || game.type}
                    size={42}
                    borderRadius={10}
                    fallbackIcon={game.icon as any}
                  />
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

            {/* Quick Play Featured Games Grid (Reference Card 7) */}
            <Text style={[styles.quickPlayHeading, { color: theme.colors.textSecondary }]}>
              Popular Games
            </Text>
            <View style={styles.quickPlayGrid}>
              {[
                { type: 'LUDO', serverType: 'LUDO', label: 'Ludo' },
                { type: 'POOL_8_BALL', serverType: 'POOL_8_BALL', label: '8 Ball Pool' },
                { type: 'CARROM', serverType: 'CARROM', label: 'Carrom' },
                { type: 'UNO_STYLE', serverType: 'UNO_STYLE', label: 'UNO' },
                { type: 'SNAKES_AND_LADDERS', serverType: 'SNAKES_AND_LADDERS', label: 'Snake & Ladders' },
                { type: 'TIC_TAC_TOE', serverType: 'TICTACTOE', label: 'Tic Tac Toe' },
              ].map((pg) => (
                <TouchableOpacity
                  key={pg.type}
                  onPress={() => handleSendGameInvite(pg.type, pg.serverType)}
                  style={[styles.quickPlayGridItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  activeOpacity={0.8}
                >
                  <GameLogo gameType={pg.serverType} size={44} borderRadius={12} fallbackIcon="gamepad" />
                  <Text style={[styles.quickPlayGridLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {pg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

      {/* ── Attachment Menu Sheet (Reference Card 3) ────────────────────────── */}
      <Modal
        visible={showAttachmentMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View
            style={[
              styles.attachmentSheetCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.sheetDragHandle} />
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>Share Content</Text>

            <View style={styles.attachmentGrid}>
              {/* 1. Gallery (Normal) */}
              <TouchableOpacity onPress={handlePickNormalImage} style={styles.attachmentGridItem} activeOpacity={0.7}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#3B82F620' }]}>
                  <Icon name="image" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Gallery</Text>
              </TouchableOpacity>

              {/* 2. Camera */}
              <TouchableOpacity onPress={() => handleCaptureCamera(false)} style={styles.attachmentGridItem} activeOpacity={0.7}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#10B98120' }]}>
                  <Icon name="camera" size={24} color="#10B981" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Camera</Text>
              </TouchableOpacity>

              {/* 3. One-time Photo (Purple badge (1)) */}
              <TouchableOpacity onPress={handlePickOneTimeImage} style={styles.attachmentGridItem} activeOpacity={0.7}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#8B5CF625', borderColor: '#8B5CF6', borderWidth: 1.5 }]}>
                  <Icon name="viewOnce" size={26} color="#A78BFA" strokeWidth={2.5} />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: '#A78BFA', fontWeight: '700' }]}>One-time Photo</Text>
              </TouchableOpacity>

              {/* 4. Game Invite */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  setShowInviteModal(true);
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#F59E0B20' }]}>
                  <Icon name="gamepad" size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Game Invite</Text>
              </TouchableOpacity>

              {/* 5. Contact */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  Alert.alert('Contact Sharing', `Share your player card with ${peerName}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Share',
                      onPress: () => {
                        if (conversationId && authUser) {
                          ChatService.sendMessage(
                            conversationId,
                            `📇 Player Contact: ${authUser.displayName} (@${authUser.username || 'player'})`,
                            'TEXT'
                          ).catch(() => null);
                        }
                      },
                    },
                  ]);
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#6366F120' }]}>
                  <Icon name="contact" size={24} color="#6366F1" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Contact</Text>
              </TouchableOpacity>

              {/* 6. File */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  Alert.alert('File Attachment', 'Share match replay data or log?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Game Log',
                      onPress: () => {
                        if (conversationId) {
                          ChatService.sendMessage(
                            conversationId,
                            `📄 match_replay_${Date.now().toString().slice(-4)}.glog (Shared Match Replay)`,
                            'TEXT'
                          ).catch(() => null);
                        }
                      },
                    },
                  ]);
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#06B6D420' }]}>
                  <Icon name="file" size={24} color="#06B6D4" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>File</Text>
              </TouchableOpacity>

              {/* 7. Location */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  if (conversationId) {
                    ChatService.sendMessage(
                      conversationId,
                      '📍 Shared Arena Location: Global Gaming Arena Hub • Main Court',
                      'TEXT'
                    ).catch(() => null);
                  }
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#EC489920' }]}>
                  <Icon name="location" size={24} color="#EC4899" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Location</Text>
              </TouchableOpacity>

              {/* 8. Voice Message */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  handleStartVoiceRecording();
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#10B98120' }]}>
                  <Icon name="mic" size={24} color="#10B981" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Voice Message</Text>
              </TouchableOpacity>

              {/* 9. Poll */}
              <TouchableOpacity
                onPress={() => {
                  setShowAttachmentMenu(false);
                  if (conversationId) {
                    ChatService.sendMessage(
                      conversationId,
                      '📊 Game Poll: Which game should we play tonight?\n1. Ludo Arena\n2. 8-Ball Pool\n3. Chess Grandmaster',
                      'TEXT'
                    ).catch(() => null);
                  }
                }}
                style={styles.attachmentGridItem}
                activeOpacity={0.7}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#3B82F620' }]}>
                  <Icon name="poll" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.attachmentGridLabel, { color: theme.colors.textPrimary }]}>Poll</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 12 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Three Dots Privacy Settings Menu (Reference Card 4) ─────────────── */}
      <Modal
        visible={showThreeDotMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThreeDotMenu(false)}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
          activeOpacity={1}
          onPress={() => setShowThreeDotMenu(false)}
        >
          <View
            style={[
              styles.privacySheetCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.sheetDragHandle} />

            {/* Header info */}
            <View style={styles.privacySheetHeader}>
              <Avatar displayName={peerName} avatarUrl={peerAvatarUrl} size="md" status={isBlocked ? 'offline' : peerOnline ? 'online' : 'offline'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.privacySheetName, { color: theme.colors.textPrimary }]}>{peerName}</Text>
                <Text style={[styles.privacySheetSub, { color: theme.colors.textMuted }]}>
                  {isBlocked ? 'Blocked' : peerOnline ? 'Online' : presenceText || 'Offline'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* View Profile */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  onNavigateToProfile?.(peerId);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="user" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>View Profile</Text>
                </View>
                <Icon name="chevronRight" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Search in Chat */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  setIsSearchActive(true);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="search" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>Search in Chat</Text>
                </View>
              </TouchableOpacity>

              {/* Media, Links & Files */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  setShowMediaGallery(true);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="image" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>Media, Links & Files</Text>
                </View>
                <Icon name="chevronRight" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Mute Notifications Toggle */}
              <View style={styles.privacyRow}>
                <View style={styles.privacyRowLeft}>
                  <Icon name="bell" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>Mute Notifications</Text>
                </View>
                <Switch
                  value={isNotificationsMuted}
                  onValueChange={handleToggleMute}
                  trackColor={{ false: '#334155', true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Disappearing Messages */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  setShowDisappearingModal(true);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="clock" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>Disappearing Messages</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.privacyBadgeText, { color: theme.colors.textMuted }]}>
                    {disappearingOption === 'off' ? 'Off' : disappearingOption}
                  </Text>
                  <Icon name="chevronRight" size={18} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>

              {/* Chat Lock Toggle */}
              <View style={styles.privacyRow}>
                <View style={styles.privacyRowLeft}>
                  <Icon name="lock" size={20} color={theme.colors.textPrimary} />
                  <View>
                    <Text style={[styles.privacyRowLabel, { color: theme.colors.textPrimary }]}>Chat Lock</Text>
                    <Text style={[styles.privacyRowSubLabel, { color: theme.colors.textMuted }]}>
                      Hide this chat from your chat list
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isChatLocked}
                  onValueChange={handleToggleChatLock}
                  trackColor={{ false: '#334155', true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.contextMenuDivider, { backgroundColor: theme.colors.border, marginVertical: 8 }]} />

              {/* Block User */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  setShowBlockModal(true);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="ban" size={20} color="#EF4444" />
                  <Text style={[styles.privacyRowLabel, { color: '#EF4444', fontWeight: '700' }]}>
                    {isBlocked ? 'Unblock User' : 'Block User'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Report User */}
              <TouchableOpacity
                onPress={() => {
                  setShowThreeDotMenu(false);
                  setShowReportModal(true);
                }}
                style={styles.privacyRow}
                activeOpacity={0.7}
              >
                <View style={styles.privacyRowLeft}>
                  <Icon name="flag" size={20} color="#EF4444" />
                  <Text style={[styles.privacyRowLabel, { color: '#EF4444' }]}>Report</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowThreeDotMenu(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 12 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Disappearing Messages Sub-Modal (Reference Card 5) ───────────────── */}
      <Modal
        visible={showDisappearingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDisappearingModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.disappearingModalCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDisappearingModal(false);
                  setShowThreeDotMenu(true);
                }}
                style={{ paddingRight: 10 }}
              >
                <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Disappearing Messages</Text>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
              For more privacy and storage, new messages will disappear from this conversation for everyone after the chosen timer.
            </Text>

            {(['off', '24h', '7d', '30d', '90d'] as const).map((opt) => {
              const label =
                opt === 'off'
                  ? 'Off'
                  : opt === '24h'
                  ? '24 hours'
                  : opt === '7d'
                  ? '7 days'
                  : opt === '30d'
                  ? '30 days'
                  : '90 days';
              const isSelected = disappearingOption === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleSelectDisappearing(opt)}
                  style={[
                    styles.disappearingOptionRow,
                    {
                      backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.disappearingOptionLabel, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Icon name="check" size={12} color={theme.colors.textOnPrimary} strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setShowDisappearingModal(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 12 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Block User Confirmation Modal (Reference Card 10) ────────────────── */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop, justifyContent: 'center', padding: 24 }]}>
          <View
            style={[
              styles.blockModalCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.blockIconLarge}>
              <Icon name="ban" size={32} color="#EF4444" strokeWidth={2.5} />
            </View>

            <Text style={[styles.blockModalTitle, { color: theme.colors.textPrimary }]}>
              {isBlocked ? `Unblock ${peerName}?` : `Block ${peerName}?`}
            </Text>

            {!isBlocked ? (
              <>
                <Text style={[styles.blockModalSub, { color: theme.colors.textSecondary }]}>
                  They won't be able to:
                </Text>
                <View style={styles.blockBulletsContainer}>
                  <Text style={[styles.blockBulletText, { color: theme.colors.textMuted }]}>• Send you messages</Text>
                  <Text style={[styles.blockBulletText, { color: theme.colors.textMuted }]}>• Call you (Audio or Video)</Text>
                  <Text style={[styles.blockBulletText, { color: theme.colors.textMuted }]}>• See your online status or activity</Text>
                  <Text style={[styles.blockBulletText, { color: theme.colors.textMuted }]}>• Invite you to games</Text>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmBlock}
                  style={styles.blockConfirmBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.blockConfirmBtnText}>Block</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.blockModalSub, { color: theme.colors.textSecondary }]}>
                  Unblocking will allow {peerName} to send you messages, start calls, and see your online status.
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    setShowBlockModal(false);
                    await handleUnblock();
                  }}
                  style={[styles.blockConfirmBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.blockConfirmBtnText}>Unblock</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowBlockModal(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, width: '100%', marginTop: 8 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Report User Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}>
          <View
            style={[
              styles.disappearingModalCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary, marginBottom: 6 }]}>
              Report {peerName}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
              Select a category to report this user to moderation.
            </Text>

            {['Spam or Fraud', 'Harassment or Bullying', 'Inappropriate Content', 'Cheating or Exploits', 'Impersonation', 'Other'].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => handleReportUser(cat)}
                style={[styles.disappearingOptionRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.disappearingOptionLabel, { color: theme.colors.textPrimary }]}>{cat}</Text>
                <Icon name="chevronRight" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setShowReportModal(false)}
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 12 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Media, Links & Files Gallery Drawer ──────────────────────────────── */}
      <Modal
        visible={showMediaGallery}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowMediaGallery(false)}
      >
        <View style={[styles.mediaGalleryScreen, { backgroundColor: theme.colors.background }]}>
          <StatusBar barStyle="light-content" />
          <View style={[styles.mediaGalleryHeader, { backgroundColor: theme.colors.surfaceElevated, paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity onPress={() => setShowMediaGallery(false)} style={styles.mediaGalleryCloseBtn}>
              <Icon name="chevronLeft" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.mediaGalleryTitle, { color: theme.colors.textPrimary }]}>Media & Links</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Tabs */}
          <View style={[styles.mediaTabsRow, { backgroundColor: theme.colors.surfaceElevated, borderBottomColor: theme.colors.border }]}>
            {(['media', 'files', 'links'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setMediaTab(tab)}
                style={[
                  styles.mediaTabItem,
                  mediaTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.mediaTabText,
                    { color: mediaTab === tab ? theme.colors.primary : theme.colors.textMuted },
                  ]}
                >
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Media Content */}
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {mediaTab === 'media' && (
              <View style={styles.mediaGrid}>
                {messages
                  .filter((m) => m.metadata?.imageUri)
                  .map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        setActiveViewOnceItem({
                          messageId: m.id,
                          imageUri: m.metadata?.imageUri,
                          senderName: m.senderName,
                          isOwn: m.isOwnMessage,
                        });
                      }}
                      style={styles.mediaGridItem}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: m.metadata?.imageUri }} style={styles.mediaGridThumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                {messages.filter((m) => m.metadata?.imageUri).length === 0 && (
                  <Text style={[styles.emptyMediaText, { color: theme.colors.textMuted }]}>
                    No media shared in this conversation yet.
                  </Text>
                )}
              </View>
            )}

            {mediaTab === 'files' && (
              <View style={{ gap: 8 }}>
                {messages
                  .filter((m) => m.content.includes('.glog') || m.content.includes('File:'))
                  .map((m) => (
                    <View key={m.id} style={[styles.fileRow, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
                      <Icon name="file" size={20} color={theme.colors.primary} />
                      <Text style={[styles.fileRowText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{m.content}</Text>
                    </View>
                  ))}
                {messages.filter((m) => m.content.includes('.glog') || m.content.includes('File:')).length === 0 && (
                  <Text style={[styles.emptyMediaText, { color: theme.colors.textMuted }]}>No files shared yet.</Text>
                )}
              </View>
            )}

            {mediaTab === 'links' && (
              <View style={{ gap: 8 }}>
                {messages
                  .filter((m) => m.content.includes('http://') || m.content.includes('https://'))
                  .map((m) => (
                    <View key={m.id} style={[styles.fileRow, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
                      <Icon name="send" size={16} color={theme.colors.primary} />
                      <Text style={[styles.fileRowText, { color: theme.colors.primary }]} numberOfLines={1}>{m.content}</Text>
                    </View>
                  ))}
                {messages.filter((m) => m.content.includes('http://') || m.content.includes('https://')).length === 0 && (
                  <Text style={[styles.emptyMediaText, { color: theme.colors.textMuted }]}>No links shared yet.</Text>
                )}
              </View>
            )}
          </ScrollView>
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

          {/* Bottom Notice: Explains one-time viewing & screenshot recording disclaimer */}
          <View style={styles.viewOnceBottomNotice}>
            <Text style={styles.viewOnceBottomNoticeText}>
              This photo can only be viewed once and will disappear on close. Note: screenshots or external screen recording cannot be guaranteed to be prevented on all devices.
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
    justifyContent: 'center',
    marginVertical: 6,
    paddingHorizontal: 16,
    width: '100%',
  },
  systemMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '92%',
    alignSelf: 'center',
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
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
    lineHeight: 16,
  },
  // In-Chat Search Bar
  searchHeaderBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchHeaderBackBtn: {
    padding: 6,
    borderRadius: 8,
  },
  searchHeaderInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchHeaderInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchMatchCount: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  // Blocked Banner
  blockedComposerBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockedBannerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockedBannerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  unblockBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Voice Recording Bar
  voiceRecordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  voiceActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRecordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  voiceTimerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recordingWaveBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordingWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  // Quick Emoji Strip
  emojiPickerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  emojiPickerItem: {
    padding: 6,
  },
  // Composer buttons
  composerAttachmentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Voice Note Message Bubble
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    minWidth: 220,
    maxWidth: '82%',
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 3,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  voiceDurationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  voiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginLeft: 2,
  },
  // View Once Recipient Cards (Reference Card 6)
  viewOnceCard: {
    width: 260,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  viewOnceCardExpired: {
    opacity: 0.65,
  },
  viewOnceCardHeader: {
    alignItems: 'center',
    gap: 8,
  },
  viewOnceIconLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnceTitleLarge: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  viewOnceSubtitleSmall: {
    fontSize: 12,
    textAlign: 'center',
  },
  viewPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    width: '100%',
  },
  viewPhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewOnceCardFooter: {
    alignSelf: 'flex-end',
  },
  bubblePhoto: {
    width: 220,
    height: 150,
  },
  viewOnceBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewOnceBadgeOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewOnceTag: {
    marginRight: 6,
  },
  viewOnceTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Quick Play Grid in Game Invite (Reference Card 7)
  quickPlayHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 8,
  },
  quickPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickPlayGridItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  quickPlayGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Attachment Menu Sheet (Reference Card 3)
  attachmentSheetCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sheetDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 18,
    paddingVertical: 6,
  },
  attachmentGridItem: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  attachmentIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Privacy Sheet (Reference Card 4)
  privacySheetCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  privacySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262D3D',
    marginBottom: 8,
  },
  privacySheetName: {
    fontSize: 16,
    fontWeight: '700',
  },
  privacySheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  privacyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  privacyRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  privacyRowSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  privacyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Disappearing Messages Modal (Reference Card 5)
  disappearingModalCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  disappearingOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  disappearingOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Block Modal (Reference Card 10)
  blockModalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  blockIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  blockModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  blockModalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  blockBulletsContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 14,
    borderRadius: 12,
    gap: 6,
    marginVertical: 4,
  },
  blockBulletText: {
    fontSize: 13,
    lineHeight: 18,
  },
  blockConfirmBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  blockConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Media Gallery Modal
  mediaGalleryScreen: {
    flex: 1,
  },
  mediaGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  mediaGalleryCloseBtn: {
    padding: 6,
  },
  mediaGalleryTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  mediaTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mediaTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  mediaTabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaGridItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaGridThumb: {
    width: '100%',
    height: '100%',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  fileRowText: {
    fontSize: 13,
    flex: 1,
  },
  emptyMediaText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
