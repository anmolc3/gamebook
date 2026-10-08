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
} from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../../components/atoms/Avatar';
import { CloseIcon, SendIcon, TrophyIcon, HeartIcon } from '../../icons';
import { StoryTrayItem } from '../../components/organisms/StoryBar';

interface StoryViewerModalProps {
  visible: boolean;
  tray: StoryTrayItem | null;
  onClose: () => void;
  onReply?: (storyId: string, message: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  tray,
  onClose,
  onReply,
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

  if (!visible || !tray || tray.stories.length === 0) return null;

  const currentStory = tray.stories[currentIndex] || tray.stories[0];
  const totalStories = tray.stories.length;

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.storyCard, { backgroundColor: '#1E2D34' }]}>
          {/* Top Progress Segmented Bars */}
          <View style={styles.progressBarContainer}>
            {tray.stories.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.progressBarSegment,
                  {
                    backgroundColor:
                      idx <= currentIndex ? theme.colors.primary : 'rgba(255,255,255,0.25)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.authorInfo}>
              <Avatar displayName={tray.displayName || tray.username} size="sm" />
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

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <CloseIcon size={22} color="#FFFFFF" />
            </TouchableOpacity>
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

            {/* Celebratory Graphic Card */}
            <View style={styles.celebrationCard}>
              <View style={styles.trophyGlow}>
                <TrophyIcon size={56} color="#3ED598" />
              </View>
              <Text style={styles.matchVictoryTitle}>MATCH HIGHLIGHT</Text>
              <Text style={styles.matchSubtitle}>24h Ephemeral Platform Reel</Text>
              {currentStory.caption && (
                <View style={styles.captionBubble}>
                  <Text style={styles.captionText}>{currentStory.caption}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Reply Bar (if not own story) */}
          {!tray.isSelf && (
            <View style={styles.bottomReplyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${tray.displayName.split(' ')[0]}...`}
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
                  onPress={() => onReply && onReply(currentStory.id, 'Congrats!')}
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
  closeBtn: {
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
