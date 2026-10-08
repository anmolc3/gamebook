import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert, StatusBar, Platform } from 'react-native';
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
import { BoardGameScreen } from './screens/games/BoardGameScreen';
import { BoardGame2Screen } from './screens/games/BoardGame2Screen';
import { CasualGameScreen, CasualGameType } from './screens/games/CasualGameScreen';
import { CardGameScreen, CardGameType } from './screens/games/CardGameScreen';
import { PuzzleGameScreen, PuzzleGameType } from './screens/games/PuzzleGameScreen';
import { PartyGameScreen, PartyGameType } from './screens/games/PartyGameScreen';
import { JoinRoomModal } from './components/organisms/JoinRoomModal';
import { SoloModeModal } from './components/organisms/SoloModeModal';
import { SoloService } from './services/solo.service';
import { MarvieBottomNav, NavTab } from './components/organisms/MarvieBottomNav';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { GameDiscoveryScreen } from './screens/discovery/GameDiscoveryScreen';
import { LeaderboardScreen } from './screens/leaderboard/LeaderboardScreen';
import { AchievementsModal } from './screens/discovery/AchievementsModal';
import { StoryViewerModal } from './screens/stories/StoryViewerModal';
import { StoryTrayItem } from './components/organisms/StoryBar';
import { ThemesScreen } from './screens/themes/ThemesScreen';

interface ConversationPeer {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  conversationId?: string;
}

function MainNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [currentScreen, setCurrentScreen] = useState<
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
    | 'boardGame'
    | 'boardGame2'
    | 'casualGame'
    | 'cardGame'
    | 'puzzleGame'
    | 'partyGame'
  >('home');
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
  const [activePeer, setActivePeer] = useState<ConversationPeer | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinModalInitialGame, setJoinModalInitialGame] = useState<SupportedGameType | undefined>(undefined);
  const [joinModalInitialTab, setJoinModalInitialTab] = useState<'solo' | 'quick' | 'join' | 'create'>('quick');
  const [soloModalGameId, setSoloModalGameId] = useState<string | null>(null);
  const [isAchievementsModalVisible, setAchievementsModalVisible] = useState(false);
  const [activeStoryTray, setActiveStoryTray] = useState<StoryTrayItem | null>(null);

  const handleJoinedRoom = (room: any) => {
    setCurrentRoomCode(room.code);
    if (['CONNECT_FOUR', 'REVERSI', 'GOMOKU', 'CHECKERS', 'CHESS'].includes(room.gameType)) {
      setCurrentBoardGameType(room.gameType as any);
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
      setCurrentBoardGame2Type(room.gameType as any);
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
      setCurrentCasualGameType(room.gameType as any);
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
      setCurrentCardGameType(room.gameType as any);
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
      setCurrentPuzzleGameType(room.gameType as any);
    } else {
      setCurrentPartyGameType(room.gameType as any);
    }

    if (room.code.startsWith('SOLO_') || room.status === 'PLAYING') {
      if (room.gameType === 'TICTACTOE') {
        setCurrentScreen('ticTacToe');
      } else if (room.gameType === 'LUDO') {
        setCurrentScreen('ludo');
      } else if (['CONNECT_FOUR', 'REVERSI', 'GOMOKU', 'CHECKERS', 'CHESS'].includes(room.gameType)) {
        setCurrentScreen('boardGame');
      } else if (
        ['CARROM', 'SNAKES_AND_LADDERS', 'BATTLESHIP', 'DOMINOES', 'BACKGAMMON', 'MANCALA', 'CHINESE_CHECKERS'].includes(
          room.gameType
        )
      ) {
        setCurrentScreen('boardGame2');
      } else if (['POOL_8_BALL', 'MINI_GOLF', 'AIR_HOCKEY', 'DARTS', 'BOWLING', 'TABLE_TENNIS'].includes(room.gameType)) {
        setCurrentScreen('casualGame');
      } else if (
        ['UNO_STYLE', 'HEARTS', 'SPADES', 'RUMMY', 'GIN_RUMMY', 'CRAZY_EIGHTS', 'GO_FISH', 'WAR', 'DURAK', 'PRESIDENT', 'BLACKJACK', 'POKER'].includes(
          room.gameType
        )
      ) {
        setCurrentScreen('cardGame');
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
        setCurrentScreen('puzzleGame');
      } else {
        setCurrentScreen('partyGame');
      }
    } else {
      setCurrentScreen('roomLobby');
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return (
        <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />
      );
    }
    return (
      <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />
    );
  }

  // Active Tic-Tac-Toe Live Match Screen
  if (currentScreen === 'ticTacToe' && currentRoomCode) {
    return (
      <TicTacToeScreen
        roomCode={currentRoomCode}
        onLeave={() => {
          setCurrentScreen('roomLobby');
        }}
      />
    );
  }

  // Active Ludo World Live Match Screen
  if (currentScreen === 'ludo' && currentRoomCode) {
    return (
      <LudoScreen
        roomCode={currentRoomCode}
        onLeave={() => {
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
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
          setCurrentScreen('roomLobby');
        }}
      />
    );
  }

  // Active Game Room Lobby Screen
  if (currentScreen === 'roomLobby' && currentRoomCode) {
    return (
      <RoomLobbyScreen
        roomCode={currentRoomCode}
        onBack={() => {
          setCurrentRoomCode(null);
          setCurrentScreen('home');
        }}
        onGameStart={(room) => {
          if (room.gameType === 'TICTACTOE') {
            setCurrentScreen('ticTacToe');
          } else if (room.gameType === 'LUDO') {
            setCurrentScreen('ludo');
          } else if (
            ['CONNECT_FOUR', 'REVERSI', 'GOMOKU', 'CHECKERS', 'CHESS'].includes(room.gameType)
          ) {
            setCurrentBoardGameType(room.gameType as any);
            setCurrentScreen('boardGame');
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
            setCurrentBoardGame2Type(room.gameType as any);
            setCurrentScreen('boardGame2');
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
            setCurrentCasualGameType(room.gameType as any);
            setCurrentScreen('casualGame');
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
            setCurrentCardGameType(room.gameType as any);
            setCurrentScreen('cardGame');
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
            setCurrentPuzzleGameType(room.gameType as any);
            setCurrentScreen('puzzleGame');
          } else if (
            [
              'WOULD_YOU_RATHER',
              'TRUTH_OR_DARE',
              'CHARADES',
              'GUESS_PICTURE',
              'GUESS_WORD',
              'GUESS_SONG',
              'WHO_AM_I',
              'IMPOSTER',
              'MAFIA',
              'DRAW_AND_GUESS',
              'PICTIONARY',
              'NEVER_HAVE_I_EVER',
              'THIS_OR_THAT',
              'TWO_TRUTHS_AND_A_LIE',
            ].includes(room.gameType)
          ) {
            setCurrentPartyGameType(room.gameType as any);
            setCurrentScreen('partyGame');
          }
        }}
        onInviteFriends={() => {
          setCurrentScreen('friends');
        }}
      />
    );
  }

  // Active 1-on-1 Conversation Screen
  if (currentScreen === 'conversation' && activePeer) {
    return (
      <ConversationScreen
        peerId={activePeer.id}
        peerName={activePeer.name}
        peerUsername={activePeer.username}
        peerAvatarUrl={activePeer.avatarUrl}
        initialConversationId={activePeer.conversationId}
        onBack={() => setCurrentScreen('chatList')}
        onNavigateToProfile={(targetId) => {
          setProfileUserId(targetId);
          setCurrentScreen('profile');
        }}
        onJoinGameRoom={(roomCode) => {
          setCurrentRoomCode(roomCode);
          setCurrentScreen('roomLobby');
        }}
      />
    );
  }

  // Peer's profile (viewing someone else)
  if (currentScreen === 'profile' && profileUserId) {
    return (
      <ProfileScreen
        userId={profileUserId}
        onBack={() => {
          setProfileUserId(undefined);
          setCurrentScreen('friends');
        }}
        onNavigateToChat={(targetId, username) => {
          setActivePeer({
            id: targetId,
            name: username,
            username,
            avatarUrl: null,
          });
          setCurrentScreen('conversation');
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
    if (currentScreen === 'discovery') return 'play';
    return 'home';
  };

  const handleTabSelect = (tab: NavTab) => {
    if (tab === 'play') {
      setCurrentScreen('discovery');
      return;
    }
    if (tab === 'home') {
      setProfileUserId(undefined);
      setCurrentScreen('home');
    } else if (tab === 'friends') {
      setProfileUserId(undefined);
      setCurrentScreen('friends');
    } else if (tab === 'chatList') {
      setProfileUserId(undefined);
      setCurrentScreen('chatList');
    } else if (tab === 'profile') {
      setProfileUserId(undefined);
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
      {/* Screen Content */}
      <View style={styles.screenWrapper}>
        {currentScreen === 'home' && (
          <ThemeShowcaseScreen
            onPressProfile={() => {
              setProfileUserId(undefined);
              setCurrentScreen('profile');
            }}
            onPressFriends={() => setCurrentScreen('friends')}
            onPressChat={() => setCurrentScreen('chatList')}
            onPressThemes={() => setCurrentScreen('themes')}
            onPressPlay={(gameType) => {
              if (gameType) {
                setSoloModalGameId(gameType);
              } else {
                setJoinModalInitialGame(undefined);
                setJoinModalInitialTab('quick');
                setIsJoinModalVisible(true);
              }
            }}
            onPressDiscovery={() => setCurrentScreen('discovery')}
            onPressLeaderboards={() => setCurrentScreen('leaderboards')}
            onPressStoryTray={(tray) => setActiveStoryTray(tray)}
          />
        )}

        {currentScreen === 'themes' && (
          <ThemesScreen
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'discovery' && (
          <GameDiscoveryScreen
            onSelectGame={(gameId) => {
              setSoloModalGameId(gameId);
            }}
            onPressLeaderboards={() => setCurrentScreen('leaderboards')}
            onPressAchievements={() => setAchievementsModalVisible(true)}
          />
        )}

        {currentScreen === 'leaderboards' && (
          <LeaderboardScreen
            onBack={() => setCurrentScreen('home')}
            onPressAchievements={() => setAchievementsModalVisible(true)}
            onRequestRematch={(_gameType) => {
              setIsJoinModalVisible(true);
            }}
          />
        )}

        {currentScreen === 'friends' && (
          <FriendsScreen
            onBack={() => setCurrentScreen('home')}
            onViewProfile={(targetId) => {
              setProfileUserId(targetId);
              setCurrentScreen('profile');
            }}
            onNavigateToChat={(targetId, username) => {
              setActivePeer({
                id: targetId,
                name: username,
                username,
                avatarUrl: null,
              });
              setCurrentScreen('conversation');
            }}
            onChallenge={() => setIsJoinModalVisible(true)}
          />
        )}

        {currentScreen === 'chatList' && (
          <ChatListScreen
            onBack={() => setCurrentScreen('home')}
            onNavigateToFriends={() => setCurrentScreen('friends')}
            onSelectConversation={(peerId, peerName, peerUsername, peerAvatarUrl, convId) => {
              setActivePeer({
                id: peerId,
                name: peerName,
                username: peerUsername,
                avatarUrl: peerAvatarUrl,
                conversationId: convId,
              });
              setCurrentScreen('conversation');
            }}
          />
        )}

        {currentScreen === 'profile' && !profileUserId && (
          <ProfileScreen
            onBack={() => setCurrentScreen('home')}
            onNavigateToChat={(targetId, username) => {
              setActivePeer({
                id: targetId,
                name: username,
                username,
                avatarUrl: null,
              });
              setCurrentScreen('conversation');
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
                participants: [],
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
      />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
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

