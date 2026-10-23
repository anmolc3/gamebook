import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { StoryGradientRing } from '../atoms/StoryGradientRing';
import { PlusIcon } from '../../icons';

export interface StoryTrayItem {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isSelf?: boolean;
  allViewed?: boolean;
  stories: {
    id: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string | null;
    createdAt: string;
    expiresAt: string;
    viewsCount?: number;
    hasViewed?: boolean;
  }[];
}

interface StoryBarProps {
  trays: StoryTrayItem[];
  onPressAddStory: () => void;
  onPressTray: (tray: StoryTrayItem) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  trays,
  onPressAddStory,
  onPressTray,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Story Button (Self) */}
        <TouchableOpacity
          onPress={onPressAddStory}
          activeOpacity={0.8}
          style={styles.storyItem}
        >
          <View style={styles.ringWrapper}>
            <StoryGradientRing
              size={64}
              strokeWidth={2.2}
              gap={2.4}
              isActive={false}
              isDashed={true}
            >
              <Avatar displayName="You" size={50} fallbackToOtter={true} />
            </StoryGradientRing>
            <View
              style={[
                styles.addBadge,
                {
                  backgroundColor: theme.colors.accentPink || theme.colors.primary,
                  borderColor: theme.colors.background,
                },
              ]}
            >
              <PlusIcon size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
          <Text
            style={[
              styles.username,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            Your Story
          </Text>
        </TouchableOpacity>

        {/* Friends & Self Active Stories */}
        {trays.map((tray) => {
          const isUnread = !tray.allViewed;

          return (
            <TouchableOpacity
              key={tray.userId}
              onPress={() => onPressTray(tray)}
              activeOpacity={0.8}
              style={styles.storyItem}
            >
              <View style={styles.ringWrapper}>
                <StoryGradientRing
                  size={64}
                  strokeWidth={2.2}
                  gap={2.4}
                  isActive={isUnread}
                >
                  <Avatar
                    displayName={tray.displayName || tray.username}
                    avatarUrl={tray.avatarUrl}
                    size={50}
                    fallbackToOtter={true}
                  />
                </StoryGradientRing>
              </View>
              <Text
                style={[
                  styles.username,
                  {
                    color: isUnread
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                    fontWeight: isUnread ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {tray.isSelf ? 'You' : (tray.displayName || tray.username).split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  ringWrapper: {
    position: 'relative',
  },
  addBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  username: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 64,
  },
});
