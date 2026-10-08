import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeId, AppearanceMode, getThemeGradients } from '../../theme';
import { THEME_METADATA, resolveTheme } from '../../theme/themes';
import { Icon } from '../../icons';

export interface ThemesScreenProps {
  onBack: () => void;
}

interface ThemeDetail {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  vibes: string[];
}

const THEME_DETAILS: Record<ThemeId, ThemeDetail> = {
  midnightNeutral: {
    id: 'midnightNeutral',
    name: 'Obsidian Black / Mint',
    tagline: 'Cyberpunk Stealth & Electric Mint',
    description:
      'Ultra-deep pitch obsidian background paired with radiant neon mint accents. High contrast, sleek, and easy on the eyes during intense gaming sessions.',
    vibes: ['Stealth Dark', 'Neon Mint', 'High Contrast'],
  },
  coralMarble: {
    id: 'coralMarble',
    name: 'Marble / Coral',
    tagline: 'Sunset Flame & Coral Elegance',
    description:
      'Warm marble and porcelain undertones accented with vibrant coral and flame highlights. Energetic, welcoming, and beautifully polished.',
    vibes: ['Coral Flame', 'Warm Glow', 'Dynamic'],
  },
  forestGold: {
    id: 'forestGold',
    name: 'Forest / Gold',
    tagline: 'Emerald Dynasty & Royal Gold',
    description:
      'Lush deep emerald forest tones accented by regal warm gold trims. Gives an authentic premium board-game and royal arcade experience.',
    vibes: ['Emerald', 'Royal Gold', 'Prestigious'],
  },
  moonViolet: {
    id: 'moonViolet',
    name: 'Moon / Violet',
    tagline: 'Celestial Cosmos & Electric Violet',
    description:
      'Mystical cosmic purple and celestial deep navy with glowing ultraviolet trims. Engineered for immersive late-night multiplayer sessions.',
    vibes: ['Cosmic Violet', 'Deep Space', 'Electric Glow'],
  },
  violetDusk: {
    id: 'violetDusk',
    name: 'Violet Dusk',
    tagline: 'Twilight Magenta & Sunset Amber',
    description:
      'Velvet dusk twilight blending deep wine, magenta neon, and warm sunset peach accents. Smooth, stylish, and deeply atmospheric.',
    vibes: ['Twilight Dusk', 'Sunset Amber', 'Velvet Glow'],
  },
};

