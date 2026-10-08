import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { PRESET_AVATARS, PresetAvatar } from '../atoms/AvatarPresets';
import { ProfileService, UpdateProfilePayload, UserProfile } from '../../services/profile.service';
import { ImagePickerService } from '../../services/imagePicker.service';

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

type AvatarCategory = 'All' | 'Gaming' | 'Heroes' | 'Cosmic' | 'Mythic' | 'Legends';

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  currentProfile,
  onProfileUpdated,
}) => {
  const { theme } = useTheme();

  const [displayName, setDisplayName] = useState(currentProfile.displayName || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    currentProfile.avatarUrl || 'neon_masked_gamer_avatar'
  );
  const [selectedBanner, setSelectedBanner] = useState<string | null>(
    currentProfile.bannerUrl || null
  );
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pick avatar image from device local storage
  const handlePickAvatarFromDevice = async () => {
    const result = await ImagePickerService.pickImageFromDevice({
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result && !result.canceled && result.uri) {
      setSelectedAvatar(result.uri);
    }
  };

  // Pick profile background / cover image from device local storage
  const handlePickBannerFromDevice = async () => {
    const result = await ImagePickerService.pickImageFromDevice({
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result && !result.canceled && result.uri) {
      setSelectedBanner(result.uri);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg('Display name must be at least 2 characters.');
      return;
    }

    if (displayName.trim().length > 30) {
      setErrorMsg('Display name cannot exceed 30 characters.');
      return;
    }

    if (bio.length > 200) {
      setErrorMsg('Bio cannot exceed 200 characters.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const payload: UpdateProfilePayload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: selectedAvatar,
        bannerUrl: selectedBanner,
      };

      const refreshed = await ProfileService.updateMyProfile(payload);
      onProfileUpdated(refreshed);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAvatars =
    selectedCategory === 'All'
      ? PRESET_AVATARS
      : PRESET_AVATARS.filter((a) => a.category === selectedCategory);

  const categories: AvatarCategory[] = ['All', 'Gaming', 'Heroes', 'Cosmic', 'Mythic', 'Legends'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleContainer}>
              <Icon name="edit" size={20} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Edit Profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.colors.surfaceElevated }]}
              activeOpacity={0.7}
              accessibilityLabel="Close edit profile modal"
            >
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Live Avatar Preview & Device Upload Action */}
            <View style={styles.previewSection}>
              <View
                style={[
                  styles.previewAvatarRing,
                  { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceElevated },
                ]}
              >
                <PresetAvatar presetId={selectedAvatar} size={84} />
              </View>

              <TouchableOpacity
                onPress={handlePickAvatarFromDevice}
                style={styles.deviceUploadBtn}
                activeOpacity={0.8}
                accessibilityLabel="Upload Custom Avatar"
              >
                <Icon name="camera" size={26} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Profile Cover Background Image Selector */}
            <View style={styles.bannerPickerSection}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Profile Background Image
                </Text>
                {selectedBanner && (
                  <TouchableOpacity onPress={() => setSelectedBanner(null)}>
                    <Text style={[styles.charCounter, { color: theme.colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedBanner ? (
                <View style={[styles.bannerPreviewWrap, { borderColor: theme.colors.border }]}>
                  <Image source={{ uri: selectedBanner }} style={styles.bannerPreviewImg} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={handlePickBannerFromDevice}
                    style={styles.bannerChangeOverlayBtn}
                    activeOpacity={0.8}
                    accessibilityLabel="Change Background"
                  >
                    <Icon name="camera" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickBannerFromDevice}
                  style={styles.bannerEmptyPlaceholder}
                  activeOpacity={0.8}
                  accessibilityLabel="Add Background"
                >
                  <Icon name="camera" size={30} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Avatar Category Filters */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Choose from 20 Curated Avatars
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsRow}
              >
                {categories.map((cat) => {
                  const isCatSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isCatSelected ? theme.colors.primary : theme.colors.surfaceElevated,
                          borderColor: isCatSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          {
                            color: isCatSelected ? theme.colors.textOnPrimary : theme.colors.textSecondary,
                            fontWeight: isCatSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Avatar Preset Grid */}
              <View style={styles.avatarGrid}>
                {filteredAvatars.map((preset) => {
                  const isSelected = selectedAvatar === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => setSelectedAvatar(preset.id)}
                      style={[
                        styles.avatarOptionCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2.5 : 1,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <PresetAvatar presetId={preset.id} size={50} />
                      <Text
                        style={[
                          styles.avatarOptionName,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Display Name Input */}
            <View style={[styles.inputGroup, { marginTop: 20 }]}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Display Name
                </Text>
                <Text style={[styles.charCounter, { color: theme.colors.textMuted }]}>
                  {displayName.length}/30
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your gamer tag"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={30}
              />
            </View>

            {/* Bio Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Player Bio / Status Quote
                </Text>
                <Text style={[styles.charCounter, { color: theme.colors.textMuted }]}>
                  {bio.length}/200
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  styles.bioInput,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell players about your strategy style, achievements, or favorite games..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
                textAlignVertical="top"
              />
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '18' }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMsg}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.7 : 1 },
                ]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.background} size="small" />
                ) : (
                  <>
                    <Icon name="check" size={18} color={theme.colors.background} />
                    <Text style={[styles.saveButtonText, { color: theme.colors.background }]}>
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewAvatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceUploadBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPickerSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  bannerPreviewWrap: {
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  bannerPreviewImg: {
    width: '100%',
    height: '100%',
  },
  bannerChangeOverlayBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    padding: 6,
  },
  bannerEmptyPlaceholder: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  avatarOptionCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    gap: 6,
  },
  avatarOptionName: {
    fontSize: 11,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  charCounter: {
    fontSize: 11,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  bioInput: {
    height: 84,
    paddingTop: 12,
    paddingBottom: 12,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    marginTop: 8,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
