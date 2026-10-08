import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  CloseIcon,
  TrophyIcon,
  FlameIcon,
  CrownIcon,
  TargetIcon,
  StarIcon,
  ClockIcon,
  CheckIcon,
} from '../../icons';
import { apiGet } from '../../services/api';

interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

interface AchievementsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadAchievements();
    }
  }, [visible]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ achievements: AchievementItem[] }>('/achievements/my');
      setAchievements(res.achievements || []);
    } catch {
      // Fallback display
      setAchievements([
        { id: '1', key: 'FIRST_WIN', title: 'First Victory', description: 'Win your first multiplayer match in any game.', iconName: 'TrophyIcon', isUnlocked: true, unlockedAt: new Date().toISOString() },
        { id: '2', key: 'STREAK_3', title: 'Hot Streak', description: 'Achieve a winning streak of 3 consecutive matches.', iconName: 'FlameIcon', isUnlocked: true, unlockedAt: new Date().toISOString() },
        { id: '3', key: 'STREAK_5', title: 'Unstoppable', description: 'Achieve a winning streak of 5 consecutive matches.', iconName: 'FlameIcon', isUnlocked: false },
        { id: '4', key: 'GAMES_10', title: 'Veteran Challenger', description: 'Complete 10 multiplayer matches.', iconName: 'TargetIcon', isUnlocked: true, unlockedAt: new Date().toISOString() },
        { id: '5', key: 'GAMES_50', title: 'Arena Legend', description: 'Complete 50 multiplayer matches.', iconName: 'CrownIcon', isUnlocked: false },
        { id: '6', key: 'BOARD_MASTER', title: 'Grandmaster Mind', description: 'Win 5 classic board game matches.', iconName: 'StarIcon', isUnlocked: false },
        { id: '7', key: 'CARD_SHARK', title: 'Card Shark', description: 'Win 5 card table matches.', iconName: 'StarIcon', isUnlocked: false },
        { id: '8', key: 'PUZZLE_GENIUS', title: 'Puzzle Genius', description: 'Win 5 puzzle, quiz, or word duel matches.', iconName: 'StarIcon', isUnlocked: false },
        { id: '9', key: 'PARTY_STAR', title: 'Life of the Party', description: 'Participate in 5 party and social games.', iconName: 'StarIcon', isUnlocked: false },
        { id: '10', key: 'SPEED_DEMON', title: 'Speed Demon', description: 'Win a reflex or fast competitive duel.', iconName: 'ClockIcon', isUnlocked: true, unlockedAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const progressPercent = Math.round((unlockedCount / Math.max(achievements.length, 1)) * 100);

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const color = isUnlocked ? '#FFD700' : 'rgba(255,255,255,0.3)';
    switch (iconName) {
      case 'FlameIcon':
        return <FlameIcon size={24} color={isUnlocked ? '#FF8A00' : color} />;
      case 'CrownIcon':
        return <CrownIcon size={24} color={color} />;
      case 'TargetIcon':
        return <TargetIcon size={24} color={color} />;
      case 'ClockIcon':
        return <ClockIcon size={24} color={color} />;
      default:
        return <TrophyIcon size={24} color={color} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Platform Achievements
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {unlockedCount} of {achievements.length} Badges Unlocked ({progressPercent}%)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <CloseIcon size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%`, backgroundColor: theme.colors.primary },
              ]}
            />
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {achievements.map((item) => (
                <View
                  key={item.id || item.key}
                  style={[
                    styles.achievementRow,
                    {
                      backgroundColor: item.isUnlocked
                        ? theme.colors.surfaceElevated
                        : 'rgba(0,0,0,0.08)',
                      borderColor: item.isUnlocked
                        ? theme.colors.primary + '55'
                        : theme.colors.border,
                      opacity: item.isUnlocked ? 1 : 0.65,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: item.isUnlocked
                          ? 'rgba(255, 215, 0, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                      },
                    ]}
                  >
                    {renderBadgeIcon(item.iconName, item.isUnlocked)}
                  </View>

                  <View style={styles.metaCol}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDesc,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                    {item.isUnlocked && item.unlockedAt && (
                      <Text style={[styles.unlockedDate, { color: theme.colors.primary }]}>
                        Unlocked on {new Date(item.unlockedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {item.isUnlocked && (
                    <View style={[styles.checkPill, { backgroundColor: theme.colors.primary }]}>
                      <CheckIcon size={12} color={theme.colors.textOnPrimary} strokeWidth={3} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 0,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  achievementDesc: {
    fontSize: 12,
  },
  unlockedDate: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
