import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import {
  AiDifficulty,
  getSoloGameInfo,
  BOT_AVATARS,
} from '../../constants/soloGames';
import { supportsSoloMode } from '../../constants/gameCapabilities';

export type GameModeSelection = 'SOLO' | 'FRIENDS' | 'ONLINE';

export interface SoloModeModalProps {
  visible: boolean;
  gameId: string;
  onClose: () => void;
  onStartSolo: (gameId: string, difficulty: AiDifficulty, botId?: string) => void;
  onPlayWithFriends: (gameId: string) => void;
  onPlayOnline: (gameId: string) => void;
}

const DIFFICULTY_BOT_MAP: Record<AiDifficulty, string> = {
  EASY: 'BOT_PIXEL',
  MEDIUM: 'BOT_NOVA',
  HARD: 'BOT_ACE',
  EXPERT: 'BOT_ATLAS',
};

export const SoloModeModal: React.FC<SoloModeModalProps> = ({
  visible,
  gameId,
  onClose,
  onStartSolo,
  onPlayWithFriends,
  onPlayOnline,
}) => {
  const { theme } = useTheme();

  const isSoloSupported = supportsSoloMode(gameId);
  const gameInfo = getSoloGameInfo(gameId);
  const gameName = gameInfo?.name || gameId;

  const [selectedMode, setSelectedMode] = useState<GameModeSelection>(
    isSoloSupported ? 'SOLO' : 'FRIENDS'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<AiDifficulty>(
    gameInfo?.defaultDifficulty || 'MEDIUM'
  );
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isSoloSupported) {
        setSelectedDifficulty(gameInfo?.defaultDifficulty || 'MEDIUM');
        setSelectedMode('SOLO');
      } else {
        setSelectedMode('FRIENDS');
      }
      setIsStarting(false);
    }
  }, [visible, gameId, isSoloSupported]);

  const botId = DIFFICULTY_BOT_MAP[selectedDifficulty] || 'BOT_NOVA';
  const botInfo = BOT_AVATARS[botId] || {
    name: 'Nova',
    title: 'Tactical Strategist',
    personality: 'Balanced and methodical AI opponent.',
  };

  const handleStartGame = () => {
    if (selectedMode === 'SOLO') {
      setIsStarting(true);
      onStartSolo(gameId, selectedDifficulty, botId);
    } else if (selectedMode === 'FRIENDS') {
      onClose();
      onPlayWithFriends(gameId);
    } else {
      onClose();
      onPlayOnline(gameId);
    }
  };

  const availableDifficulties: AiDifficulty[] = gameInfo?.difficulties || [
    'EASY',
    'MEDIUM',
    'HARD',
    'EXPERT',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Icon name="gamepad" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={[styles.dialogTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {gameName}
              </Text>
              <Text style={[styles.dialogSubtitle, { color: theme.colors.textSecondary }]}>
                Select Game Mode
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeIconBtn, { backgroundColor: theme.colors.surface }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Icon name="close" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Selector Tabs (Strict Capability: Only show Solo tab if supported) */}
          <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface }]}>
            {isSoloSupported && (
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  selectedMode === 'SOLO' && { backgroundColor: theme.colors.surfaceElevated },
                ]}
                onPress={() => setSelectedMode('SOLO')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    {
                      color:
                        selectedMode === 'SOLO'
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Solo
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.tabBtn,
                selectedMode === 'FRIENDS' && { backgroundColor: theme.colors.surfaceElevated },
              ]}
              onPress={() => setSelectedMode('FRIENDS')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      selectedMode === 'FRIENDS'
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                selectedMode === 'ONLINE' && { backgroundColor: theme.colors.surfaceElevated },
              ]}
              onPress={() => setSelectedMode('ONLINE')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      selectedMode === 'ONLINE'
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                Online
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Body */}
          {selectedMode === 'SOLO' && (
            <View style={styles.tabContent}>
              {/* Difficulty Selection (Requirement 9: [ Easy ] [ Medium ] [ Hard ] [ Expert ]) */}
              <View>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                  Difficulty
                </Text>
                <View style={styles.difficultyRow}>
                  {availableDifficulties.map((diff) => {
                    const isSelected = selectedDifficulty === diff;
                    return (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.difficultyPill,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedDifficulty(diff)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.difficultyPillText,
                            {
                              color: isSelected
                                ? theme.colors.textOnPrimary
                                : theme.colors.textSecondary,
                            },
                          ]}
                        >
                          {diff.charAt(0) + diff.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* AI Opponent Card (Requirement 10: AI Profile) */}
              {gameInfo?.type !== 'SOLO_PUZZLE' ? (
                <View
                  style={[
                    styles.aiProfileCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.aiAvatarWrapper}>
                    <View
                      style={[
                        styles.aiAvatarCircle,
                        { backgroundColor: theme.colors.primary + '20' },
                      ]}
                    >
                      <Icon name="bot" size={24} color={theme.colors.primary} />
                    </View>
                  </View>
                  <View style={styles.aiInfoCol}>
                    <View style={styles.aiNameRow}>
                      <Text style={[styles.aiName, { color: theme.colors.textPrimary }]}>
                        {botInfo.name}
                      </Text>
                      <View
                        style={[
                          styles.aiBadge,
                          { backgroundColor: theme.colors.primary + '18' },
                        ]}
                      >
                        <Text style={[styles.aiBadgeText, { color: theme.colors.primary }]}>
                          AI Opponent
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.aiTitle, { color: theme.colors.textSecondary }]}>
                      {botInfo.title}
                    </Text>
                    <Text
                      style={[styles.aiPersonality, { color: theme.colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {botInfo.personality}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.puzzleCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.puzzleIconCircle}>
                    <Icon name="target" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.puzzleInfoCol}>
                    <Text style={[styles.aiName, { color: theme.colors.textPrimary }]}>
                      Solo Challenge Mode
                    </Text>
                    <Text style={[styles.aiPersonality, { color: theme.colors.textSecondary }]}>
                      Play solo against the clock with server-authoritative scoring and personal bests.
                    </Text>
                  </View>
                </View>
              )}

              {/* Start Button */}
              <TouchableOpacity
                style={[
                  styles.actionSubmitBtn,
                  { backgroundColor: theme.colors.primary },
                  isStarting && { opacity: 0.7 },
                ]}
                onPress={handleStartGame}
                disabled={isStarting}
                activeOpacity={0.8}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                    <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                      Start Game
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {selectedMode === 'FRIENDS' && (
            <View style={styles.tabContent}>
              <View
                style={[
                  styles.puzzleCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.puzzleIconCircle}>
                  <Icon name="users" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.puzzleInfoCol}>
                  <Text style={[styles.aiName, { color: theme.colors.textPrimary }]}>
                    Private Room
                  </Text>
                  <Text style={[styles.aiPersonality, { color: theme.colors.textSecondary }]}>
                    Create a private room or enter a 6-character room code to duel with friends.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleStartGame}
                activeOpacity={0.8}
              >
                <Icon name="users" size={18} color={theme.colors.textOnPrimary} />
                <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                  Open Friends Lobby
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedMode === 'ONLINE' && (
            <View style={styles.tabContent}>
              <View
                style={[
                  styles.puzzleCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.puzzleIconCircle}>
                  <Icon name="target" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.puzzleInfoCol}>
                  <Text style={[styles.aiName, { color: theme.colors.textPrimary }]}>
                    Online Matchmaking
                  </Text>
                  <Text style={[styles.aiPersonality, { color: theme.colors.textSecondary }]}>
                    Instantly find and play against online players across the platform.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleStartGame}
                activeOpacity={0.8}
              >
                <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
                <Text style={[styles.actionSubmitText, { color: theme.colors.textOnPrimary }]}>
                  Find Match
                </Text>
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
    borderRadius: 24,
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
  headerTitleCol: {
    flex: 1,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dialogSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
  tabContent: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiProfileCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  aiAvatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInfoCol: {
    flex: 1,
    gap: 2,
  },
  aiNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiName: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiPersonality: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  puzzleCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  puzzleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puzzleInfoCol: {
    flex: 1,
    gap: 4,
  },
  actionSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  actionSubmitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
