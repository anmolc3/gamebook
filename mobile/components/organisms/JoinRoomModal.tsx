import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { RoomService, RoomDetails, SupportedGameType } from '../../services/room.service';
import { SoloService } from '../../services/solo.service';
import { AiDifficulty, BOT_AVATARS } from '../../constants/soloGames';

export interface JoinRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinedRoom: (room: RoomDetails) => void;
  initialGameType?: SupportedGameType;
  initialTab?: 'solo' | 'quick' | 'join' | 'create';
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  visible,
  onClose,
  onJoinedRoom,
  initialGameType,
  initialTab,
}) => {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'solo' | 'quick' | 'join' | 'create'>(
    initialTab || 'quick'
  );
  const [soloDifficulty, setSoloDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedGameType, setSelectedGameType] = useState<SupportedGameType>(
    initialGameType || 'TICTACTOE'
  );
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (initialGameType) setSelectedGameType(initialGameType);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [visible, initialGameType, initialTab]);

  const handleStartSolo = async () => {
    try {
      setIsLoading(true);
      const res = await SoloService.startSoloMatch(selectedGameType, soloDifficulty);
      const virtualRoom: RoomDetails = {
        id: res.matchId,
        code: res.roomCode,
        gameType: res.gameType as any,
        status: 'PLAYING',
        isPrivate: true,
        maxPlayers: 2,
        hostId: res.players[0]?.userId || 'HUMAN',
        host: null,
        players: res.players.map((p, idx) => ({
          id: p.userId,
          userId: p.userId,
          slotIndex: idx,
          isReady: true,
          score: 0,
          user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName || p.username,
            avatarUrl: null,
            isOnline: true,
          },
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onClose();
      onJoinedRoom(virtualRoom);
    } catch (err: any) {
      Alert.alert('Solo Match Failed', err.message || 'Could not start solo game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinViaCode = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character room code');
      return;
    }

    try {
      setIsLoading(true);
      const room = await RoomService.joinRoom(code);
      setRoomCodeInput('');
      onClose();
      onJoinedRoom(room);
    } catch (err: any) {
      Alert.alert('Join Failed', err.message || 'Could not join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      const maxPlayers = selectedGameType === 'LUDO' ? 4 : 2;
      const room = await RoomService.createRoom(selectedGameType, isPrivate, maxPlayers);
      onClose();
      onJoinedRoom(room);
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickMatch = async () => {
    try {
      setIsLoading(true);
      const res = await RoomService.matchmake(selectedGameType);
      onClose();
      onJoinedRoom(res.room);
    } catch (err: any) {
      Alert.alert('Matchmaking Failed', err.message || 'Could not find or create match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.colors.surfaceElevated },
          ]}
        >
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Icon name="gamepad" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dialogTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {selectedGameType ? selectedGameType.replace(/_/g, ' ') : 'Multiplayer Match'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeIconBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
            >
              <Icon name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('solo')}
              style={[
                styles.tabBtn,
                activeTab === 'solo' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'solo'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Solo AI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('quick')}
              style={[
                styles.tabBtn,
                activeTab === 'quick' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'quick'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Quick Play
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('join')}
              style={[
                styles.tabBtn,
                activeTab === 'join' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'join'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Join Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('create')}
              style={[
                styles.tabBtn,
                activeTab === 'create' && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'create'
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Create Room
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 0: Solo AI Opponent */}
          {activeTab === 'solo' && (
            <View style={styles.tabBody}>
              {/* Difficulty Selector */}
              <View>
                <Text style={[styles.gameSelectLabel, { color: theme.colors.textSecondary }]}>
                  AI Difficulty:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as AiDifficulty[]).map((diff) => {
                    const isSelected = soloDifficulty === diff;
                    return (
                      <TouchableOpacity
                        key={diff}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 0,
                          alignItems: 'center',
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                        }}
                        onPress={() => setSoloDifficulty(diff)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected
                              ? theme.colors.textOnPrimary
                              : theme.colors.textSecondary,
                          }}
                        >
                          {diff.charAt(0) + diff.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* AI Opponent Card */}
              <View
                style={{
                  flexDirection: 'row',
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 0,
                  backgroundColor: theme.colors.surface,
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.primary + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="bot" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>
                      {soloDifficulty === 'EASY' ? 'Pixel' : soloDifficulty === 'HARD' ? 'Ace' : soloDifficulty === 'EXPERT' ? 'Atlas' : 'Nova'}
                    </Text>
                    <View style={{ backgroundColor: theme.colors.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}>
                        AI Opponent
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    Server-authoritative game engine with fair-play move calculation.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleStartSolo}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Play Solo vs AI
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 1: Quick Play */}
          {activeTab === 'quick' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Matchmake instantly with online players in our public matchmaking queue.
              </Text>
              <TouchableOpacity
                onPress={handleQuickMatch}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Find Match Now
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 2: Join Code */}
          {activeTab === 'join' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Enter a 6-character room code shared by a friend to jump into their lobby.
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="e.g. TTT89X"
                placeholderTextColor={theme.colors.textMuted}
                value={roomCodeInput}
                onChangeText={(text) => setRoomCodeInput(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={handleJoinViaCode}
                disabled={roomCodeInput.trim().length < 4 || isLoading}
                style={[
                  styles.actionSubmitBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: roomCodeInput.trim().length < 4 || isLoading ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Join Lobby
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 3: Create Room */}
          {activeTab === 'create' && (
            <View style={styles.tabBody}>
              <Text style={[styles.tabDescription, { color: theme.colors.textSecondary }]}>
                Create a private room to play exclusively with friends, or public to allow anyone to join.
              </Text>
              <View style={styles.privacyToggleRow}>
                <TouchableOpacity
                  onPress={() => setIsPrivate(true)}
                  style={[
                    styles.privacyChoiceBtn,
                    {
                      backgroundColor: isPrivate
                        ? theme.colors.primary + '18'
                        : theme.colors.surface,
                      borderColor: isPrivate ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Icon
                    name="lock"
                    size={16}
                    color={isPrivate ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.privacyChoiceText,
                      { color: isPrivate ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    Private (Friends Only)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsPrivate(false)}
                  style={[
                    styles.privacyChoiceBtn,
                    {
                      backgroundColor: !isPrivate
                        ? theme.colors.primary + '18'
                        : theme.colors.surface,
                      borderColor: !isPrivate ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Icon
                    name="users"
                    size={16}
                    color={!isPrivate ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.privacyChoiceText,
                      { color: !isPrivate ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    Public (Open to All)
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreateRoom}
                disabled={isLoading}
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="gamepad" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Create & Enter Lobby
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 25,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gameSelectLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameSelectScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  gameOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  gameOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBody: {
    gap: 14,
  },
  tabDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  codeInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  privacyToggleRow: {
    gap: 8,
  },
  privacyChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  privacyChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  actionSubmitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
