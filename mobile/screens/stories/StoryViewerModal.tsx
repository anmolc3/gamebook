import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../../components/atoms/Avatar';
import { CloseIcon, SendIcon, TrophyIcon, HeartIcon, Icon } from '../../icons';
import { StoryTrayItem } from '../../components/organisms/StoryBar';
import { StoryService } from '../../services/story.service';

interface StoryViewerModalProps {
  visible: boolean;
  tray: StoryTrayItem | null;
  onClose: () => void;
  onReply?: (storyId: string, message: string) => void;
  onStoryDeleted?: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  tray,
  onClose,
  onReply,
  onStoryDeleted,
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setReplyText('');
    }
  }, [visible, tray]);

  const currentStory = tray?.stories?.[currentIndex] || tray?.stories?.[0];
  const totalStories = tray?.stories?.length || 0;

  // Mark story as viewed when opened
  useEffect(() => {
    if (visible && currentStory?.id && !tray?.isSelf && !currentStory.hasViewed) {
      StoryService.viewStory(currentStory.id).catch(() => {});
      currentStory.hasViewed = true;
    }
  }, [visible, currentStory?.id, tray?.isSelf]);

  if (!visible || !tray || totalStories === 0 || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < totalStories - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSendReply = () => {
    if (replyText.trim() && onReply) {
      onReply(currentStory.id, replyText.trim());
      setReplyText('');
      onClose();
    }
  };

  const handleDeleteStory = () => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StoryService.deleteStory(currentStory.id);
              if (onStoryDeleted) onStoryDeleted();
              if (totalStories <= 1) {
                onClose();
              } else {
                tray.stories.splice(currentIndex, 1);
                setCurrentIndex((i) => Math.min(i, tray.stories.length - 1));
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete story');
            }
          },
        },
      ]
    );
  };

  const hasMediaImage =
    currentStory.mediaUrl &&
    (currentStory.mediaType === 'IMAGE' ||
      currentStory.mediaUrl.startsWith('http://') ||
      currentStory.mediaUrl.startsWith('https://') ||
      currentStory.mediaUrl.startsWith('data:') ||
      currentStory.mediaUrl.startsWith('file:'));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={[styles.storyCard, { backgroundColor: '#161922' }]}>
          {/* Top Progress Segmented Bars */}
          <View style={styles.progressBarContainer}>
            {tray.stories.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.progressBarSegment,
                  {
                    backgroundColor:
                      idx <= currentIndex ? (theme.colors.accentPink || theme.colors.primary) : 'rgba(255,255,255,0.25)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.authorInfo}>
              <Avatar
                displayName={tray.displayName || tray.username}
                avatarUrl={tray.avatarUrl}
                size="sm"
                fallbackToOtter={true}
              />
              <View style={styles.authorText}>
                <Text style={styles.displayName}>{tray.displayName || tray.username}</Text>
                <Text style={styles.timeText}>
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {tray.isSelf && (
                <TouchableOpacity
                  onPress={handleDeleteStory}
                  style={styles.headerBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Delete story"
                >
                  <Icon name="trash" size={20} color="#FF575F" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerBtn}
                activeOpacity={0.7}
                accessibilityLabel="Close story"
              >
                <CloseIcon size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Story Visual Center Stage */}
          <View style={styles.centerStage}>
            {/* Tap areas for next / previous */}
            <TouchableOpacity
              style={styles.leftTapArea}
              onPress={handlePrev}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.rightTapArea}
              onPress={handleNext}
              activeOpacity={1}
            />

            {/* Real Story Visual Display */}
            {hasMediaImage ? (
              <View style={styles.imageCard}>
                <Image
                  source={{ uri: currentStory.mediaUrl }}
                  style={styles.storyFullImage}
                  resizeMode="cover"
                />
                {currentStory.caption ? (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText}>{currentStory.caption}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.celebrationCard}>
                <View style={styles.trophyGlow}>
                  <TrophyIcon size={56} />
                </View>
                <Text style={styles.matchVictoryTitle}>STORY HIGHLIGHT</Text>
                <Text style={styles.matchSubtitle}>Otter 24h Community Reel</Text>
                {currentStory.caption && (
                  <View style={styles.captionBubble}>
                    <Text style={styles.captionText}>{currentStory.caption}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Bottom Reply Bar (if not own story) */}
          {!tray.isSelf && (
            <View style={styles.bottomReplyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${(tray.displayName || tray.username).split(' ')[0]}...`}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
              />
              {replyText.trim().length > 0 ? (
                <TouchableOpacity
                  onPress={handleSendReply}
                  style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                >
                  <SendIcon size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onReply && onReply(currentStory.id, 'Congrats! 🔥')}
                  style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                >
                  <HeartIcon size={20} color="#FF6584" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  storyCard: {
    width: '100%',
    maxWidth: 420,
    height: '84%',
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorText: {
    justifyContent: 'center',
  },
  displayName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    zIndex: 5,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    zIndex: 5,
  },
  imageCard: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0B0D14',
    justifyContent: 'flex-end',
  },
  storyFullImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  captionOverlay: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 14,
    zIndex: 2,
  },
  celebrationCard: {
    backgroundColor: '#161922',
    width: '88%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 0,
  },
  trophyGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(62, 213, 152, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  matchVictoryTitle: {
    color: '#3ED598',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  matchSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 16,
  },
  captionBubble: {
    backgroundColor: '#1E232E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomReplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
    paddingTop: 8,
  },
  replyInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 13,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

