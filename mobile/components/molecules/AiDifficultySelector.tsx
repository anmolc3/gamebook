import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';

export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AiDifficultyOption {
  key: AiDifficulty;
  label: string;
  badge: string;
  description: string;
  accentColor: string;
  iconName: string;
}

export const AI_DIFFICULTY_STORAGE_KEY = '@otter_ai_difficulty';

export const AI_DIFFICULTY_OPTIONS: AiDifficultyOption[] = [
  {
    key: 'EASY',
    label: 'Easy',
    badge: 'Beginner',
    description: 'AI makes simpler decisions and gives beginners a fair chance.',
    accentColor: '#10B981',
    iconName: 'smile',
  },
  {
    key: 'MEDIUM',
    label: 'Medium',
    badge: 'Balanced',
    description: 'AI balances smart moves with occasional mistakes.',
    accentColor: '#3B82F6',
    iconName: 'shield',
  },
  {
    key: 'HARD',
    label: 'Hard',
    badge: 'Competitive',
    description: 'AI makes stronger strategic decisions and plays more competitively.',
    accentColor: '#F97316',
    iconName: 'zap',
  },
];

/**
 * Loads the user's saved difficulty preference from AsyncStorage.
 * Defaults to 'MEDIUM' if no preference exists.
 */
export async function loadSavedAiDifficulty(): Promise<AiDifficulty> {
  try {
    const saved = await AsyncStorage.getItem(AI_DIFFICULTY_STORAGE_KEY);
    if (saved === 'EASY' || saved === 'MEDIUM' || saved === 'HARD') {
      return saved;
    }
  } catch (err) {
    console.warn('[AiDifficultySelector] Failed to load saved difficulty:', err);
  }
  return 'MEDIUM';
}

/**
 * Persists the user's difficulty preference to AsyncStorage.
 */
export async function saveAiDifficultyPreference(difficulty: AiDifficulty): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_DIFFICULTY_STORAGE_KEY, difficulty);
  } catch (err) {
    console.warn('[AiDifficultySelector] Failed to save difficulty preference:', err);
  }
}

/**
 * Custom React Hook that loads the saved preference, defaults to 'MEDIUM',
 * and synchronizes changes to AsyncStorage.
 */
export function useAiDifficulty(initialDefault: AiDifficulty = 'MEDIUM') {
  const [difficulty, setDifficultyState] = useState<AiDifficulty>(initialDefault);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadSavedAiDifficulty().then((saved) => {
      if (isMounted) {
        setDifficultyState(saved);
        setIsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const setDifficulty = (newDiff: AiDifficulty) => {
    setDifficultyState(newDiff);
    saveAiDifficultyPreference(newDiff);
  };

  return { difficulty, setDifficulty, isLoaded };
}

export interface AiDifficultySelectorProps {
  value: AiDifficulty;
  onChange: (value: AiDifficulty) => void;
  variant?: 'cards' | 'segmented';
  showDescription?: boolean;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export const AiDifficultySelector: React.FC<AiDifficultySelectorProps> = ({
  value,
  onChange,
  variant = 'cards',
  showDescription = true,
  title = 'AI Difficulty',
  style,
}) => {
  const { theme, effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';

  const selectedOption =
    AI_DIFFICULTY_OPTIONS.find((opt) => opt.key === value) ||
    AI_DIFFICULTY_OPTIONS[1];

  const handleSelect = (diff: AiDifficulty) => {
    onChange(diff);
    saveAiDifficultyPreference(diff);
  };

  if (variant === 'segmented') {
    return (
      <View style={[styles.container, style]}>
        {title ? (
          <View style={styles.titleRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {title}
            </Text>
            <View
              style={[
                styles.activeBadge,
                { backgroundColor: selectedOption.accentColor + '20' },
              ]}
            >
              <Text
                style={[styles.activeBadgeText, { color: selectedOption.accentColor }]}
              >
                {selectedOption.badge}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Segmented Control Bar */}
        <View
          style={[
            styles.segmentedBar,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.backgroundSecondary,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {AI_DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = value === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.segmentBtn,
                  isSelected && {
                    backgroundColor: theme.colors.surfaceElevated,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.3 : 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label} difficulty`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.segmentInnerRow}>
                  <View
                    style={[
                      styles.indicatorDot,
                      {
                        backgroundColor: isSelected
                          ? opt.accentColor
                          : isDark
                          ? '#64748B'
                          : '#94A3B8',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      {
                        color: isSelected
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Description Pill Below Segmented Control */}
        {showDescription && (
          <View
            style={[
              styles.segmentedDescriptionBox,
              {
                backgroundColor: isDark
                  ? theme.colors.surface
                  : theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.descIconCircle,
                { backgroundColor: selectedOption.accentColor + '18' },
              ]}
            >
              <View
                style={[
                  styles.descAccentPill,
                  { backgroundColor: selectedOption.accentColor },
                ]}
              />
            </View>
            <Text
              style={[
                styles.segmentedDescriptionText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {selectedOption.description}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Variant: Selectable Cards
  return (
    <View style={[styles.container, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {title}
          </Text>
          <Text style={[styles.defaultHint, { color: theme.colors.textMuted }]}>
            Choose AI strength
          </Text>
        </View>
      ) : null}

      <View style={styles.cardsCol}>
        {AI_DIFFICULTY_OPTIONS.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.cardItem,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? theme.colors.surfaceElevated
                      : '#FFFFFF'
                    : isDark
                    ? theme.colors.surface
                    : theme.colors.backgroundSecondary,
                  borderColor: isSelected ? opt.accentColor : theme.colors.border,
                  borderWidth: isSelected ? 1.8 : 1,
                },
              ]}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} difficulty: ${opt.description}`}
              accessibilityState={{ selected: isSelected }}
            >
              {/* Left Accent Bar / Indicator */}
              <View
                style={[
                  styles.cardAccentBar,
                  {
                    backgroundColor: isSelected
                      ? opt.accentColor
                      : 'transparent',
                  },
                ]}
              />

              <View style={styles.cardMainCol}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[
                        styles.cardLabel,
                        {
                          color: isSelected
                            ? theme.colors.textPrimary
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: opt.accentColor + (isSelected ? '25' : '15'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          { color: opt.accentColor },
                        ]}
                      >
                        {opt.badge}
                      </Text>
                    </View>
                  </View>

                  {/* Radio Selection Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected
                          ? opt.accentColor
                          : theme.colors.border,
                        backgroundColor: isSelected
                          ? opt.accentColor + '18'
                          : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: opt.accentColor },
                        ]}
                      />
                    )}
                  </View>
                </View>

                {showDescription && (
                  <Text
                    style={[
                      styles.cardDescription,
                      {
                        color: isSelected
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary,
                        opacity: isSelected ? 0.9 : 0.75,
                      },
                    ]}
                  >
                    {opt.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  defaultHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Segmented Variant
  segmentedBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentBtnText: {
    fontSize: 13,
  },
  segmentedDescriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 2,
  },
  descIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descAccentPill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentedDescriptionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Cards Variant
  cardsCol: {
    gap: 8,
  },
  cardItem: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccentBar: {
    width: 4,
  },
  cardMainCol: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});