export const ThemesScreen: React.FC<ThemesScreenProps> = ({ onBack }) => {
  const { theme, themeId, appearanceMode, effectiveMode, setThemeId, setAppearanceMode } =
    useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  }, []);

  const appearanceOptions: {
    mode: AppearanceMode;
    label: string;
    icon: 'palette' | 'sun' | 'moon';
    desc: string;
  }[] = [
    { mode: 'system', label: 'System', icon: 'palette', desc: 'Syncs with device mode' },
    { mode: 'light', label: 'Light', icon: 'sun', desc: 'Crisp bright canvas' },
    { mode: 'dark', label: 'Dark', icon: 'moon', desc: 'Deep OLED contrast' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={effectiveMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceElevated }]}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Theme Studio
          </Text>
          <View style={styles.headerSubRow}>
            <View
              style={[
                styles.activeColorDot,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Active: {THEME_DETAILS[themeId]?.name || themeId}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Banner Hero */}
        <LinearGradient
          colors={getThemeGradients(themeId, effectiveMode).hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroBanner,
            { borderColor: getThemeGradients(themeId, effectiveMode).heroBorder },
          ]}
        >
          <View style={styles.heroTopPill}>
            <Icon name="palette" size={13} color={theme.colors.primary} />
            <Text style={[styles.heroTopPillText, { color: theme.colors.primary }]}>
              5 HAND-CRAFTED COLOR PALETTES
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
            Customize Your Platform
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            Choose your signature colorway. Changes apply instantly across all 71+ games, chat,
            profile, and menus.
          </Text>
        </LinearGradient>

        {/* Display Mode Switcher */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="sun" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Display Mode
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Select your preferred day/night visual mode
          </Text>

          <View style={styles.modesGrid}>
            {appearanceOptions.map((opt) => {
              const isSelected = appearanceMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  onPress={() => setAppearanceMode(opt.mode)}
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                    isSelected && styles.modeCardSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.modeIconCircle,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.surface,
                      },
                    ]}
                  >
                    <Icon
                      name={opt.icon}
                      size={18}
                      color={isSelected ? theme.colors.textOnPrimary : theme.colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modeLabel,
                      {
                        color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={[styles.modeDesc, { color: theme.colors.textMuted }]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme Families List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="palette" size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Available Themes
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Tap any theme card below to activate it immediately
          </Text>

          <View style={styles.themeList}>
            {THEME_METADATA.map((meta) => {
              const isCurrent = themeId === meta.id;
              const details = THEME_DETAILS[meta.id] || {
                name: meta.name,
                tagline: meta.name,
                description: 'Custom curated palette',
                vibes: [],
              };
              const sample = resolveTheme(meta.id, effectiveMode);

              return (
                <TouchableOpacity
                  key={meta.id}
                  onPress={() => setThemeId(meta.id)}
                  activeOpacity={0.88}
                  style={[
                    styles.themeBigCard,
                    {
                      backgroundColor: sample.colors.surface,
                      borderColor: isCurrent ? sample.colors.primary : sample.colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                    isCurrent && styles.themeBigCardActive,
                  ]}
                >
                  {/* Top Bar of Card */}
                  <View style={styles.themeCardTop}>
                    <View style={styles.themeCardMeta}>
                      <Text style={[styles.themeCardName, { color: sample.colors.textPrimary }]}>
                        {details.name}
                      </Text>
                      <Text
                        style={[styles.themeCardTagline, { color: sample.colors.primary }]}
                      >
                        {details.tagline}
                      </Text>
                    </View>

                    {/* Active Pill or Select Button */}
                    {isCurrent ? (
                      <View
                        style={[
                          styles.activePill,
                          { backgroundColor: sample.colors.primary },
                        ]}
                      >
                        <Icon name="check" size={12} color={sample.colors.textOnPrimary} />
                        <Text
                          style={[
                            styles.activePillText,
                            { color: sample.colors.textOnPrimary },
                          ]}
                        >
                          APPLIED
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.selectPill,
                          {
                            backgroundColor: sample.colors.surfaceElevated,
                            borderColor: sample.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.selectPillText, { color: sample.colors.textSecondary }]}
                        >
                          SELECT
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <Text style={[styles.themeCardDesc, { color: sample.colors.textSecondary }]}>
                    {details.description}
                  </Text>

                  {/* Vibes Tags */}
                  <View style={styles.vibesRow}>
                    {details.vibes.map((vibe, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.vibeTag,
                          {
                            backgroundColor: sample.colors.surfaceElevated,
                            borderColor: sample.colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.vibeText, { color: sample.colors.textPrimary }]}>
                          #{vibe}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Color Swatches Grid */}
                  <View style={styles.swatchesContainer}>
                    <Text style={[styles.swatchesHeader, { color: sample.colors.textMuted }]}>
                      PALETTE TOKENS
                    </Text>
                    <View style={styles.swatchesRow}>
                      <View style={styles.swatchItem}>
                        <View
                          style={[
                            styles.swatchCircle,
                            { backgroundColor: sample.colors.primary },
                          ]}
                        />
                        <Text style={[styles.swatchLabel, { color: sample.colors.textPrimary }]}>
                          Primary
                        </Text>
                        <Text style={[styles.swatchHex, { color: sample.colors.textMuted }]}>
                          {sample.colors.primary}
                        </Text>
                      </View>

                      <View style={styles.swatchItem}>
                        <View
                          style={[
                            styles.swatchCircle,
                            { backgroundColor: sample.colors.secondary },
                          ]}
                        />
                        <Text style={[styles.swatchLabel, { color: sample.colors.textPrimary }]}>
                          Secondary
                        </Text>
                        <Text style={[styles.swatchHex, { color: sample.colors.textMuted }]}>
                          {sample.colors.secondary}
                        </Text>
                      </View>

                      <View style={styles.swatchItem}>
                        <View
                          style={[
                            styles.swatchCircle,
                            { backgroundColor: sample.colors.accent },
                          ]}
                        />
                        <Text style={[styles.swatchLabel, { color: sample.colors.textPrimary }]}>
                          Accent
                        </Text>
                        <Text style={[styles.swatchHex, { color: sample.colors.textMuted }]}>
                          {sample.colors.accent}
                        </Text>
                      </View>

                      <View style={styles.swatchItem}>
                        <View
                          style={[
                            styles.swatchCircle,
                            {
                              backgroundColor: sample.colors.surfaceElevated,
                              borderWidth: 1,
                              borderColor: sample.colors.border,
                            },
                          ]}
                        />
                        <Text style={[styles.swatchLabel, { color: sample.colors.textPrimary }]}>
                          Surface
                        </Text>
                        <Text style={[styles.swatchHex, { color: sample.colors.textMuted }]}>
                          {sample.colors.surfaceElevated}
                        </Text>
                      </View>

                      <View style={styles.swatchItem}>
                        <View
                          style={[
                            styles.swatchCircle,
                            {
                              backgroundColor: sample.colors.background,
                              borderWidth: 1,
                              borderColor: sample.colors.border,
                            },
                          ]}
                        />
                        <Text style={[styles.swatchLabel, { color: sample.colors.textPrimary }]}>
                          Canvas
                        </Text>
                        <Text style={[styles.swatchHex, { color: sample.colors.textMuted }]}>
                          {sample.colors.background}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Live Mini UI Preview inside the card */}
                  <View
                    style={[
                      styles.mockupContainer,
                      {
                        backgroundColor: sample.colors.background,
                        borderColor: sample.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.mockupHeader}>
                      <View style={styles.mockupUserRow}>
                        <View
                          style={[
                            styles.mockupAvatar,
                            { backgroundColor: sample.colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.mockupAvatarText,
                              { color: sample.colors.textOnPrimary },
                            ]}
                          >
                            P
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.mockupUserName,
                              { color: sample.colors.textPrimary },
                            ]}
                          >
                            Player Profile
                          </Text>
                          <Text
                            style={[
                              styles.mockupUserSub,
                              { color: sample.colors.textSecondary },
                            ]}
                          >
                            Live Preview
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.mockupBadge,
                          { backgroundColor: sample.colors.cardTintMint },
                        ]}
                      >
                        <Text
                          style={[
                            styles.mockupBadgeText,
                            { color: sample.colors.primary },
                          ]}
                        >
                          ONLINE
                        </Text>
                      </View>
                    </View>

                    {/* Miniature Game Card Preview */}
                    <View
                      style={[
                        styles.mockupCard,
                        {
                          backgroundColor: sample.colors.surface,
                          borderColor: sample.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.mockupCardTextCol}>
                        <Text
                          style={[
                            styles.mockupCardTitle,
                            { color: sample.colors.textPrimary },
                          ]}
                        >
                          Ludo World Arena
                        </Text>
                        <Text
                          style={[
                            styles.mockupCardSub,
                            { color: sample.colors.textSecondary },
                          ]}
                        >
                          4 Players • Ranked Arena
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.mockupPlayBtn,
                          { backgroundColor: sample.colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.mockupPlayBtnText,
                            { color: sample.colors.textOnPrimary },
                          ]}
                        >
                          PLAY
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  heroBanner: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  heroTopPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroTopPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  modesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  modeCardSelected: {
    borderWidth: 2,
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 13,
  },
  modeDesc: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  themeList: {
    gap: 16,
  },
  themeBigCard: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  themeBigCardActive: {
    shadowColor: '#3ED598',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  themeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  themeCardMeta: {
    flex: 1,
    gap: 2,
  },
  themeCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  themeCardTagline: {
    fontSize: 12,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  selectPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  themeCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  vibesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vibeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  vibeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  swatchesContainer: {
    gap: 6,
    marginTop: 2,
  },
  swatchesHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  swatchItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  swatchCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  swatchLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  swatchHex: {
    fontSize: 8,
    fontWeight: '500',
  },
  mockupContainer: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockupUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockupAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mockupUserName: {
    fontSize: 11,
    fontWeight: '700',
  },
  mockupUserSub: {
    fontSize: 9,
    fontWeight: '500',
  },
  mockupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mockupBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mockupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  mockupCardTextCol: {
    gap: 2,
  },
  mockupCardTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  mockupCardSub: {
    fontSize: 9,
    fontWeight: '500',
  },
  mockupPlayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mockupPlayBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
