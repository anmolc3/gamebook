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
  strokeWidth = 2.2,
  gap = 2.4,
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
  const coral = theme.colors.accentCoral || theme.colors.primary || '#FF575F';
  const purple = theme.colors.accentPurple || '#755FE2';
  const borderColor = inactiveColor || (isDark ? '#2E303A' : theme.colors.border || '#E4E9F3');
  const innerBg = theme.colors.background || (isDark ? '#000000' : '#FFFFFF');

  const C = size / 2;
  const ringStroke = strokeWidth;
  const R = (size - ringStroke) / 2;

  // Inner avatar diameter (sits inside the slim multicolor ring with gap spacing)
  const innerSize = Math.max(0, Math.round(size - 2 * (ringStroke + gap)));

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
              {/* Slim multicolor gradient: Pink -> Coral -> Purple (Otter palette) */}
              <LinearGradient
                id={`multiGrad_${ringId}`}
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor={pink} />
                <Stop offset="45%" stopColor={coral} />
                <Stop offset="100%" stopColor={purple} />
              </LinearGradient>
            </Defs>

            {/* Smooth single multicolor ring stroke */}
            <Circle
              cx={C}
              cy={C}
              r={R}
              stroke={`url(#multiGrad_${ringId})`}
              strokeWidth={ringStroke}
              fill="none"
            />
          </>
        ) : (
          <Circle
            cx={C}
            cy={C}
            r={R}
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
