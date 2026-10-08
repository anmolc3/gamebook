import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, getThemeCardGradient } from '../../theme';
import { Icon, IconName } from '../../icons';
import { getGameImage } from '../../constants/gameImages';

interface GameCardProps {
  title: string;
  subtitle: string;
  gameType: string;
  icon: IconName;
  playerCountText: string;
  onlineCount: number;
  onPressPlay: () => void;
  onPressCreateRoom?: () => void;
  accentColor?: string;
  badgeText?: string;
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
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const effectiveAccent = accentColor || theme.colors.primary;
  const gradientInfo = getThemeCardGradient(themeId, effectiveMode, accentColor);
  const gameImage = getGameImage(gameType);

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
        {/* Game Artwork / Icon Badge */}
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
            <Image
              source={gameImage}
              style={styles.gameImage}
              resizeMode="cover"
            />
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

          <View
            style={[
              styles.onlinePill,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: theme.colors.online },
              ]}
            />
            <Text style={[styles.onlineText, { color: theme.colors.textSecondary }]}>
              {onlineCount.toLocaleString()} online
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {subtitle}
      </Text>

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
            <Text
              style={[
                styles.playButtonText,
                { color: theme.colors.textOnPrimary },
              ]}
            >
              Play Match
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    marginRight: 6,
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
