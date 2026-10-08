import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, getThemeCardGradient } from '../../theme';
import { Icon, IconName } from '../../icons';
import { getGameImage } from '../../constants/gameImages';

export interface GameCardProps {
  title: string;
  subtitle?: string;
  gameType: string;
  icon: IconName;
  playerCountText: string;
  onlineCount?: number;
  onPressPlay: () => void;
  onPressCreateRoom?: () => void;
  accentColor?: string;
  badgeText?: string;
  compact?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  subtitle,
  gameType,
  icon,
  playerCountText,
  onlineCount,
  onPressPlay,
  onPressCreateRoom,
  accentColor,
  badgeText,
  compact = false,
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const effectiveAccent = accentColor || theme.colors.primary;
  const gradientInfo = getThemeCardGradient(themeId, effectiveMode, accentColor);
  const gameImage = getGameImage(gameType);

  if (compact) {
    return (
      <LinearGradient
        colors={gradientInfo.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.compactCard,
          {
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          theme.shadows.soft,
        ]}
      >
        {/* Top Artwork & Badges */}
        <View style={styles.compactTopRow}>
          <View style={styles.compactIconWrap}>
            {gameImage ? (
              <Image source={gameImage} style={styles.compactGameImage} resizeMode="cover" />
            ) : (
              <Icon name={icon} size={22} color={effectiveAccent} strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.compactRightPills}>
            {badgeText && (
              <View style={[styles.compactBadge, { backgroundColor: theme.colors.cardTintAmber }]}>
                <Text style={[styles.compactBadgeText, { color: theme.colors.accentAmber }]}>
                  {badgeText}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.compactTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>

        {/* Player Count & Play Button */}
        <View style={styles.compactFooter}>
          <Text style={[styles.compactPlayersText, { color: theme.colors.textMuted }]}>
            {playerCountText}
          </Text>
          <TouchableOpacity
            onPress={onPressPlay}
            style={[styles.compactPlayBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.82}
          >
            <Icon name="play" size={12} color={theme.colors.textOnPrimary} />
            <Text style={[styles.compactPlayBtnText, { color: theme.colors.textOnPrimary }]}>
              Play
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientInfo.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          borderRadius: theme.radius.card,
          borderWidth: 0,
          overflow: 'hidden',
        },
        theme.shadows.card,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: theme.colors.cardTintMint,
              borderRadius: theme.radius.xl,
            },
          ]}
        >
          {gameImage ? (
            <Image source={gameImage} style={styles.gameImage} resizeMode="cover" />
          ) : (
            <Icon name={icon} size={28} color={effectiveAccent} strokeWidth={2.2} />
          )}
        </View>

        <View style={styles.topBadgesRow}>
          {badgeText && (
            <View
              style={[
                styles.featureBadge,
                { backgroundColor: theme.colors.cardTintAmber },
              ]}
            >
              <Text style={[styles.featureBadgeText, { color: theme.colors.accentAmber }]}>
                {badgeText}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
        <View style={styles.playerInfoRow}>
          <Icon name="users" size={14} color={theme.colors.textMuted} />
          <Text style={[styles.playersInfo, { color: theme.colors.textMuted }]}>
            {playerCountText}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          {onPressCreateRoom && (
            <TouchableOpacity
              onPress={onPressCreateRoom}
              activeOpacity={0.8}
              style={[
                styles.createButton,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Icon name="plus" size={14} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onPressPlay}
            activeOpacity={0.82}
            style={[
              styles.playButton,
              { backgroundColor: theme.colors.primary },
              theme.shadows.soft,
            ]}
          >
            <Icon name="play" size={14} color={theme.colors.textOnPrimary} />
            <Text style={[styles.playButtonText, { color: theme.colors.textOnPrimary }]}>
              Play Match
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Compact 2-column Grid Card styles
  compactCard: {
    width: '48.5%',
    padding: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactGameImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  compactRightPills: {
    alignItems: 'flex-end',
    gap: 4,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  compactOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactOnlineText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  compactPlayersText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compactPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  compactPlayBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Standard full-width Card styles
  card: {
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gameImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playersInfo: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
