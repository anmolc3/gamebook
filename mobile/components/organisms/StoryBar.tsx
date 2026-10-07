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
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: theme.colors.border,
                borderStyle: 'dashed',
              },
            ]}
          >
            <Avatar displayName="You" size="md" />
            <View
              style={[
                styles.addBadge,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.surface,
                },
              ]}
            >
              <PlusIcon size={12} color={theme.colors.textOnPrimary} strokeWidth={3} />
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
          const ringColor = isUnread
            ? theme.colors.primary
            : theme.colors.border;

          return (
            <TouchableOpacity
              key={tray.userId}
              onPress={() => onPressTray(tray)}
              activeOpacity={0.8}
              style={styles.storyItem}
            >
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: ringColor,
                    borderWidth: isUnread ? 2.5 : 1.5,
                  },
                ]}
              >
                <Avatar displayName={tray.displayName || tray.username} size="md" />
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
                {tray.isSelf ? 'You' : tray.displayName.split(' ')[0]}
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
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    position: 'relative',
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 64,
  },
});
