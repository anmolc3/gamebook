import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../../icons';

interface StoryAvatarProps {
  name: string;
  avatarUrl?: string | null;
  hasUnviewedStory?: boolean;
  isAddStory?: boolean;
  onPress: () => void;
}

export const StoryAvatar: React.FC<StoryAvatarProps> = ({
  name,
  avatarUrl,
  hasUnviewedStory = false,
  isAddStory = false,
  onPress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={isAddStory ? 'Add new story' : `${name}'s story`}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: isAddStory
              ? theme.colors.border
              : hasUnviewedStory
              ? theme.colors.primary
              : theme.colors.border,
            borderStyle: isAddStory ? 'dashed' : 'solid',
          },
        ]}
      >
        <Avatar displayName={name} avatarUrl={avatarUrl} size="md" />
        {isAddStory && (
          <View
            style={[
              styles.plusBadge,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.background,
              },
            ]}
          >
            <Icon name="plus" size={12} color="#FFFFFF" strokeWidth={3} />
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
        {isAddStory ? 'Your Story' : name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 14,
    width: 68,
  },
  ring: {
    padding: 3,
    borderRadius: 32,
    borderWidth: 2,
    marginBottom: 6,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
  },
});
