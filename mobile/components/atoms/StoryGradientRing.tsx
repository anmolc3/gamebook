import React, { useId } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../theme';

export interface StoryGradientRingProps {
  /** Total outer diameter of the ring container. Default is 58 */
  size?: number;
  /** Thickness of the gradient ring stroke. Default is 2.5 */
  strokeWidth?: number;
  /** Inner padding/gap between the ring stroke and the DP. Default is 2.5 */
  gap?: number;
  /** Whether the story is active / unviewed. Default is true */
  isActive?: boolean;
  /** If inactive, custom border color or defaults to theme.colors.border */
  inactiveColor?: string;
  /** Whether to show a dashed outline (e.g. for "Your Story" add mode) */
  isDashed?: boolean;
  /** Avatar or content to display inside the ring */
  children: React.ReactNode;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export const StoryGradientRing: React.FC<StoryGradientRingProps> = ({
  size = 64,
  strokeWidth = 2.4,
  gap = 2.6,
  isActive = true,
  inactiveColor,
  isDashed = false,
  children,
  style,
}) => {
  const { theme, effectiveMode } = useTheme();
  const rawId = useId();
  const ringId = rawId.replace(/[^a-zA-Z0-9]/g, '_');
  const isDark = (theme?.mode || effectiveMode) === 'dark';

  // Otter theme palette tokens (only existing theme colors)
  const pink = theme.colors.accentPink || '#FF2D78';
  const purple = theme.colors.accentPurple || '#755FE2';
  const coral = theme.colors.accentCoral || theme.colors.primary || '#FF575F';
  const borderColor = inactiveColor || (isDark ? '#2E303A' : theme.colors.border || '#E4E9F3');
  const innerBg = theme.colors.background || (isDark ? '#000000' : '#FFFFFF');

  const C = size / 2;

  // Multicolor dual-ring geometry: Outer Pink band + Inner Purple band matching Otter mockup
  const strokeOuter = 1.8;
  const strokeInner = 1.6;
  const R_outer = (size - strokeOuter) / 2;
  const R_inner = R_outer - strokeOuter / 2 - strokeInner / 2;

  // Single circle inactive radius
  const R_inactive = (size - 1.5) / 2;

  // Inner avatar diameter (sits inside the inner ring with gap spacing)
  const innerSize = Math.max(0, Math.round(size - 2 * (strokeOuter + strokeInner + gap)));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Background / SVG Ring */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}
      >
        {isActive ? (
          <>
            <Defs>
              {/* Outer band gradient: Pink transitioning through Coral around the circumference */}
              <LinearGradient
                id={`outerGrad_${ringId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={pink} />
                <Stop offset="50%" stopColor={coral} />
                <Stop offset="100%" stopColor={pink} />
              </LinearGradient>

              {/* Inner band gradient: Purple transitioning around the circumference */}
              <LinearGradient
                id={`innerGrad_${ringId}`}
                x1="100%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={purple} />
                <Stop offset="50%" stopColor={pink} />
                <Stop offset="100%" stopColor={purple} />
              </LinearGradient>
            </Defs>

            {/* Outer Pink-dominant ring stroke */}
            <Circle
              cx={C}
              cy={C}
              r={R_outer}
              stroke={`url(#outerGrad_${ringId})`}
              strokeWidth={strokeOuter}
              fill="none"
            />

            {/* Inner Purple-dominant ring stroke */}
            <Circle
              cx={C}
              cy={C}
              r={R_inner}
              stroke={`url(#innerGrad_${ringId})`}
              strokeWidth={strokeInner}
              fill="none"
            />
          </>
        ) : (
          <Circle
            cx={C}
            cy={C}
            r={R_inactive}
            stroke={borderColor}
            strokeWidth={1.5}
            strokeDasharray={isDashed ? '4, 3' : undefined}
            fill="none"
          />
        )}
      </Svg>

      {/* Inner Avatar Container (with gap padding) */}
      <View
        style={[
          styles.innerContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: innerBg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  innerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
