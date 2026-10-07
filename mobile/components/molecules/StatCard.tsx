import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, getThemeGradients } from '../../theme';
import { Icon, IconName } from '../../icons';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconName;
  accentColor?: string;
  trendText?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accentColor,
  trendText,
  style,
}) => {
  const { theme, themeId, effectiveMode } = useTheme();
  const effectiveAccent = accentColor || theme.colors.primary;
  const gradients = getThemeGradients(themeId, effectiveMode);

  let statGradient = gradients.card;
  const lowerAccent = (accentColor || '').toLowerCase();
  if (lowerAccent.includes('3ed') || lowerAccent.includes('25c') || lowerAccent.includes('mint')) {
    statGradient = gradients.statMint;
  } else if (lowerAccent.includes('ffc') || lowerAccent.includes('f59') || lowerAccent.includes('amber')) {
    statGradient = gradients.statAmber;
  } else if (lowerAccent.includes('ff5') || lowerAccent.includes('coral') || lowerAccent.includes('ef4')) {
    statGradient = gradients.statCoral;
  }

  return (
    <LinearGradient
      colors={statGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          borderRadius: theme.radius.card,
          borderColor: gradients.statBorder,
          overflow: 'hidden',
        },
        theme.shadows.card,
        style,
      ]}
    >
      <View style={styles.header}>
        {/* Marvie Signature Bullet / Icon Pill */}
        <View style={styles.bulletRow}>
          <View
            style={[
              styles.marvieBullet,
              { backgroundColor: effectiveAccent },
            ]}
          />
          {icon && (
            <Icon name={icon} size={15} color={effectiveAccent} />
          )}
        </View>
        {trendText && (
          <View
            style={[
              styles.trendPill,
              { backgroundColor: effectiveAccent + '20' },
            ]}
          >
            <Text style={[styles.trendText, { color: effectiveAccent }]}>
              {trendText}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    minWidth: 100,
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marvieBullet: {
    width: 14,
    height: 8,
    borderRadius: 4,
  },
  trendPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
