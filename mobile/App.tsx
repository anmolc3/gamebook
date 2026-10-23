import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameAlertService } from './services/alert.service';
import { SoundService } from './services/sound.service';

// Initialize global game-themed alert interceptor immediately across the whole app
GameAlertService.init();
// Preload game audio subsystem for instant zero-latency sound effects
SoundService.init();

import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
  PanResponder,
  BackHandler,
  Linking,
} from 'react-native';

const otterColorIcon = require('./assets/images/otter-notification.png');
const otterBlackIcon = require('./assets/images/otter-notification-black.png');
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { RoomService, SupportedGameType } from './services/room.service';
import { ThemeShowcaseScreen } from './screens/ThemeShowcaseScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { FriendsScreen } from './screens/friends/FriendsScreen';
import { ChatListScreen } from './screens/chat/ChatListScreen';
import { ConversationScreen } from './screens/chat/ConversationScreen';
import { RoomLobbyScreen } from './screens/rooms/RoomLobbyScreen';
import { TicTacToeScreen } from './screens/games/TicTacToeScreen';
import { LudoScreen } from './screens/games/LudoScreen';
import { LudoLobbyScreen } from './screens/games/LudoLobbyScreen';
import { SnakesAndLaddersScreen } from './screens/games/SnakesAndLaddersScreen';
import { SnakesAndLaddersLobbyScreen } from './screens/games/SnakesAndLaddersLobbyScreen';
import { BoardGameScreen } from './screens/games/BoardGameScreen';
import { BoardGame2Screen } from './screens/games/BoardGame2Screen';
import { CasualGameScreen, CasualGameType } from './screens/games/CasualGameScreen';
import { CardGameScreen, CardGameType } from './screens/games/CardGameScreen';
import { PuzzleGameScreen, PuzzleGameType } from './screens/games/PuzzleGameScreen';
import { PartyGameScreen, PartyGameType } from './screens/games/PartyGameScreen';
import { JoinRoomModal } from './components/organisms/JoinRoomModal';
import { SoloModeModal } from './components/organisms/SoloModeModal';
import { SuggestedFriendsModal } from './components/organisms/SuggestedFriendsModal';
import { SoloService } from './services/solo.service';
import { MarvieBottomNav, NavTab } from './components/organisms/MarvieBottomNav';
import { GameControllerLogo } from './components/atoms/GameControllerLogo';
import { AuthScreen } from './screens/auth/AuthScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { GameDiscoveryScreen } from './screens/discovery/GameDiscoveryScreen';
import { LeaderboardScreen } from './screens/leaderboard/LeaderboardScreen';
import { AchievementsModal } from './screens/discovery/AchievementsModal';
import { StoryViewerModal } from './screens/stories/StoryViewerModal';
import { StoryTrayItem } from './components/organisms/StoryBar';
import { ThemesScreen } from './screens/themes/ThemesScreen';
import { NotificationService, CHANNELS } from './services/notification.service';
import { MobileSocketService } from './services/socket.service';
import { CallProvider } from './features/call/CallContext';
import { CallModal } from './components/organisms/CallModal';
import { GameAlertModal } from './components/organisms/GameAlertModal';
import { OtterMascotAnimation } from './components/organisms/OtterMascotAnimation';

interface ConversationPeer {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  conversationId?: string;
  isGroup?: boolean;
  groupMeta?: any;
}

interface ProfileNavigationOrigin {
  screen: string;
  peer?: ConversationPeer | null;
}

export type AppScreen =
  | 'home'
  | 'themes'
  | 'discovery'
  | 'leaderboards'
  | 'profile'
  | 'friends'
  | 'chatList'
  | 'conversation'
  | 'roomLobby'
  | 'ticTacToe'
  | 'ludo'
  | 'ludoLobby'
  | 'snakesAndLadders'
  | 'snakesAndLaddersLobby'
  | 'boardGame'
  | 'boardGame2'
  | 'casualGame'
  | 'cardGame'
  | 'puzzleGame'
  | 'partyGame';

export interface RouteEntry {
  screen: AppScreen;
  profileUserId?: string;
  activePeer?: ConversationPeer | null;
  currentRoomCode?: string | null;
  currentRoomDetails?: any;
  currentBoardGameType?: 'CONNECT_FOUR' | 'REVERSI' | 'GOMOKU' | 'CHECKERS' | 'CHESS';
  currentBoardGame2Type?:
    | 'CARROM'
    | 'SNAKES_AND_LADDERS'
    | 'BATTLESHIP'
    | 'DOMINOES'
    | 'BACKGAMMON'
    | 'MANCALA'
    | 'CHINESE_CHECKERS';
  currentCasualGameType?: CasualGameType;
  currentCardGameType?: CardGameType;
  currentPuzzleGameType?: PuzzleGameType;
  currentPartyGameType?: PartyGameType;
}

