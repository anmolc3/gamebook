import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { StoryGradientRing } from '../atoms/StoryGradientRing';
import { Icon } from '../../icons';

export interface StoryAvatarProps {
  name: string;
  avatarUrl?: string | null;
  hasUnviewedStory?: boolean;
  isAddStory?: boolean;
  onPress: () => void;
  size?: number;
}

export const StoryAvatar: React.FC<StoryAvatarProps> = ({
  name,
  avatarUrl,
  hasUnviewedStory = false,
  isAddStory = false,
  onPress,
  size = 64,
}) => {
  const { theme } = useTheme();

  // Consistent ring stroke & gap geometry
  const strokeWidth = 2.4;
  const gap = 2.6;
  const innerSize = Math.max(0, Math.round(size - 2 * (strokeWidth + gap)));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, { width: size + 8 }]}
      accessibilityRole="button"
      accessibilityLabel={isAddStory ? 'Add new story' : `${name}'s story`}
    >
      <View style={styles.ringWrapper}>
        <StoryGradientRing
          size={size}
          strokeWidth={strokeWidth}
          gap={gap}
          isActive={hasUnviewedStory}
          isDashed={isAddStory && !hasUnviewedStory}
        >
          <Avatar
            displayName={isAddStory ? 'You' : name}
            avatarUrl={avatarUrl}
            size={innerSize}
            fallbackToOtter={true}
          />
        </StoryGradientRing>

        {isAddStory && (
          <View
            style={[
              styles.plusBadge,
              {
                backgroundColor: theme.colors.accentPink || theme.colors.primary,
                borderColor: theme.colors.background,
              },
            ]}
          >
            <Icon name="plus" size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.name,
          {
            color: hasUnviewedStory
              ? theme.colors.textPrimary
              : theme.colors.textSecondary,
            fontWeight: hasUnviewedStory ? '600' : '400',
          },
        ]}
      >
        {isAddStory ? 'Your Story' : name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 10,
  },
  ringWrapper: {
    position: 'relative',
    marginBottom: 5,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  name: {
    fontSize: 11.5,
    textAlign: 'center',
  },
});
