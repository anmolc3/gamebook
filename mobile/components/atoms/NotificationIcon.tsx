import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  G,
} from 'react-native-svg';

export interface NotificationIconProps {
  size?: number;
  hasUnread?: boolean;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  size = 28,
  hasUnread = false,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (hasUnread) {
      // Natural bell ringing shake sequence: left-right wobble followed by pause
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: -1, duration: 75, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 75, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.8, duration: 70, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0.8, duration: 70, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -0.4, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
          Animated.delay(2400), // Calm interval between alert rings
        ])
      );
      animLoop.start();
    } else {
      shakeAnim.setValue(0);
    }

    return () => {
      animLoop?.stop();
    };
  }, [hasUnread, shakeAnim]);

  const rotation = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: rotation }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 900 800" fill="none">
          <Defs>
            {/* Blue face gradient from notification_icon.svg */}
            <LinearGradient id="notif_blue" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#59D7FF" />
              <Stop offset="0.5" stopColor="#1789F5" />
              <Stop offset="1" stopColor="#0750C7" />
            </LinearGradient>

            {/* Gold rim gradient from notification_icon.svg */}
            <LinearGradient id="notif_gold" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFF49A" />
              <Stop offset="0.35" stopColor="#FFD12E" />
              <Stop offset="0.72" stopColor="#E99A12" />
              <Stop offset="1" stopColor="#9C5A08" />
            </LinearGradient>
          </Defs>

          <G stroke="#071B55" strokeWidth={12} strokeLinejoin="round">
            {/* Bottom Clapper */}
            <Circle cx="450" cy="672" r="52" fill="url(#notif_gold)" />

            {/* Top Knob */}
            <Circle cx="450" cy="150" r="34" fill="url(#notif_gold)" />

            {/* Outer Gold Rim Bell */}
            <Path
              d="M450 170C340 170 270 260 270 380V500C270 540 240 565 210 590C195 603 205 625 225 625H675C695 625 705 603 690 590C660 565 630 540 630 500V380C630 260 560 170 450 170Z"
              fill="url(#notif_gold)"
            />

            {/* Inner Blue Face Bell */}
            <G transform="translate(63, 56) scale(0.86)">
              <Path
                d="M450 170C340 170 270 260 270 380V500C270 540 240 565 210 590C195 603 205 625 225 625H675C695 625 705 603 690 590C660 565 630 540 630 500V380C630 260 560 170 450 170Z"
                fill="url(#notif_blue)"
              />
            </G>
          </G>

          {/* Gloss Highlights */}
          <G fill="none" stroke="#FFFFFF" strokeLinecap="round" opacity={0.45}>
            <Path d="M330 300C344 258 375 228 420 218" strokeWidth={24} />
            <Path d="M325 400V470" strokeWidth={18} />
          </G>
        </Svg>
      </Animated.View>

      {/* Red Unseen Notification Alert Dot: ONLY displayed when hasUnread is true */}
      {hasUnread && <View style={styles.unreadDot} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
});
