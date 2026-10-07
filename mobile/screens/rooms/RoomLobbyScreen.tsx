import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { RoomService, RoomDetails, RoomPlayer } from '../../services/room.service';
import { MobileSocketService } from '../../services/socket.service';

export interface RoomLobbyScreenProps {
  roomCode: string;
  onBack: () => void;
  onGameStart?: (room: RoomDetails) => void;
  onNavigateToChat?: (userId: string, username: string) => void;
  onInviteFriends?: (roomCode: string) => void;
}

export const RoomLobbyScreen: React.FC<RoomLobbyScreenProps> = ({
  roomCode,
  onBack,
  onGameStart,
  onNavigateToChat,
  onInviteFriends,
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<{
    username: string;
    graceSeconds: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await RoomService.getRoom(roomCode);
      setRoom(data);
    } catch (err: any) {
      Alert.alert('Room Error', err.message || 'Could not load room');
      onBack();
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, onBack]);

  useEffect(() => {
    loadRoom();

    MobileSocketService.connect();
    MobileSocketService.joinRoom(roomCode);

    // Synchronize full room state
    const unsubState = MobileSocketService.onRoomState((updatedRoom: RoomDetails) => {
      setRoom(updatedRoom);
    });

    // Player joined event
    const unsubJoined = MobileSocketService.onPlayerJoined((data) => {
      showToast(`${data.player?.user?.displayName || 'A player'} joined the lobby!`);
      if (data.room) setRoom(data.room);
    });

    // Player left event
    const unsubLeft = MobileSocketService.onPlayerLeft((data) => {
      showToast('A player left the room.');
      if (data.room) setRoom(data.room);
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
      unsubStart();
      unsubDisconnect();
      unsubReconnect();
      unsubAbandoned();
      unsubDisband();
    };
  }, [roomCode, loadRoom, onBack, onGameStart, room]);

  const handleToggleReady = async () => {
    if (!room || isTogglingReady) return;
    try {
      setIsTogglingReady(true);
      const myPlayer = room.players.find((p) => p.userId === authUser?.id);
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

  const handleLeaveRoom = () => {
    Alert.alert('Leave Lobby', 'Are you sure you want to leave this game lobby?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await RoomService.leaveRoom(roomCode);
          } catch (err) {
            console.warn('Leave room error:', err);
          }
          onBack();
        },
      },
    ]);
  };

  const isHost = room?.hostId === authUser?.id;
  const myPlayer = room?.players.find((p) => p.userId === authUser?.id);
  const isReady = myPlayer?.isReady || false;
  const isTicTacToe = room?.gameType === 'TICTACTOE';
  const allReady =
    (room?.players.length || 0) >= 2 &&
    room?.players.every((p) => p.isReady);

  const maxSlots = room?.maxPlayers || 2;
  const slots: (RoomPlayer | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const playerInSlot = room?.players.find((p) => p.slotIndex === i) || null;
    slots.push(playerInSlot);
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

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Match Lobby
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.primary }]}>
            {isTicTacToe ? 'Tic-Tac-Toe' : 'Ludo Multiplayer'}
          </Text>
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

          {onInviteFriends && (
            <TouchableOpacity
              onPress={() => onInviteFriends(roomCode)}
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Invite Friends"
            >
              <Icon name="users" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* 6-Character Room Code Card */}
        <View
          style={[
            styles.codeCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.codeLabel, { color: theme.colors.textSecondary }]}>
            ROOM CODE
          </Text>
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

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
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
                  {onInviteFriends && (
                    <TouchableOpacity
                      onPress={() => onInviteFriends(roomCode)}
                      style={[styles.inviteBtn, { backgroundColor: theme.colors.primary }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inviteBtnText, { color: theme.colors.textOnPrimary }]}>
                        Invite
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
    borderStyle: 'dashed',
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
});