function MainNavigator() {
  const { theme, effectiveMode } = useTheme();
  const isDark = (theme?.mode || effectiveMode) !== 'light';
  const { user, isAuthenticated, isLoading, isNewlyRegistered, dismissNewRegistration } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [history, setHistory] = useState<RouteEntry[]>([]);

  const [currentBoardGameType, setCurrentBoardGameType] = useState<
    'CONNECT_FOUR' | 'REVERSI' | 'GOMOKU' | 'CHECKERS' | 'CHESS'
  >('CHESS');
  const [currentBoardGame2Type, setCurrentBoardGame2Type] = useState<
    | 'CARROM'
    | 'SNAKES_AND_LADDERS'
    | 'BATTLESHIP'
    | 'DOMINOES'
    | 'BACKGAMMON'
    | 'MANCALA'
    | 'CHINESE_CHECKERS'
  >('CARROM');
  const [currentCasualGameType, setCurrentCasualGameType] =
    useState<CasualGameType>('POOL_8_BALL');
  const [currentCardGameType, setCurrentCardGameType] =
    useState<CardGameType>('UNO_STYLE');
  const [currentPuzzleGameType, setCurrentPuzzleGameType] =
    useState<PuzzleGameType>('ROCK_PAPER_SCISSORS');
  const [currentPartyGameType, setCurrentPartyGameType] =
    useState<PartyGameType>('WOULD_YOU_RATHER');
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined);
  const [profileOrigin, setProfileOrigin] = useState<ProfileNavigationOrigin | null>(null);
  const [activePeer, setActivePeer] = useState<ConversationPeer | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [currentRoomDetails, setCurrentRoomDetails] = useState<any>(null);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinModalInitialGame, setJoinModalInitialGame] = useState<SupportedGameType | undefined>(undefined);
  const [joinModalInitialTab, setJoinModalInitialTab] = useState<'solo' | 'quick' | 'join' | 'create'>('quick');
  const [soloModalGameId, setSoloModalGameId] = useState<string | null>(null);
  const [isAchievementsModalVisible, setAchievementsModalVisible] = useState(false);
  const [activeStoryTray, setActiveStoryTray] = useState<StoryTrayItem | null>(null);

  const insets = useSafeAreaInsets();
  const processedMessageIdsRef = React.useRef<Set<string>>(new Set());

  // Context-aware navigation: pushes current screen snapshot onto history stack
  const navigate = useCallback(
    (targetScreen: AppScreen, params?: Partial<RouteEntry>) => {
      // Capture current state snapshot
      const snapshot: RouteEntry = {
        screen: currentScreen,
        profileUserId,
        activePeer,
        currentRoomCode,
        currentRoomDetails,
        currentBoardGameType,
        currentBoardGame2Type,
        currentCasualGameType,
        currentCardGameType,
        currentPuzzleGameType,
        currentPartyGameType,
      };

      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.screen === snapshot.screen &&
          last.profileUserId === snapshot.profileUserId &&
          last.activePeer?.id === snapshot.activePeer?.id &&
          last.currentRoomCode === snapshot.currentRoomCode
        ) {
          return prev;
        }
        return [...prev, snapshot];
      });

      if (params?.profileUserId !== undefined) setProfileUserId(params.profileUserId);
      if (params?.activePeer !== undefined) setActivePeer(params.activePeer);
      if (params?.currentRoomCode !== undefined) setCurrentRoomCode(params.currentRoomCode);
      if (params?.currentRoomDetails !== undefined) setCurrentRoomDetails(params.currentRoomDetails);
      if (params?.currentBoardGameType !== undefined) setCurrentBoardGameType(params.currentBoardGameType);
      if (params?.currentBoardGame2Type !== undefined) setCurrentBoardGame2Type(params.currentBoardGame2Type);
      if (params?.currentCasualGameType !== undefined) setCurrentCasualGameType(params.currentCasualGameType);
      if (params?.currentCardGameType !== undefined) setCurrentCardGameType(params.currentCardGameType);
      if (params?.currentPuzzleGameType !== undefined) setCurrentPuzzleGameType(params.currentPuzzleGameType);
      if (params?.currentPartyGameType !== undefined) setCurrentPartyGameType(params.currentPartyGameType);

      setCurrentScreen(targetScreen);
    },
    [
      currentScreen,
      profileUserId,
      activePeer,
      currentRoomCode,
      currentRoomDetails,
      currentBoardGameType,
      currentBoardGame2Type,
      currentCasualGameType,
      currentCardGameType,
      currentPuzzleGameType,
      currentPartyGameType,
    ]
  );

  // Context-aware goBack: pops previous screen from history and restores exact state
  const goBack = useCallback(
    (fallbackScreen: AppScreen = 'home') => {
      setHistory((prev) => {
        if (prev.length === 0) {
          setProfileUserId(undefined);
          setCurrentRoomCode(null);
          setCurrentRoomDetails(null);
          setCurrentScreen(fallbackScreen);
          return [];
        }

        const next = [...prev];
        const prevEntry = next.pop()!;

        setProfileUserId(prevEntry.profileUserId);
        setActivePeer(prevEntry.activePeer ?? null);
        setCurrentRoomCode(prevEntry.currentRoomCode ?? null);
        setCurrentRoomDetails(prevEntry.currentRoomDetails ?? null);
        if (prevEntry.currentBoardGameType) setCurrentBoardGameType(prevEntry.currentBoardGameType);
        if (prevEntry.currentBoardGame2Type) setCurrentBoardGame2Type(prevEntry.currentBoardGame2Type);
        if (prevEntry.currentCasualGameType) setCurrentCasualGameType(prevEntry.currentCasualGameType);
        if (prevEntry.currentCardGameType) setCurrentCardGameType(prevEntry.currentCardGameType);
        if (prevEntry.currentPuzzleGameType) setCurrentPuzzleGameType(prevEntry.currentPuzzleGameType);
        if (prevEntry.currentPartyGameType) setCurrentPartyGameType(prevEntry.currentPartyGameType);

        setCurrentScreen(prevEntry.screen);
        return next;
      });
    },
    []
  );

  const handleJoinedRoom = (room: any) => {
    let boardType = currentBoardGameType;
    let board2Type = currentBoardGame2Type;
    let casualType = currentCasualGameType;
    let cardType = currentCardGameType;
    let puzzleType = currentPuzzleGameType;
    let partyType = currentPartyGameType;

    if (['CONNECT_FOUR', 'REVERSI', 'GOMOKU', 'CHECKERS', 'CHESS'].includes(room.gameType)) {
      boardType = room.gameType as any;
    } else if (
      [
        'CARROM',
        'SNAKES_AND_LADDERS',
        'BATTLESHIP',
        'DOMINOES',
        'BACKGAMMON',
        'MANCALA',
        'CHINESE_CHECKERS',
      ].includes(room.gameType)
    ) {
      board2Type = room.gameType as any;
    } else if (
      [
        'POOL_8_BALL',
        'MINI_GOLF',
        'AIR_HOCKEY',
        'DARTS',
        'BOWLING',
        'TABLE_TENNIS',
      ].includes(room.gameType)
    ) {
      casualType = room.gameType as any;
    } else if (
      [
        'UNO_STYLE',
        'HEARTS',
        'SPADES',
        'RUMMY',
        'GIN_RUMMY',
        'CRAZY_EIGHTS',
        'GO_FISH',
        'WAR',
        'DURAK',
        'PRESIDENT',
        'BLACKJACK',
        'POKER',
      ].includes(room.gameType)
    ) {
      cardType = room.gameType as any;
    } else if (
      [
        'ROCK_PAPER_SCISSORS',
        'REACTION_TEST',
        'NUMBER_GUESS',
        'SPEED_TAP',
        'COLOR_MATCH',
        'MATH_BATTLE',
        'QUICK_DRAW',
        'WORDLE_DUEL',
        'HANGMAN',
        'MEMORY_MATCH',
        'QUIZ_BATTLE',
        '2048_MULTIPLAYER',
        'MINESWEEPER_DUEL',
        'PATTERN_MATCH',
        'MASTERMIND',
        'WORD_SCRAMBLE',
        'TYPING_RACE',
      ].includes(room.gameType)
    ) {
      puzzleType = room.gameType as any;
    } else {
      partyType = room.gameType as any;
    }

    let targetScreen: AppScreen = 'roomLobby';
    if (room.code.startsWith('SOLO_') || room.status === 'PLAYING') {
      if (room.gameType === 'TICTACTOE') {
        targetScreen = 'ticTacToe';
      } else if (room.gameType === 'LUDO') {
        targetScreen = 'ludo';
      } else if (room.gameType === 'SNAKES_AND_LADDERS') {
        targetScreen = 'snakesAndLadders';
      } else if (['CONNECT_FOUR', 'REVERSI', 'GOMOKU', 'CHECKERS', 'CHESS'].includes(room.gameType)) {
        targetScreen = 'boardGame';
      } else if (
        ['CARROM', 'SNAKES_AND_LADDERS', 'BATTLESHIP', 'DOMINOES', 'BACKGAMMON', 'MANCALA', 'CHINESE_CHECKERS'].includes(
          room.gameType
        )
      ) {
        targetScreen = 'boardGame2';
      } else if (['POOL_8_BALL', 'MINI_GOLF', 'AIR_HOCKEY', 'DARTS', 'BOWLING', 'TABLE_TENNIS'].includes(room.gameType)) {
        targetScreen = 'casualGame';
      } else if (
        ['UNO_STYLE', 'HEARTS', 'SPADES', 'RUMMY', 'GIN_RUMMY', 'CRAZY_EIGHTS', 'GO_FISH', 'WAR', 'DURAK', 'PRESIDENT', 'BLACKJACK', 'POKER'].includes(
          room.gameType
        )
      ) {
        targetScreen = 'cardGame';
      } else if (
        [
          'ROCK_PAPER_SCISSORS',
          'REACTION_TEST',
          'NUMBER_GUESS',
          'SPEED_TAP',
          'COLOR_MATCH',
          'MATH_BATTLE',
          'QUICK_DRAW',
          'WORDLE_DUEL',
          'HANGMAN',
          'MEMORY_MATCH',
          'QUIZ_BATTLE',
          '2048_MULTIPLAYER',
          'MINESWEEPER_DUEL',
          'PATTERN_MATCH',
          'MASTERMIND',
          'WORD_SCRAMBLE',
          'TYPING_RACE',
        ].includes(room.gameType)
      ) {
        targetScreen = 'puzzleGame';
      } else {
        targetScreen = 'partyGame';
      }
    }

    navigate(targetScreen, {
      currentRoomCode: room.code,
      currentRoomDetails: room,
      currentBoardGameType: boardType,
      currentBoardGame2Type: board2Type,
      currentCasualGameType: casualType,
      currentCardGameType: cardType,
      currentPuzzleGameType: puzzleType,
      currentPartyGameType: partyType,
    });
  };

  // Synchronize active conversation with NotificationService for foreground notification suppression
  useEffect(() => {
    if (currentScreen === 'conversation' && activePeer) {
      NotificationService.setActiveConversation(activePeer.conversationId || null, activePeer.id || null);
    } else {
      NotificationService.setActiveConversation(null, null);
    }
  }, [currentScreen, activePeer]);

  // Listen globally to incoming messages & invites over socket to display in-app banners and update state
  useEffect(() => {
    if (!isAuthenticated) return;

    MobileSocketService.connect();

    const unsubscribeChat = MobileSocketService.onMessageReceived((msg: any) => {
      if (!msg) return;

      // Ignore own messages
      if (user?.id && msg.senderId === user.id) return;

      // Deduplicate by message id
      if (msg.id && processedMessageIdsRef.current.has(msg.id)) return;
      if (msg.id) {
        processedMessageIdsRef.current.add(msg.id);
        if (processedMessageIdsRef.current.size > 100) {
          const first = processedMessageIdsRef.current.values().next().value;
          if (first) processedMessageIdsRef.current.delete(first);
        }
      }

      // Don't show in-app banner if the user is already actively chatting with this peer
      if (
        currentScreen === 'conversation' &&
        activePeer &&
        (activePeer.id === msg.senderId || activePeer.conversationId === msg.conversationId)
      ) {
        return;
      }

      const rawSender = msg.senderName || msg.sender?.displayName || msg.sender?.username || 'Player';
      const senderTitle = rawSender.replace(/^💬\s*/, '').trim() || 'Player';
      const previewText = msg.metadata?.isViewOnce
        ? '📷 Sent a view-once photo'
        : msg.type === 'GAME_INVITE'
        ? `🎮 Challenged you to play ${msg.metadata?.gameName || msg.metadata?.gameType || 'a match'}! (#${msg.metadata?.roomCode || ''})`
        : msg.content || 'Sent an attachment';

      NotificationService.displayInAppBanner(
        senderTitle,
        previewText,
        {
          type: msg.type === 'GAME_INVITE' ? 'GAME_INVITE' : 'CHAT_MESSAGE',
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderName: senderTitle,
          messageId: msg.id,
          roomCode: msg.metadata?.roomCode,
        }
      );
    });

    const unsubscribeInvite = MobileSocketService.onGameInviteReceived((invite: any) => {
      if (!invite || !invite.roomCode) return;
      if (user?.id && invite.inviterId === user.id) return;

      const inviter = invite.inviterName || 'A friend';
      const gameTitle = invite.gameName || invite.gameType || 'Multiplayer Game';

      NotificationService.displayInAppBanner(
        `🎮 Game Invite: ${inviter}`,
        `${inviter} invited you to play ${gameTitle}! Room #${invite.roomCode}`,
        {
          type: 'GAME_INVITE',
          roomCode: invite.roomCode,
          gameType: invite.gameType,
        }
      );

      Alert.alert(
        '🎮 Game Invite!',
        `${inviter} invited you to play ${gameTitle}!\n\nRoom Code: #${invite.roomCode}`,
        [
          {
            text: 'Decline',
            style: 'cancel',
          },
          {
            text: 'Accept & Join',
            onPress: async () => {
              try {
                const joined = await RoomService.joinRoom(invite.roomCode);
                handleJoinedRoom(joined);
              } catch (err: any) {
                Alert.alert('Unable to Join', err?.message || 'Room could not be joined');
              }
            },
          },
        ]
      );
    });

    const unsubscribeNotif = MobileSocketService.onNotificationReceived((notif: any) => {
      if (!notif) return;

      // Skip CHAT_MESSAGE and MENTION here because onMessageReceived already handles them
      if (notif.type === 'CHAT_MESSAGE' || notif.type === 'MENTION') {
        return;
      }

      // Don't show redundant in-app banner if actively inside conversation with this peer
      if (
        notif.type === 'MISSED_CALL' &&
        currentScreen === 'conversation' &&
        activePeer &&
        (activePeer.id === notif.data?.senderId || activePeer.conversationId === notif.data?.conversationId)
      ) {
        return;
      }

      const cleanTitle = (notif.title || 'Notification').replace(/^💬\s*/, '').trim();
      NotificationService.displayInAppBanner(
        cleanTitle,
        notif.message,
        notif.data
      );
    });

    return () => {
      unsubscribeChat();
      unsubscribeInvite();
      unsubscribeNotif();
    };
  }, [isAuthenticated, currentScreen, activePeer, user?.id]);

  const MAIN_SWIPE_TABS: Array<'home' | 'friends' | 'discovery' | 'chatList' | 'profile'> = [
    'home',
    'friends',
    'discovery',
    'chatList',
    'profile',
  ];

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
          const isSignificant = Math.abs(gestureState.dx) > 35;
          const isMainScreen = MAIN_SWIPE_TABS.includes(currentScreen as any) && !profileUserId;
          return isHorizontal && isSignificant && isMainScreen;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!MAIN_SWIPE_TABS.includes(currentScreen as any) || profileUserId) return;
          const currentIndex = MAIN_SWIPE_TABS.indexOf(currentScreen as any);
          if (currentIndex === -1) return;

          // Swipe Left (finger moves left) -> Next Tab
          if (gestureState.dx < -50 && currentIndex < MAIN_SWIPE_TABS.length - 1) {
            const nextScreen = MAIN_SWIPE_TABS[currentIndex + 1];
            setProfileUserId(undefined);
            setProfileOrigin(null);
            setHistory([]);
            setCurrentScreen(nextScreen);
          }
          // Swipe Right (finger moves right) -> Previous Tab
          else if (gestureState.dx > 50 && currentIndex > 0) {
            const prevScreen = MAIN_SWIPE_TABS[currentIndex - 1];
            setProfileUserId(undefined);
            setProfileOrigin(null);
            setHistory([]);
            setCurrentScreen(prevScreen);
          }
        },
      }),
    [currentScreen, profileUserId]
  );

  const [inAppBanner, setInAppBanner] = useState<{ title: string; body: string; data?: any } | null>(null);
  const bannerTimerRef = React.useRef<any>(null);
  const bannerAnim = useRef(new Animated.Value(-120)).current;

  const dismissBanner = useCallback(() => {
    Animated.timing(bannerAnim, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setInAppBanner(null);
    });
  }, [bannerAnim]);

  const handleNotificationDataNavigation = useCallback(
    (data: any) => {
      if (!data) return;
      if (
        (data.type === 'CHAT_MESSAGE' || data.type === 'MENTION' || data.type === 'MISSED_CALL') &&
        (data.senderId || data.callerId || data.conversationId)
      ) {
        navigate('conversation', {
          activePeer: {
            id: data.senderId || data.callerId,
            name: data.senderName || data.callerName || 'Player',
            username: data.senderUsername || data.callerUsername || data.senderName || 'player',
            avatarUrl: data.senderAvatarUrl || data.callerAvatarUrl || null,
            conversationId: data.conversationId,
          },
        });
      } else if (data.type === 'GAME_INVITE' && data.roomCode) {
        navigate('roomLobby', { currentRoomCode: data.roomCode });
      } else if (data.type === 'FRIEND_REQUEST' || data.type === 'FRIEND_ACCEPTED') {
        navigate('friends');
      }
    },
    [navigate]
  );

  useEffect(() => {
    const unsubBanner = NotificationService.addInAppBannerListener((banner) => {
      if (
        currentScreen === 'conversation' &&
        activePeer &&
        (activePeer.id === banner.data?.senderId || activePeer.conversationId === banner.data?.conversationId)
      ) {
        return;
      }
      setInAppBanner(banner);
      Animated.spring(bannerAnim, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }).start();

      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => {
        dismissBanner();
      }, 4500);
    });

    return () => {
      unsubBanner();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [currentScreen, activePeer, bannerAnim, dismissBanner]);

  // Deep linking & Notification response listener (with valid back navigation path)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check cold-start notification response
    NotificationService.getLastNotificationResponse().then((resp) => {
      if (!resp) return;
      const data = resp.notification?.request?.content?.data as any;
      handleNotificationDataNavigation(data);
    });

    // Foreground / background notification tap response listener
    const unsubResponse = NotificationService.addResponseListener((resp) => {
      if (!resp) return;
      const data = resp.notification?.request?.content?.data as any;
      handleNotificationDataNavigation(data);
    });

    // Deep link handling (e.g. gamearena://room/CODE, gamearena://chat/USERID, gamearena://profile/USERID)
    const handleUrl = (event: { url: string }) => {
      if (!event.url) return;
      try {
        const urlStr = event.url;
        if (urlStr.includes('/room/')) {
          const code = urlStr.split('/room/')[1]?.split('?')[0]?.toUpperCase();
          if (code) navigate('roomLobby', { currentRoomCode: code });
        } else if (urlStr.includes('/chat/')) {
          const peerId = urlStr.split('/chat/')[1]?.split('?')[0];
          if (peerId) {
            navigate('conversation', {
              activePeer: {
                id: peerId,
                name: 'Player',
                username: 'player',
                avatarUrl: null,
              },
            });
          }
        } else if (urlStr.includes('/profile/')) {
          const targetId = urlStr.split('/profile/')[1]?.split('?')[0];
          if (targetId) navigate('profile', { profileUserId: targetId });
        }
      } catch (err) {
        console.warn('Deep link parse error:', err);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const subUrl = Linking.addEventListener('url', handleUrl);

    return () => {
      unsubResponse();
      subUrl.remove();
    };
  }, [isAuthenticated, navigate]);

  // Handle global Android hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      // 1. If modals open in App.tsx, close them
      if (isJoinModalVisible) {
        setIsJoinModalVisible(false);
        return true;
      }
      if (soloModalGameId) {
        setSoloModalGameId(null);
        return true;
      }
      if (isAchievementsModalVisible) {
        setAchievementsModalVisible(false);
        return true;
      }
      if (activeStoryTray) {
        setActiveStoryTray(null);
        return true;
      }

      // 2. If in live match screen: return to room lobby (ludo manages its own exit confirmation)
      if (
        [
          'ticTacToe',
          'snakesAndLadders',
          'boardGame',
          'boardGame2',
          'casualGame',
          'cardGame',
          'puzzleGame',
          'partyGame',
        ].includes(currentScreen)
      ) {
        goBack('roomLobby');
        return true;
      }

      // 3. If in room lobby: clear room and return to origin
      if (currentScreen === 'roomLobby') {
        setCurrentRoomCode(null);
        setCurrentRoomDetails(null);
        goBack('home');
        return true;
      }

      // 4. If viewing peer profile: return to origin
      if (currentScreen === 'profile' && profileUserId) {
        setProfileUserId(undefined);
        setProfileOrigin(null);
        goBack('friends');
        return true;
      }

      // 5. If viewing own profile and opened as non-tab or from elsewhere
      if (currentScreen === 'profile' && !profileUserId) {
        if (history.length > 0) {
          goBack('home');
          return true;
        }
        if (profileOrigin?.screen) {
          const orig = profileOrigin.screen;
          setProfileOrigin(null);
          setCurrentScreen(orig as any);
          return true;
        }
      }

      // 6. If in conversation: return to chat list or previous origin
      if (currentScreen === 'conversation') {
        setActivePeer(null);
        goBack('chatList');
        return true;
      }

      // 7. If history has previous screens, goBack()
      if (history.length > 0) {
        goBack('home');
        return true;
      }

      // 8. If on a secondary screen without history, go to home
      if (['chatList', 'friends', 'leaderboards', 'themes', 'discovery'].includes(currentScreen)) {
        if (currentScreen !== 'home') {
          setCurrentScreen('home');
          return true;
        }
      }

      // 9. On home screen: let default OS exit app
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [
    currentScreen,
    profileUserId,
    profileOrigin,
    history,
    goBack,
    isJoinModalVisible,
    soloModalGameId,
    isAchievementsModalVisible,
    activeStoryTray,
  ]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <OtterMascotAnimation width={180} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        initialMode={authScreen === 'register' ? 'register' : 'login'}
        onModeChange={(mode) => setAuthScreen(mode)}
      />
    );
  }

  // Active Tic-Tac-Toe Live Match Screen
  if (currentScreen === 'ticTacToe' && currentRoomCode) {
    return (
      <TicTacToeScreen
        roomCode={currentRoomCode}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Ludo World Live Match Screen
  if (currentScreen === 'ludo' && currentRoomCode) {
    return (
      <LudoScreen
        roomCode={currentRoomCode}
        roomDetails={currentRoomDetails}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Snake & Ladder Live Match Screen
  if (currentScreen === 'snakesAndLadders' && currentRoomCode) {
    return (
      <SnakesAndLaddersScreen
        roomCode={currentRoomCode}
        roomDetails={currentRoomDetails}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Strategy Board Game Screen (Chess, Checkers, Connect 4, Gomoku, Reversi)
  if (currentScreen === 'boardGame' && currentRoomCode) {
    return (
      <BoardGameScreen
        roomCode={currentRoomCode}
        gameType={currentBoardGameType}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Traditional Board Game Screen II (Carrom, Snakes & Ladders, Battleship, Dominoes, Backgammon, Mancala, Chinese Checkers)
  if (currentScreen === 'boardGame2' && currentRoomCode) {
    return (
      <BoardGame2Screen
        roomCode={currentRoomCode}
        gameType={currentBoardGame2Type}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Casual & Arcade Game Screen (Pool, Mini Golf, Air Hockey, Darts, Bowling, Table Tennis)
  if (currentScreen === 'casualGame' && currentRoomCode) {
    return (
      <CasualGameScreen
        roomCode={currentRoomCode}
        gameType={currentCasualGameType}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Card Game Screen (Phase 13: 12 Card Games)
  if (currentScreen === 'cardGame' && currentRoomCode) {
    return (
      <CardGameScreen
        roomCode={currentRoomCode}
        gameType={currentCardGameType}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Word, Quiz & Fast Puzzle Game Screen (Phase 14: 17 Titles)
  if (currentScreen === 'puzzleGame' && currentRoomCode) {
    return (
      <PuzzleGameScreen
        roomCode={currentRoomCode}
        gameType={currentPuzzleGameType}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Party & Social Game Screen (Phase 15: 14 Titles)
  if (currentScreen === 'partyGame' && currentRoomCode) {
    return (
      <PartyGameScreen
        roomCode={currentRoomCode}
        gameType={currentPartyGameType}
        onLeave={() => {
          goBack('roomLobby');
        }}
      />
    );
  }

  // Active Game Room Lobby Screen
  if (currentScreen === 'roomLobby' && currentRoomCode) {
    return (
      <RoomLobbyScreen
        roomCode={currentRoomCode}
        initialRoom={currentRoomDetails}
        onBack={() => {
          setCurrentRoomCode(null);
          setCurrentRoomDetails(null);
          goBack('home');
        }}
        onGameStart={handleJoinedRoom}
        onInviteFriends={() => {
          // Handled directly via in-lobby InvitePlayersModal
        }}
      />
    );
  }

  // Active Conversation Screen (1-on-1 or Group) & Overlay Profile when opened from Conversation
  if (
    (currentScreen === 'conversation' ||
      (currentScreen === 'profile' && profileOrigin?.screen === 'conversation')) &&
    activePeer
  ) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ConversationScreen
          peerId={activePeer.id}
          peerName={activePeer.name}
          peerUsername={activePeer.username}
          peerAvatarUrl={activePeer.avatarUrl}
          initialConversationId={activePeer.conversationId}
          isGroup={activePeer.isGroup}
          groupMeta={activePeer.groupMeta}
          onBack={() => {
            setActivePeer(null);
            goBack('chatList');
          }}
          onNavigateToProfile={(targetId) => {
            setProfileOrigin({
              screen: 'conversation',
              peer: activePeer,
            });
            navigate('profile', { profileUserId: targetId });
          }}
          onJoinGameRoom={(roomCode) => {
            navigate('roomLobby', { currentRoomCode: roomCode });
          }}
        />

        {currentScreen === 'profile' && profileUserId && (
          <View style={StyleSheet.absoluteFill}>
            <ProfileScreen
              userId={profileUserId}
              onBack={() => {
                setProfileUserId(undefined);
                setProfileOrigin(null);
                goBack('conversation');
              }}
              onNavigateToChat={(targetId, username) => {
                setProfileUserId(undefined);
                setProfileOrigin(null);
                if (activePeer.id !== targetId) {
                  setActivePeer({
                    id: targetId,
                    name: username,
                    username,
                    avatarUrl: null,
                  });
                }
                setCurrentScreen('conversation');
              }}
              onChallenge={() => setIsJoinModalVisible(true)}
            />
          </View>
        )}
      </View>
    );
  }

  // Peer's profile (viewing someone else from non-conversation origin, e.g. friends, social feed)
  if (currentScreen === 'profile' && profileUserId) {
    return (
      <ProfileScreen
        userId={profileUserId}
        onBack={() => {
          setProfileUserId(undefined);
          setProfileOrigin(null);
          goBack('friends');
        }}
        onNavigateToChat={(targetId, username) => {
          setProfileUserId(undefined);
          setProfileOrigin(null);
          navigate('conversation', {
            activePeer: {
              id: targetId,
              name: username,
              username,
              avatarUrl: null,
            },
          });
        }}
        onChallenge={() => setIsJoinModalVisible(true)}
      />
    );
  }

  // Determine active tab for MarvieBottomNav
  const getActiveTab = (): NavTab => {
    if (currentScreen === 'friends') return 'friends';
    if (currentScreen === 'chatList') return 'chatList';
    if (currentScreen === 'profile') return 'profile';
    if (
      currentScreen === 'discovery' ||
      currentScreen === 'ludoLobby' ||
      currentScreen === 'snakesAndLaddersLobby'
    )
      return 'play';
    return 'home';
  };

  const handleTabSelect = (tab: NavTab) => {
    setProfileUserId(undefined);
    setProfileOrigin(null);
    setHistory([]);
    if (tab === 'play') {
      setCurrentScreen('discovery');
    } else if (tab === 'home') {
      setCurrentScreen('home');
    } else if (tab === 'friends') {
      setCurrentScreen('friends');
    } else if (tab === 'chatList') {
      setCurrentScreen('chatList');
    } else if (tab === 'profile') {
      setCurrentScreen('profile');
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      {/* Screen Content with Horizontal Swipe Tab Switching */}
      <View style={styles.screenWrapper} {...panResponder.panHandlers}>
        {currentScreen === 'home' && (
          <ThemeShowcaseScreen
            onPressProfile={() => {
              setProfileUserId(undefined);
              navigate('profile');
            }}
            onPressFriends={() => navigate('friends')}
            onPressChat={() => navigate('chatList')}
            onPressThemes={() => navigate('themes')}
            onPressPlay={(gameType) => {
              if (gameType === 'LUDO') {
                navigate('ludoLobby');
              } else if (gameType === 'SNAKES_AND_LADDERS') {
                navigate('snakesAndLaddersLobby');
              } else if (gameType) {
                setSoloModalGameId(gameType);
              } else {
                setJoinModalInitialGame(undefined);
                setJoinModalInitialTab('quick');
                setIsJoinModalVisible(true);
              }
            }}
            onPressDiscovery={() => navigate('discovery')}
            onPressLeaderboards={() => navigate('leaderboards')}
            onPressStoryTray={(tray) => setActiveStoryTray(tray)}
            onOpenConversation={(peer) => {
              navigate('conversation', { activePeer: peer });
            }}
            onJoinGameRoom={(roomCode) => {
              navigate('roomLobby', { currentRoomCode: roomCode });
            }}
          />
        )}

        {currentScreen === 'themes' && (
          <ThemesScreen
            onBack={() => goBack('home')}
          />
        )}

        {currentScreen === 'ludoLobby' && (
          <LudoLobbyScreen
            onBack={() => goBack('discovery')}
            onPlayOnline={async (playerCount) => {
              try {
                const res = await RoomService.matchmake('LUDO', playerCount);
                handleJoinedRoom(res.room || res);
              } catch (err: any) {
                try {
                  const room = await RoomService.createRoom('LUDO', false, playerCount);
                  handleJoinedRoom(room);
                } catch (fallbackErr: any) {
                  Alert.alert('Matchmaking Failed', fallbackErr.message || 'Could not find or create match');
                }
              }
            }}
            onCreateRoom={async (playerCount) => {
              try {
                const room = await RoomService.createRoom('LUDO', true, playerCount);
                handleJoinedRoom(room);
              } catch (err: any) {
                Alert.alert('Create Room Failed', err.message || 'Could not create private room');
              }
            }}
            onJoinRoom={async (code) => {
              try {
                const room = await RoomService.joinRoom(code);
                handleJoinedRoom(room);
              } catch (err: any) {
                Alert.alert('Join Room Failed', err.message || 'Could not join room with this code');
              }
            }}
            onPlaySolo={async (playerCount, difficulty = 'MEDIUM') => {
              try {
                const res = await SoloService.startSoloMatch('LUDO', difficulty as any, undefined, playerCount - 1, playerCount);
                handleJoinedRoom({
                  id: res.matchId,
                  code: res.roomCode,
                  gameType: 'LUDO',
                  status: 'PLAYING',
                  hostId: 'SOLO_HOST',
                  isPrivate: true,
                  maxPlayers: playerCount,
                  createdAt: new Date().toISOString(),
                  participants: res.players || [],
                  players: res.players || [],
                  state: res.state,
                });
              } catch (err: any) {
                Alert.alert('Solo Mode Error', err.message || 'Could not start match vs Otter');
              }
            }}
          />
        )}

        {currentScreen === 'snakesAndLaddersLobby' && (
          <SnakesAndLaddersLobbyScreen
            onBack={() => goBack('discovery')}
            onPlayOnline={async (playerCount) => {
              try {
                const res = await RoomService.matchmake('SNAKES_AND_LADDERS', playerCount);
                handleJoinedRoom(res.room || res);
              } catch (err: any) {
                try {
                  const room = await RoomService.createRoom('SNAKES_AND_LADDERS', false, playerCount);
                  handleJoinedRoom(room);
                } catch (fallbackErr: any) {
                  Alert.alert('Matchmaking Failed', fallbackErr.message || 'Could not find or create match');
                }
              }
            }}
            onCreateRoom={async (playerCount) => {
              try {
                const room = await RoomService.createRoom('SNAKES_AND_LADDERS', true, playerCount);
                handleJoinedRoom(room);
              } catch (err: any) {
                Alert.alert('Create Room Failed', err.message || 'Could not create private room');
              }
            }}
            onJoinRoom={async (code) => {
              try {
                const room = await RoomService.joinRoom(code);
                handleJoinedRoom(room);
              } catch (err: any) {
                Alert.alert('Join Room Failed', err.message || 'Could not join room with this code');
              }
            }}
            onPlaySolo={async (playerCount, difficulty = 'MEDIUM', botId) => {
              try {
                const res = await SoloService.startSoloMatch('SNAKES_AND_LADDERS', difficulty as any, botId, playerCount - 1, playerCount);
                handleJoinedRoom({
                  id: res.matchId,
                  code: res.roomCode,
                  gameType: 'SNAKES_AND_LADDERS',
                  status: 'PLAYING',
                  hostId: 'SOLO_HOST',
                  isPrivate: true,
                  maxPlayers: playerCount,
                  createdAt: new Date().toISOString(),
                  participants: res.players || [],
                  players: res.players || [],
                  state: res.state,
                });
              } catch (err: any) {
                Alert.alert('Solo Mode Error', err.message || 'Could not start match vs Otter');
              }
            }}
          />
        )}

        {currentScreen === 'discovery' && (
          <GameDiscoveryScreen
            onSelectGame={(gameId) => {
              if (gameId === 'LUDO') {
                navigate('ludoLobby');
              } else if (gameId === 'SNAKES_AND_LADDERS') {
                navigate('snakesAndLaddersLobby');
              } else {
                setSoloModalGameId(gameId);
              }
            }}
            onPressLeaderboards={() => navigate('leaderboards')}
            onPressAchievements={() => setAchievementsModalVisible(true)}
            onBack={() => goBack('home')}
          />
        )}

        {currentScreen === 'leaderboards' && (
          <LeaderboardScreen
            onBack={() => goBack('home')}
            onPressAchievements={() => setAchievementsModalVisible(true)}
            onRequestRematch={(_gameType) => {
              setIsJoinModalVisible(true);
            }}
          />
        )}

        {currentScreen === 'friends' && (
          <FriendsScreen
            onBack={() => goBack('home')}
            onViewProfile={(targetId) => {
              navigate('profile', { profileUserId: targetId });
            }}
            onNavigateToChat={(targetId, username) => {
              navigate('conversation', {
                activePeer: {
                  id: targetId,
                  name: username,
                  username,
                  avatarUrl: null,
                },
              });
            }}
            onChallenge={() => setIsJoinModalVisible(true)}
          />
        )}

        {currentScreen === 'chatList' && (
          <ChatListScreen
            onBack={() => goBack('home')}
            onNavigateToFriends={() => navigate('friends')}
            onSelectConversation={(peerId, peerName, peerUsername, peerAvatarUrl, convId, isGroup, groupMeta) => {
              navigate('conversation', {
                activePeer: {
                  id: peerId,
                  name: peerName,
                  username: peerUsername,
                  avatarUrl: peerAvatarUrl,
                  conversationId: convId,
                  isGroup,
                  groupMeta,
                },
              });
            }}
          />
        )}

        {currentScreen === 'profile' && !profileUserId && (
          <ProfileScreen
            onBack={() => {
              goBack('home');
            }}
            onNavigateToChat={(targetId, username) => {
              navigate('conversation', {
                activePeer: {
                  id: targetId,
                  name: username,
                  username,
                  avatarUrl: null,
                },
              });
            }}
            onChallenge={() => setIsJoinModalVisible(true)}
          />
        )}
      </View>

      {/* Marvie 5-Elements Bottom Navigation */}
      <MarvieBottomNav
        currentTab={getActiveTab()}
        onSelectTab={handleTabSelect}
      />

      {/* Quick Play & Matchmaking Modal */}
      <JoinRoomModal
        visible={isJoinModalVisible}
        onClose={() => setIsJoinModalVisible(false)}
        initialGameType={joinModalInitialGame}
        initialTab={joinModalInitialTab}
        onJoinedRoom={handleJoinedRoom}
      />

      {/* Solo Mode & AI Opponent Selector Modal */}
      {soloModalGameId && (
        <SoloModeModal
          visible={!!soloModalGameId}
          gameId={soloModalGameId}
          onClose={() => setSoloModalGameId(null)}
          onStartSolo={async (gameId, difficulty, botId) => {
            try {
              const res = await SoloService.startSoloMatch(gameId, difficulty, botId);
              setSoloModalGameId(null);
              handleJoinedRoom({
                id: res.matchId,
                code: res.roomCode,
                gameType: res.gameType as any,
                status: 'PLAYING',
                hostId: 'SOLO_HOST',
                isPrivate: true,
                createdAt: new Date().toISOString(),
                participants: res.players || [],
                players: res.players || [],
                state: res.state,
              });
            } catch (err: any) {
              Alert.alert('Solo Mode Error', err.message || 'Could not start solo match');
            }
          }}
          onPlayWithFriends={(gameId) => {
            const targetGame = (gameId || soloModalGameId) as any;
            setSoloModalGameId(null);
            setJoinModalInitialGame(targetGame);
            setJoinModalInitialTab('create');
            setIsJoinModalVisible(true);
          }}
          onPlayOnline={async (gameId) => {
            const targetGame = (gameId || soloModalGameId) as any;
            setSoloModalGameId(null);
            try {
              const room = await RoomService.matchmake(targetGame);
              handleJoinedRoom(room);
            } catch (err: any) {
              setJoinModalInitialGame(targetGame);
              setJoinModalInitialTab('quick');
              setIsJoinModalVisible(true);
            }
          }}
        />
      )}

      {/* Achievements Modal */}
      <AchievementsModal
        visible={isAchievementsModalVisible}
        onClose={() => setAchievementsModalVisible(false)}
      />

      {/* 24-Hour Ephemeral Story Viewer Modal */}
      <StoryViewerModal
        visible={!!activeStoryTray}
        tray={activeStoryTray}
        onClose={() => setActiveStoryTray(null)}
        onStoryDeleted={() => setActiveStoryTray(null)}
      />

      {/* Suggested Players Near You Onboarding Modal */}
      <SuggestedFriendsModal
        visible={isNewlyRegistered}
        onClose={dismissNewRegistration}
        onViewProfile={(targetUserId) => {
          dismissNewRegistration();
          navigate('profile', { profileUserId: targetUserId });
        }}
      />

      {/* Global In-App Floating Notification Banner */}
      {inAppBanner && (
        <Animated.View
          style={{
            position: 'absolute',
            top: Math.max(insets.top + 8, 38),
            left: 14,
            right: 14,
            transform: [{ translateY: bannerAnim }],
            zIndex: 999999,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            style={{
              backgroundColor: isDark
                ? (theme.colors?.surfaceElevated || '#1E2530')
                : '#FFFFFF',
              borderRadius: 20,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 0,
              shadowColor: isDark ? '#000000' : '#0F172A',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.45 : 0.12,
              shadowRadius: 16,
              elevation: 10,
            }}
            onPress={() => {
              const data = inAppBanner.data;
              dismissBanner();
              if (data) {
                handleNotificationDataNavigation(data);
              }
            }}
          >
            {/* Otter mascot avatar with badge */}
            <View style={{ position: 'relative', marginRight: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={isDark ? otterColorIcon : otterBlackIcon}
                  style={{ width: 36, height: 36, resizeMode: 'contain' }}
                />
              </View>
              {/* Type pill indicator badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: isDark ? '#2D3748' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? (theme.colors?.surfaceElevated || '#1E2530')
                    : '#FFFFFF',
                }}
              >
                <Text style={{ fontSize: 9 }}>
                  {inAppBanner.data?.type === 'GAME_INVITE'
                    ? '🎮'
                    : inAppBanner.data?.type === 'FRIEND_REQUEST'
                    ? '👥'
                    : inAppBanner.data?.type === 'MISSED_CALL'
                    ? '📞'
                    : '💬'}
                </Text>
              </View>
            </View>

            {/* Notification content */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  fontWeight: '700',
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {inAppBanner.title}
              </Text>
              <Text
                style={{
                  color: isDark ? '#94A3B8' : '#64748B',
                  fontSize: 12,
                  marginTop: 2,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {inAppBanner.body}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AuthProvider>
          <CallProvider>
            <MainNavigator />
            {/* Global Real-Time 1-on-1 Audio & Video Call Overlay */}
            <CallModal />
            {/* Global Game-Themed Alert Dialog Overlay - Mounted across 100% of screens */}
            <GameAlertModal />
          </CallProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    paddingTop: 0,
  },
  screenWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

