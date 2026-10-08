import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { StoryService } from '../../services/story.service';

interface CreateStoryModalProps {
  visible: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Curated gaming and lifestyle photo presets for instant, gorgeous story creation
const STORY_PHOTO_PRESETS = [
  {
    id: 'ludo',
    name: 'Ludo Arena',
    url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'chess',
    name: 'Grandmaster',
    url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'arcade',
    name: 'Arcade Glow',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cards',
    name: 'Card Clash',
    url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'victory',
    name: 'Champion',
    url: 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'controller',
    name: 'Game Night',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
  },
];

const MOODS = [
  { id: 'hyped', label: '🔥 Hyped', gradient: ['#FF416C', '#8A2387'] },
  { id: 'victory', label: '🏆 Victorious', gradient: ['#F7971E', '#FFD200'] },
  { id: 'chill', label: '✨ Game Chill', gradient: ['#00B4DB', '#0083B0'] },
  { id: 'rival', label: '⚡ Challenge', gradient: ['#8E2DE2', '#4A00E0'] },
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  visible,
  onClose,
  onStoryCreated,
}) => {
  const { theme } = useTheme();
  const [selectedPhoto, setSelectedPhoto] = useState<string>(STORY_PHOTO_PRESETS[0].url);
  const [caption, setCaption] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>(MOODS[0].id);
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'FRIENDS'>('PUBLIC');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [customPhotoInput, setCustomPhotoInput] = useState<string>('');

  const activeMood = MOODS.find((m) => m.id === selectedMood) || MOODS[0];

  const handlePublish = async () => {
    const photoToUse = customPhotoInput.trim() || selectedPhoto;
    if (!photoToUse) return;

    try {
      setIsSubmitting(true);
      await StoryService.createStory(photoToUse, 'IMAGE', caption.trim() || undefined);
      setCaption('');
      setCustomPhotoInput('');
      onStoryCreated();
      onClose();
    } catch (err: any) {
      console.warn('Failed to publish story:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Icon name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Add to Story
          </Text>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={isSubmitting}
            style={[
              styles.publishBtn,
              { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.6 : 1 },
            ]}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishBtnText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Live Preview Card */}
          <View style={styles.previewSection}>
            <View style={[styles.previewCard, { borderColor: theme.colors.border }]}>
              <Image
                source={{ uri: customPhotoInput.trim() || selectedPhoto }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.previewGradient}
              >
                <View style={styles.moodPill}>
                  <Text style={styles.moodPillText}>{activeMood.label}</Text>
                </View>
                <Text style={styles.previewCaption} numberOfLines={2}>
                  {caption || 'Add your thoughts, invite friends, or share your victory!'}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Caption Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              STORY CAPTION
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="What's happening? (e.g. Ready for Ludo! 🎲)"
              placeholderTextColor={theme.colors.textMuted}
              value={caption}
              onChangeText={setCaption}
              maxLength={120}
              multiline
            />
          </View>

          {/* Mood / Vibe Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              CHOOSE MOOD
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowRail}>
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <TouchableOpacity
                    key={mood.id}
                    onPress={() => setSelectedMood(mood.id)}
                    style={[
                      styles.moodOption,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceElevated,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.moodOptionText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Choose Photo Presets */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              SELECT PHOTO
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowRail}>
              {STORY_PHOTO_PRESETS.map((preset) => {
                const isSelected = selectedPhoto === preset.url && !customPhotoInput.trim();
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => {
                      setSelectedPhoto(preset.url);
                      setCustomPhotoInput('');
                    }}
                    style={[
                      styles.photoThumbnailWrapper,
                      {
                        borderColor: isSelected ? theme.colors.primary : 'transparent',
                        borderWidth: isSelected ? 3 : 0,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: preset.url }} style={styles.photoThumbnail} />
                    <Text style={[styles.photoThumbnailText, { color: theme.colors.textSecondary }]}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Custom Photo URL Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              OR ENTER PHOTO URL
            </Text>
            <TextInput
              style={[
                styles.urlInput,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={theme.colors.textMuted}
              value={customPhotoInput}
              onChangeText={setCustomPhotoInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Privacy Switch */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              WHO CAN SEE THIS?
            </Text>
            <View style={styles.privacyRow}>
              <TouchableOpacity
                onPress={() => setPrivacy('PUBLIC')}
                style={[
                  styles.privacyBtn,
                  {
                    backgroundColor:
                      privacy === 'PUBLIC' ? theme.colors.primary : theme.colors.surfaceElevated,
                    borderColor:
                      privacy === 'PUBLIC' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Icon
                  name="eye"
                  size={16}
                  color={privacy === 'PUBLIC' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.privacyText,
                    { color: privacy === 'PUBLIC' ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPrivacy('FRIENDS')}
                style={[
                  styles.privacyBtn,
                  {
                    backgroundColor:
                      privacy === 'FRIENDS' ? theme.colors.primary : theme.colors.surfaceElevated,
                    borderColor:
                      privacy === 'FRIENDS' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Icon
                  name="users"
                  size={16}
                  color={privacy === 'FRIENDS' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.privacyText,
                    { color: privacy === 'FRIENDS' ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  Friends Only
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  publishBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewCard: {
    width: SCREEN_WIDTH - 64,
    height: (SCREEN_WIDTH - 64) * 1.3,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'flex-end',
  },
  moodPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  moodPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  previewCaption: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  urlInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  rowRail: {
    flexDirection: 'row',
  },
  moodOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  moodOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoThumbnailWrapper: {
    marginRight: 10,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  photoThumbnailText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
