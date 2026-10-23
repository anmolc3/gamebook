import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameLogo } from '../../components/atoms/GameLogo';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomService, RoomDetails, RoomPlayer } from '../../services/room.service';
import { InvitePlayersModal } from '../../components/organisms/InvitePlayersModal';

export interface RoomLobbyScreenProps {
  roomCode: string;
  initialRoom?: RoomDetails | null;
  onBack: () => void;
  onGameStart?: (room: RoomDetails) => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  onInviteFriends?: (roomCode: string) => void;
}

export const RoomLobbyScreen: React.FC<RoomLobbyScreenProps> = ({
  roomCode,
  initialRoom,
  onBack,
  onGameStart,
  onNavigateToChat,
  onInviteFriends,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();

  const [room, setRoom] = useState<RoomDetails | null>(initialRoom || null);
  const [isLoading, setIsLoading] = useState(!initialRoom);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<{
    username: string;
    graceSeconds: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // In-lobby alerts for player leaving and match completion
  const [leaveAlert, setLeaveAlert] = useState<{
    id: string;
    message: string;
    isHostChange?: boolean;
    isLobbyClosing?: boolean;
  } | null>(null);

  const [matchResultAlert, setMatchResultAlert] = useState<{
    id: string;
    title: string;
    message: string;
    winnerName?: string | null;
    winnerAvatarUrl?: string | null;
    reason?: string;
  } | null>(null);

  const seenLeaveEventsRef = useRef<Set<string>>(new Set());
  const seenMatchResultsRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(!!initialRoom);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const processMatchResult = useCallback((res: any) => {
    if (!res) return;
    const resultKey = `${res.finishedAt || Date.now()}_${res.winnerId || res.reason || 'CONCLUDED'}`;
    if (seenMatchResultsRef.current.has(resultKey)) return;
    seenMatchResultsRef.current.add(resultKey);

    if (res.reason === 'ABANDONED') {
      const leaverName = res.abandonedByUsername ? `@${res.abandonedByUsername}` : 'A player';
      setMatchResultAlert({
        id: resultKey,
        title: 'Match Ended',
        message: `${leaverName} abandoned the match.`,
        reason: 'ABANDONED',
      });
    } else if (res.winnerName) {
      setMatchResultAlert({
        id: resultKey,
        title: 'Match Finished!',
        message: `${res.winnerName} won the match!`,
        winnerName: res.winnerName,
        winnerAvatarUrl: res.winnerAvatarUrl || null,
        reason: 'WIN',
      });
    } else {
      setMatchResultAlert({
        id: resultKey,
        title: 'Match Finished',
        message: 'The match has ended.',
        reason: res.reason || 'CONCLUDED',
      });
    }
  }, []);

  const loadRoom = useCallback(async (silent = false) => {
    try {
      if (!silent && !hasLoadedRef.current) setIsLoading(true);
      const data = await RoomService.getRoom(roomCode);
      setRoom(data);
      hasLoadedRef.current = true;
      if (data?.lastMatchResult) {
        processMatchResult(data.lastMatchResult);
      }
    } catch (err: any) {
      Alert.alert('Room Error', err.message || 'Could not load room');
      onBack();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [roomCode, onBack, processMatchResult]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRoom(true);
  }, [loadRoom]);

  useEffect(() => {
    loadRoom();

    MobileSocketService.connect();
    MobileSocketService.joinRoom(roomCode);

    // Synchronize full room state
    const unsubState = MobileSocketService.onRoomState((updatedRoom: RoomDetails) => {
      setRoom(updatedRoom);
      if (updatedRoom?.lastMatchResult) {
        processMatchResult(updatedRoom.lastMatchResult);
      }
    });

    // Player joined event
    const unsubJoined = MobileSocketService.onPlayerJoined((data) => {
      showToast(`${data.player?.user?.displayName || 'A player'} joined the lobby!`);
      if (data.room) setRoom(data.room);
    });

    // Player left event with authoritative presence & deduplication
    const unsubLeft = MobileSocketService.onPlayerLeft((data) => {
      if (!data) return;
      const leaveKey = `${data.userId || 'unknown'}_${data.timestamp || Date.now()}`;
      if (seenLeaveEventsRef.current.has(leaveKey)) return;
      seenLeaveEventsRef.current.add(leaveKey);

      if (data.room) {
        setRoom(data.room);
      }

      const leavingName = data.displayName || (data.username ? `@${data.username}` : 'A player');

      if (data.isLobbyClosing) {
        setLeaveAlert({
          id: leaveKey,
          message: 'The lobby is closing because no other players remain.',
          isLobbyClosing: true,
        });
      } else if (data.isHost && data.newHostName) {
        setLeaveAlert({
          id: leaveKey,
          message: `${leavingName} (Host) left the lobby. ${data.newHostName} is now the host.`,
          isHostChange: true,
        });
      } else {
        setLeaveAlert({
          id: leaveKey,
          message: `${leavingName} left the lobby.`,
        });
      }

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setLeaveAlert((current) => (current?.id === leaveKey ? null : current));
      }, 6000);
    });

    // Match finished / Game Over event
    const unsubGameOver = MobileSocketService.onGameOver((data) => {
      if (data && data.roomCode === roomCode) {
        processMatchResult(data);
      }
    });

    // Game launch event
    const unsubStart = MobileSocketService.onGameStart((data) => {
      showToast('Match is starting!');
      if (onGameStart && room) {
        onGameStart({ ...room, status: 'PLAYING' });
      }
    });

    // Disconnect grace window alerts
    const unsubDisconnect = MobileSocketService.onPlayerDisconnected((data) => {
      setDisconnectedPlayer({
        username: data.username,
        graceSeconds: data.graceSeconds,
      });
    });

    const unsubReconnect = MobileSocketService.onPlayerReconnected((data) => {
      setDisconnectedPlayer(null);
      showToast(`@${data.username} reconnected!`);
    });

    const unsubAbandoned = MobileSocketService.onPlayerAbandoned((data) => {
      setDisconnectedPlayer(null);
      showToast(`@${data.username} abandoned the match.`);
    });

    const unsubDisband = MobileSocketService.onRoomDisbanded(() => {
      Alert.alert('Room Disbanded', 'The room was closed because the host left.', [
        { text: 'OK', onPress: onBack },
      ]);
    });

    return () => {
      MobileSocketService.leaveRoom(roomCode);
      unsubState();
      unsubJoined();
      unsubLeft();
      unsubGameOver();
      unsubStart();
      unsubDisconnect();
      unsubReconnect();
      unsubAbandoned();
      unsubDisband();
    };
  }, [roomCode, loadRoom, onBack, onGameStart, room, processMatchResult]);

  const handleToggleReady = async () => {
    if (!room || isTogglingReady) return;
    try {
      setIsTogglingReady(true);
      const myPlayer = room.players.find((p: RoomPlayer) => p.userId === authUser?.id);
      const nextReady = !myPlayer?.isReady;
      const updated = await RoomService.toggleReady(room.code, nextReady);
      setRoom(updated);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not toggle ready status');
    } finally {
      setIsTogglingReady(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || isStartingGame) return;
    try {
      setIsStartingGame(true);
      const updated = await RoomService.startGame(room.code);
      setRoom(updated);
      if (onGameStart) {
        onGameStart(updated);
      }
    } catch (err: any) {
      Alert.alert('Cannot Start Match', err.message || 'All players must be ready');
    } finally {
      setIsStartingGame(false);
    }
  };

  const isLeaveAlertShowingRef = useRef<boolean>(false);

  const handleLeaveRoom = () => {
    if (isLeaveAlertShowingRef.current) return;
    isLeaveAlertShowingRef.current = true;
    Alert.alert(
      'Leave Lobby',
      'Are you sure you want to leave this game lobby?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            isLeaveAlertShowingRef.current = false;
          },
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            isLeaveAlertShowingRef.current = false;
            try {
              await RoomService.leaveRoom(roomCode);
            } catch (err) {
              console.warn('Leave room error:', err);
            }
            onBack();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          isLeaveAlertShowingRef.current = false;
        },
      }
    );
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isRulesModalVisible) {
        setIsRulesModalVisible(false);
        return true;
      }
      if (isInviteModalVisible) {
        setIsInviteModalVisible(false);
        return true;
      }
      handleLeaveRoom();
      return true;
    });
    return () => sub.remove();
  }, [isRulesModalVisible, isInviteModalVisible, roomCode, onBack]);

  const getGameLabel = (gameType?: string) => {
    switch (gameType) {
      case 'TICTACTOE': return 'Tic-Tac-Toe';
      case 'LUDO': return 'Ludo Multiplayer';
      case 'CHESS': return 'Chess Master';
      case 'CHECKERS': return 'Checkers Grand';
      case 'CONNECT_FOUR': return 'Connect Four';
      case 'REVERSI': return 'Reversi / Othello';
      case 'GOMOKU': return 'Gomoku Duel';
      case 'CARDS': return 'Card Battle';
      default: return gameType?.replace(/_/g, ' ') || 'Game';
    }
  };

  const isHost = room?.hostId === authUser?.id;
  const myPlayer = room?.players.find((p: RoomPlayer) => p.userId === authUser?.id);
  const isReady = myPlayer?.isReady || false;
  const isTicTacToe = room?.gameType === 'TICTACTOE';
  const allReady =
    (room?.players.length || 0) >= 2 &&
    room?.players.every((p: RoomPlayer) => p.isReady);

  const maxSlots = room?.maxPlayers || 2;
  const slots: (RoomPlayer | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const playerInSlot = room?.players.find((p: RoomPlayer) => p.slotIndex === i) || null;
    slots.push(playerInSlot);
  }

  if (!room && isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={onBack}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Match Lobby
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.primary }]}>
              Room #{roomCode}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Connecting to room #{roomCode}...
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 16 }}>
            {[1, 2, 3, 4].map((slot) => (
              <View
                key={slot}
                style={{
                  width: '48%',
                  height: 140,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderStyle: 'dashed',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon name="users" size={32} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 8 }}>
                  Slot {slot}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Lobby Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleLeaveRoom}
          style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Leave Lobby"
        >
          <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <GameLogo
            gameType={room?.gameType}
            size={38}
            borderRadius={10}
            fallbackIcon="gamepad"
          />
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Match Lobby
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.primary }]}>
              {getGameLabel(room?.gameType)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setIsRulesModalVisible(true)}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.cardTintMint }]}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <Icon name="info" size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsInviteModalVisible(true);
              onInviteFriends?.(roomCode);
            }}
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            activeOpacity={0.7}
            accessibilityLabel="Invite Friends"
          >
            <Icon name="users" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Toast Alert */}
        {toastMessage && (
          <View
            style={[
              styles.toast,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.primary },
            ]}
          >
            <Icon name="check" size={16} color={theme.colors.primary} />
            <Text style={[styles.toastText, { color: theme.colors.textPrimary }]}>
              {toastMessage}
            </Text>
          </View>
        )}

        {/* Reconnect Grace Period Warning */}
        {disconnectedPlayer && (
          <View
            style={[
              styles.disconnectBanner,
              { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning },
            ]}
          >
            <Icon name="bell" size={20} color={theme.colors.warning} />
            <View style={styles.disconnectBannerCol}>
              <Text style={[styles.disconnectTitle, { color: theme.colors.warning }]}>
                Player Connection Dropped
              </Text>
              <Text style={[styles.disconnectSubtitle, { color: theme.colors.textPrimary }]}>
                @{disconnectedPlayer.username} disconnected. 30s grace window active...
              </Text>
            </View>
          </View>
        )}

        {/* In-Lobby Match Result Alert Banner */}
        {matchResultAlert && (
          <View
            style={[
              styles.alertBanner,
              {
                backgroundColor:
                  matchResultAlert.reason === 'ABANDONED'
                    ? theme.colors.warning + '18'
                    : theme.colors.cardTintMint || theme.colors.surfaceElevated,
                borderColor:
                  matchResultAlert.reason === 'ABANDONED'
                    ? theme.colors.warning
                    : theme.colors.primary,
              },
            ]}
          >
            <View style={styles.alertBannerLeft}>
              {matchResultAlert.winnerAvatarUrl || matchResultAlert.winnerName ? (
                <Avatar
                  displayName={matchResultAlert.winnerName || 'Winner'}
                  avatarUrl={matchResultAlert.winnerAvatarUrl}
                  size="sm"
                  fallbackToOtter={true}
                />
              ) : (
                <View
                  style={[
                    styles.alertIconCircle,
                    {
                      backgroundColor:
                        matchResultAlert.reason === 'ABANDONED'
                          ? theme.colors.warning + '25'
                          : theme.colors.primary + '25',
                    },
                  ]}
                >
                  <Icon
                    name={matchResultAlert.reason === 'ABANDONED' ? 'bell' : 'trophy'}
                    size={16}
                    color={
                      matchResultAlert.reason === 'ABANDONED'
                        ? theme.colors.warning
                        : theme.colors.primary
                    }
                  />
                </View>
              )}
              <View style={styles.alertBannerTextCol}>
                <Text
                  style={[
                    styles.alertBannerTitle,
                    {
                      color:
                        matchResultAlert.reason === 'ABANDONED'
                          ? theme.colors.warning
                          : theme.colors.primary,
                    },
                  ]}
                >
                  {matchResultAlert.title}
                </Text>
                <Text
                  style={[styles.alertBannerSubtitle, { color: theme.colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {matchResultAlert.message}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setMatchResultAlert(null)}
              style={styles.alertDismissBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Dismiss match result alert"
            >
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* In-Lobby Player Leave Alert Banner */}
        {leaveAlert && (
          <View
            style={[
              styles.alertBanner,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: leaveAlert.isHostChange
                  ? '#F59E0B'
                  : leaveAlert.isLobbyClosing
                  ? theme.colors.error
                  : theme.colors.border,
              },
            ]}
          >
            <View style={styles.alertBannerLeft}>
              <View
                style={[
                  styles.alertIconCircle,
                  {
                    backgroundColor: leaveAlert.isHostChange
                      ? '#F59E0B20'
                      : leaveAlert.isLobbyClosing
                      ? theme.colors.error + '20'
                      : theme.colors.surface,
                  },
                ]}
              >
                <Icon
                  name={leaveAlert.isHostChange ? 'crown' : 'userPlus'}
                  size={16}
                  color={
                    leaveAlert.isHostChange
                      ? '#F59E0B'
                      : leaveAlert.isLobbyClosing
                      ? theme.colors.error
                      : theme.colors.textMuted
                  }
                />
              </View>
              <View style={styles.alertBannerTextCol}>
                <Text
                  style={[
                    styles.alertBannerTitle,
                    {
                      color: leaveAlert.isHostChange
                        ? '#F59E0B'
                        : leaveAlert.isLobbyClosing
                        ? theme.colors.error
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {leaveAlert.isHostChange
                    ? 'Host Transferred'
                    : leaveAlert.isLobbyClosing
                    ? 'Lobby Closing'
                    : 'Player Left'}
                </Text>
                <Text
                  style={[styles.alertBannerSubtitle, { color: theme.colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {leaveAlert.message}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setLeaveAlert(null)}
              style={styles.alertDismissBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Dismiss leave alert"
            >
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Single Player Waiting Banner */}
        {room && room.status === 'WAITING' && room.players.length === 1 && (
          <View
            style={[
              styles.waitingNoticeCard,
              {
                backgroundColor: theme.colors.cardTintMint || theme.colors.surfaceElevated,
                borderColor: theme.colors.primary + '35',
              },
            ]}
          >
            <View style={styles.waitingNoticeLeft}>
              <Icon name="users" size={18} color={theme.colors.primary} />
              <View style={styles.waitingNoticeCol}>
                <Text style={[styles.waitingNoticeTitle, { color: theme.colors.textPrimary }]}>
                  Waiting for more players…
                </Text>
                <Text style={[styles.waitingNoticeSub, { color: theme.colors.textSecondary }]}>
                  Need at least 2 players to start. Invite a friend or share room code #{roomCode}.
                </Text>
              </View>
            </View>
            <View style={[styles.seatCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.seatCountText, { color: theme.colors.primary }]}>
                1/{room.maxPlayers}
              </Text>
            </View>
          </View>
        )}

        {/* 6-Character Room Code Card */}
        <View
          style={[
            styles.codeCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.codeLabel, { color: theme.colors.textSecondary }]}>
              ROOM CODE
            </Text>
            <GameLogo gameType={room?.gameType} size={36} borderRadius={8} />
          </View>
          <View style={styles.codeRow}>
            <Text style={[styles.codeText, { color: theme.colors.primary }]}>
              {roomCode}
            </Text>
            <TouchableOpacity
              onPress={() => showToast('Room code copied to clipboard!')}
              style={[styles.copyBtn, { backgroundColor: theme.colors.primary + '20' }]}
              activeOpacity={0.7}
            >
              <Icon name="check" size={16} color={theme.colors.primary} />
              <Text style={[styles.copyBtnText, { color: theme.colors.primary }]}>
                Copy
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.codeHint, { color: theme.colors.textMuted }]}>
            Share this 6-character code with your friends to invite them to this lobby.
          </Text>
        </View>

        {/* Player Slots Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Player Slots ({room?.players.length || 0}/{maxSlots})
          </Text>
          <View style={[styles.privacyBadge, { backgroundColor: theme.colors.surface }]}>
            <Icon
              name={room?.isPrivate ? 'lock' : 'users'}
              size={12}
              color={theme.colors.textMuted}
            />
            <Text style={[styles.privacyText, { color: theme.colors.textMuted }]}>
              {room?.isPrivate ? 'Private' : 'Public'}
            </Text>
          </View>
        </View>

        <View style={styles.slotsGrid}>
            {slots.map((player, idx) => {
              if (player) {
                const isPlayerHost = player.userId === room?.hostId;
                const isSelf = player.userId === authUser?.id;

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.slotCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: player.isReady ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.slotLeft}>
                      <Avatar
                        displayName={player.user.displayName}
                        avatarUrl={player.user.avatarUrl}
                        size="md"
                        status={player.user.isOnline ? 'online' : 'offline'}
                        fallbackToOtter={true}
                      />
                      <View style={styles.slotMeta}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[styles.playerName, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {player.user.displayName}
                          </Text>
                          {isSelf && (
                            <View
                              style={[
                                styles.selfBadge,
                                { backgroundColor: theme.colors.primary + '20' },
                              ]}
                            >
                              <Text style={[styles.selfBadgeText, { color: theme.colors.primary }]}>
                                YOU
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.playerUsername, { color: theme.colors.textMuted }]}>
                          @{player.user.username}
                        </Text>
                        {isPlayerHost && (
                          <View style={styles.hostRow}>
                            <Icon name="trophy" size={12} color="#F59E0B" />
                            <Text style={styles.hostLabel}>Room Host</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Ready Status Badge */}
                    <View style={styles.slotRight}>
                      <View
                        style={[
                          styles.readyBadge,
                          {
                            backgroundColor: player.isReady
                              ? theme.colors.success + '20'
                              : theme.colors.surface,
                            borderColor: player.isReady
                              ? theme.colors.success
                              : theme.colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.readyDot,
                            {
                              backgroundColor: player.isReady
                                ? theme.colors.success
                                : theme.colors.textMuted,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.readyText,
                            {
                              color: player.isReady
                                ? theme.colors.success
                                : theme.colors.textMuted,
                            },
                          ]}
                        >
                          {player.isReady ? 'READY' : 'NOT READY'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }

              // Empty Slot
              return (
                <View
                  key={`empty-${idx}`}
                  style={[
                    styles.slotCardEmpty,
                    {
                      backgroundColor: theme.colors.surfaceElevated + '50',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.emptyAvatar, { borderColor: theme.colors.border }]}>
                    <Icon name="userPlus" size={20} color={theme.colors.textMuted} />
                  </View>
                  <View style={styles.emptyMeta}>
                    <Text style={[styles.emptySlotTitle, { color: theme.colors.textSecondary }]}>
                      Slot {idx + 1}: Open
                    </Text>
                    <Text style={[styles.emptySlotSubtitle, { color: theme.colors.textMuted }]}>
                      Waiting for player to join...
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsInviteModalVisible(true);
                      onInviteFriends?.(roomCode);
                    }}
                    style={[styles.inviteBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                    accessibilityLabel={`Invite friend to slot ${idx + 1}`}
                  >
                    <Text style={[styles.inviteBtnText, { color: theme.colors.textOnPrimary }]}>
                      Invite
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>

      {/* Bottom Controls Action Bar */}
      <View
        style={[
          styles.footerBar,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {isHost ? (
          <TouchableOpacity
            onPress={handleStartGame}
            disabled={!allReady || isStartingGame}
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor: allReady ? theme.colors.primary : theme.colors.surface,
                opacity: allReady ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.8}
          >
            {isStartingGame ? (
              <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
            ) : (
              <>
                <Icon
                  name="play"
                  size={18}
                  color={allReady ? theme.colors.textOnPrimary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.primaryActionText,
                    {
                      color: allReady
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {allReady ? 'Start Match' : 'Waiting for Ready...'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleToggleReady}
            disabled={isTogglingReady}
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor: isReady
                  ? theme.colors.success
                  : theme.colors.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            {isTogglingReady ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon
                  name="check"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={[styles.primaryActionText, { color: '#FFFFFF' }]}>
                  {isReady ? "Ready! (Tap to Cancel)" : "I'm Ready!"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={room?.gameType || 'TICTACTOE'}
        gameTitle={room?.gameType?.replace(/_/g, ' ')}
        onClose={() => setIsRulesModalVisible(false)}
      />

      {/* Planned Players Invite Modal for All Games */}
      <InvitePlayersModal
        visible={isInviteModalVisible}
        roomCode={roomCode}
        gameType={room?.gameType || 'GAME'}
        gameName={getGameLabel(room?.gameType)}
        onClose={() => setIsInviteModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 60,
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
  headerTitleCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 0,
    gap: 8,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0,
    gap: 12,
  },
  disconnectBannerCol: {
    flex: 1,
  },
  disconnectTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  disconnectSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  codeCard: {
    padding: 22,
    borderRadius: 25,
    borderWidth: 0,
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  codeHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  slotsGrid: {
    gap: 12,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  slotMeta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  selfBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selfBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  playerUsername: {
    fontSize: 12,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  hostLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  slotRight: {
    marginLeft: 8,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0,
    gap: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slotCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
    gap: 12,
  },
  emptyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMeta: {
    flex: 1,
  },
  emptySlotTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySlotSubtitle: {
    fontSize: 12,
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBannerTextCol: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertBannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertDismissBtn: {
    padding: 6,
    marginLeft: 8,
  },
  waitingNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  waitingNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  waitingNoticeCol: {
    flex: 1,
  },
  waitingNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  waitingNoticeSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  seatCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seatCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

