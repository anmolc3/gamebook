import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  InfoIcon,
  CloseIcon,
  TrophyIcon,
  UsersIcon,
  ClockIcon,
  CheckIcon,
  StarIcon,
  ShieldIcon,
  TargetIcon,
} from '../../icons';
import { getGameRules, GameRuleGuide } from '../../constants/gameRules';

export interface GameRulesModalProps {
  visible: boolean;
  gameType: string;
  gameTitle?: string;
  category?: string;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  visible,
  gameType,
  gameTitle,
  category,
  onClose,
}) => {
  const { theme } = useTheme();

  const rules: GameRuleGuide = getGameRules(gameType, gameTitle, category);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeContainer}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              theme.shadows.card,
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.infoBadge,
                    { backgroundColor: theme.colors.cardTintMint },
                  ]}
                >
                  <InfoIcon size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.headerTitleBox}>
                  <Text
                    style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {rules.title}
                  </Text>
                  <View style={styles.categoryRow}>
                    <View
                      style={[
                        styles.categoryPill,
                        { backgroundColor: theme.colors.surfaceElevated },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {rules.category}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rulesLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Rules & Steps
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.colors.surfaceElevated },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close Rules Modal"
              >
                <CloseIcon size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Quick Metadata Stats Row */}
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <UsersIcon size={14} color={theme.colors.primary} />
                  <Text
                    style={[styles.statPillText, { color: theme.colors.textPrimary }]}
                  >
                    {rules.playerCount}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <ClockIcon size={14} color="#FFB020" />
                  <Text
                    style={[styles.statPillText, { color: theme.colors.textPrimary }]}
                  >
                    {rules.turnTime}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <TargetIcon size={14} color="#00D2D3" />
                  <Text
                    style={[styles.statPillText, { color: theme.colors.textPrimary }]}
                  >
                    {rules.duration}
                  </Text>
                </View>
              </View>

              {/* Objective Banner */}
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.tagline, { color: theme.colors.primary }]}>
                  {rules.tagline}
                </Text>
                <Text
                  style={[styles.overviewText, { color: theme.colors.textSecondary }]}
                >
                  {rules.overview}
                </Text>
              </View>

              {/* Step-by-Step Instructions */}
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionBullet, { backgroundColor: theme.colors.primary }]} />
                <Text
                  style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}
                >
                  How to Play (Step-by-Step)
                </Text>
              </View>

              <View style={styles.stepsContainer}>
                {rules.steps.map((st) => (
                  <View
                    key={st.step}
                    style={[
                      styles.stepCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={styles.stepBadgeText}>{st.step}</Text>
                      </View>
                      <Text
                        style={[
                          styles.stepTitle,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {st.title}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {st.description}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Win Condition Callout Card */}
              <View
                style={[
                  styles.winConditionCard,
                  {
                    backgroundColor: 'rgba(62, 213, 152, 0.08)',
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <View style={styles.winConditionHeader}>
                  <TrophyIcon size={20} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.winConditionTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Winning Condition
                  </Text>
                </View>
                <Text
                  style={[
                    styles.winConditionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {rules.winCondition}
                </Text>
              </View>

              {/* Core Game Rules */}
              <View style={styles.sectionHeaderRow}>
                <ShieldIcon size={16} color={theme.colors.primary} />
                <Text
                  style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}
                >
                  Key Rules & Mechanics
                </Text>
              </View>

              <View
                style={[
                  styles.rulesBox,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {rules.keyRules.map((kr, idx) => (
                  <View key={idx} style={styles.ruleItem}>
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: theme.colors.cardTintMint },
                      ]}
                    >
                      <CheckIcon size={12} color={theme.colors.primary} strokeWidth={3} />
                    </View>
                    <Text
                      style={[
                        styles.ruleItemText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {kr}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Pro Tips Section */}
              {rules.proTips && rules.proTips.length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <StarIcon size={16} color="#FFD700" />
                    <Text
                      style={[
                        styles.sectionHeading,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      Pro Tips & Strategy
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.tipsBox,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    {rules.proTips.map((tip, idx) => (
                      <View key={idx} style={styles.tipItem}>
                        <View style={styles.tipStarDot}>
                          <StarIcon size={12} color="#FFD700" />
                        </View>
                        <Text
                          style={[
                            styles.tipItemText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Bottom Sticky Action Button */}
            <View
              style={[
                styles.bottomBar,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.primary },
                  theme.shadows.soft,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.textOnPrimary },
                  ]}
                >
                  Got it, Let's Play!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 28, 0.82)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  infoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rulesLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  overviewText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionBullet: {
    width: 6,
    height: 16,
    borderRadius: 3,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepsContainer: {
    gap: 10,
    marginBottom: 18,
  },
  stepCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepBadgeText: {
    color: '#1F2E35',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 32,
  },
  winConditionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  winConditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  winConditionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  winConditionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  rulesBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  ruleItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  tipsBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipStarDot: {
    marginTop: 2,
  },
  tipItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  actionButton: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
