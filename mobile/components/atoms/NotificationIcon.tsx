import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface NotificationIconProps {
  size?: number;
  hasUnread?: boolean;
  /** Numeric count shown inside the badge; if omitted shows a plain dot */
  unreadCount?: number;
  style?: StyleProp<ViewStyle>;
}

const otterColorIcon = require('../../assets/images/otter-notification.png');
const otterBlackIcon = require('../../assets/images/otter-notification-black.png');

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  size = 32,
  hasUnread = false,
  unreadCount,
  style,
}) => {
  const { theme, effectiveMode } = useTheme();
  const isDark = (theme?.mode || effectiveMode) !== 'light';

  const isAvailable = Boolean(hasUnread || (typeof unreadCount === 'number' && unreadCount > 0));

  // ─── Shake animation ─────────────────────────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (isAvailable) {
      // Energetic, authentic bell shake: rapid oscillation with decreasing amplitude then pause
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: -1, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.85, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.85, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.3, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.delay(1200),
        ])
      );
      animLoop.start();
    } else {
      shakeAnim.stopAnimation();
      Animated.timing(shakeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    }

    return () => {
      animLoop?.stop();
    };
  }, [isAvailable, shakeAnim]);

  const rotation = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const translateX = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-3, 0, 3],
  });

  // ─── Badge dot (pulsing scale) ────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (isAvailable) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop?.stop();
  }, [isAvailable, pulseAnim]);

  // ─── Sizing ───────────────────────────────────────────────────────────────────
  const dotSize = Math.max(8, Math.round(size * 0.3));
  const dotBorder = Math.max(1.5, Math.round(size * 0.055));
  const dotBorderColor = theme?.colors?.background || (isDark ? '#000000' : '#FFFFFF');

  // Determine badge display text
  const showCount = typeof unreadCount === 'number' && unreadCount > 0;
  const badgeText = showCount ? (unreadCount! > 99 ? '99+' : String(unreadCount)) : undefined;
  const badgeFontSize = Math.max(7, Math.round(dotSize * 0.55));

  // Badge is larger when showing a number
  const badgeSize = badgeText
    ? Math.max(dotSize, badgeText.length > 1 ? dotSize + 4 : dotSize)
    : dotSize;
  const badgeWidth = badgeText && badgeText.length > 1 ? badgeSize + 6 : badgeSize;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Bell / Otter icon with shake and wobble */}
      <Animated.View
        style={{
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [
            { translateX },
            { rotate: rotation },
          ],
        }}
      >
        <Image
          source={isDark ? otterColorIcon : otterBlackIcon}
          style={{ width: size, height: size }}
          resizeMode="contain"
          accessibilityLabel="Notifications"
        />
      </Animated.View>

      {/* Pulsing Red Badge Dot */}
      {isAvailable && (
        <Animated.View
          style={[
            styles.badge,
            {
              minWidth: badgeWidth,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              borderWidth: dotBorder,
              borderColor: dotBorderColor,
              paddingHorizontal: badgeText ? 3 : 0,
              top: Math.round(size * 0.0),
              right: Math.round(size * 0.0),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {badgeText ? (
            <Text
              style={[styles.badgeText, { fontSize: badgeFontSize }]}
              numberOfLines={1}
            >
              {badgeText}
            </Text>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#EF4444',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
