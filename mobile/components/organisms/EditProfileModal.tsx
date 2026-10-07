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
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { PRESET_AVATARS, PresetAvatar } from '../atoms/AvatarPresets';
import { ProfileService, UpdateProfilePayload, UserProfile } from '../../services/profile.service';

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

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
    currentProfile.avatarUrl || 'cyber_ninja'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      };

      await ProfileService.updateMyProfile(payload);
      const refreshed = await ProfileService.fetchMyProfile();
      onProfileUpdated(refreshed);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

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
            {/* Live Avatar Preview */}
            <View style={styles.previewSection}>
              <View
                style={[
                  styles.previewAvatarRing,
                  { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceElevated },
                ]}
              >
                <PresetAvatar presetId={selectedAvatar} size={80} />
              </View>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Select Character Avatar
              </Text>

              {/* Avatar Preset Grid */}
              <View style={styles.avatarGrid}>
                {PRESET_AVATARS.map((preset) => {
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
                      <PresetAvatar presetId={preset.id} size={44} />
                      <Text
                        style={[
                          styles.avatarOptionName,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.textMuted,
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
            <View style={styles.inputGroup}>
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

              <TouchableOpacity
                onPress={onClose}
                disabled={isSaving}
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
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
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 20,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewAvatarRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 2.5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 12,
  },
  avatarOptionCard: {
    width: 88,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  avatarOptionName: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  charCounter: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  bioInput: {
    height: 85,
    paddingTop: 12,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButtons: {
    gap: 10,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
