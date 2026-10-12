import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { FriendsService, FriendUser } from '../../services/friends.service';
import { ChatService } from '../../services/chat.service';
import { ImagePickerService } from '../../services/imagePicker.service';

export interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load friends on modal open
  useEffect(() => {
    if (visible) {
      setGroupTitle('');
      setGroupDescription('');
      setGroupAvatarUri(null);
      setSelectedIds(new Set());
      setSearchQuery('');

      setIsLoadingFriends(true);
      FriendsService.fetchFriends()
        .then((data) => setFriends(data || []))
        .catch((err) => {
          console.warn('Failed to fetch friends for group creation:', err);
          setFriends([]);
        })
        .finally(() => setIsLoadingFriends(false));
    }
  }, [visible]);

  // Toggle friend selection
  const toggleSelectFriend = (friendId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  // Image Picker for Group Avatar
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePickerService.pickImageFromDevice({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result && !result.canceled && result.uri) {
        setGroupAvatarUri(result.uri);
      }
    } catch (err) {
      console.warn('Group avatar pick error:', err);
    }
  };

  // Filtered friends
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  // Selected friends objects
  const selectedFriendsList = useMemo(() => {
    return friends.filter((f) => selectedIds.has(f.id));
  }, [friends, selectedIds]);

  // Create Group submission
  const handleCreateGroup = async () => {
    const trimmedTitle = groupTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('Group Name Required', 'Please provide a name for your group.');
      return;
    }

    if (selectedIds.size === 0) {
      Alert.alert('Add Members', 'Please select at least one friend to add to the group.');
      return;
    }

    try {
      setIsCreating(true);
      const newGroup = await ChatService.createGroup(
        trimmedTitle,
        Array.from(selectedIds),
        groupDescription.trim() || undefined,
        groupAvatarUri || undefined
      );

      onClose();
      onGroupCreated(newGroup);
    } catch (err: any) {
      Alert.alert('Group Creation Failed', err.message || 'Could not create group.');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = groupTitle.trim().length > 0 && selectedIds.size > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: theme.colors.surface,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Icon name="users" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                    Create New Group
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                    Chat, game & challenge multiple friends
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                activeOpacity={0.7}
                accessibilityLabel="Close"
              >
                <Icon name="close" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Top Avatar & Name Section */}
              <View style={styles.topInfoSection}>
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                  style={styles.avatarTouchable}
                  accessibilityLabel="Pick Group Photo"
                >
                  {groupAvatarUri ? (
                    <Image source={{ uri: groupAvatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Icon name="camera" size={26} color={theme.colors.primary} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.avatarBadge,
                      { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface },
                    ]}
                  >
                    <Icon name="plus" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.inputsColumn}>
                  <View
                    style={[
                      styles.textInputWrap,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                      placeholder="Group Name *"
                      placeholderTextColor={theme.colors.textMuted}
                      value={groupTitle}
                      onChangeText={setGroupTitle}
                      maxLength={100}
                    />
                  </View>

                  <View
                    style={[
                      styles.textInputWrap,
                      styles.descInputWrap,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                      placeholder="Group Description (optional)"
                      placeholderTextColor={theme.colors.textMuted}
                      value={groupDescription}
                      onChangeText={setGroupDescription}
                      maxLength={300}
                      multiline
                    />
                  </View>
                </View>
              </View>

              {/* Selected Friends Preview Tray */}
              {selectedFriendsList.length > 0 && (
                <View style={styles.selectedSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                      SELECTED FRIENDS ({selectedFriendsList.length})
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectedChipsScroll}
                  >
                    {selectedFriendsList.map((friend) => (
                      <View
                        key={friend.id}
                        style={[
                          styles.selectedFriendChip,
                          {
                            backgroundColor: theme.colors.surfaceElevated,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Avatar
                          displayName={friend.displayName}
                          avatarUrl={friend.avatarUrl}
                          size="sm"
                        />
                        <Text
                          style={[styles.selectedChipText, { color: theme.colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {friend.displayName.split(' ')[0]}
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleSelectFriend(friend.id)}
                          activeOpacity={0.7}
                          style={[styles.removeChipBtn, { backgroundColor: theme.colors.surface }]}
                        >
                          <Icon name="close" size={10} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Friends Search Input */}
              <View style={styles.friendsSectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  SELECT FRIENDS
                </Text>
              </View>

              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Icon name="search" size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                  placeholder="Search friends by name or username..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <Icon name="close" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Friends List */}
              {isLoadingFriends ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                    Loading friends list...
                  </Text>
                </View>
              ) : friends.length === 0 ? (
                <View
                  style={[
                    styles.emptyFriendsCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Icon name="users" size={28} color={theme.colors.primary} />
                  <Text style={[styles.emptyFriendsTitle, { color: theme.colors.textPrimary }]}>
                    No Friends Yet
                  </Text>
                  <Text style={[styles.emptyFriendsSubtitle, { color: theme.colors.textSecondary }]}>
                    Add friends from the Social tab first to create a group with them!
                  </Text>
                </View>
              ) : filteredFriends.length === 0 ? (
                <View style={styles.emptySearchBox}>
                  <Text style={[styles.emptySearchText, { color: theme.colors.textMuted }]}>
                    No friends matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.friendsListCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {filteredFriends.map((friend, idx) => {
                    const isSelected = selectedIds.has(friend.id);
                    const isLast = idx === filteredFriends.length - 1;

                    return (
                      <TouchableOpacity
                        key={friend.id}
                        onPress={() => toggleSelectFriend(friend.id)}
                        style={[
                          styles.friendRow,
                          !isLast && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Avatar
                          displayName={friend.displayName}
                          avatarUrl={friend.avatarUrl}
                          size="md"
                          status={friend.isOnline ? 'online' : 'offline'}
                        />
                        <View style={styles.friendInfoWrap}>
                          <Text style={[styles.friendDisplayName, { color: theme.colors.textPrimary }]}>
                            {friend.displayName}
                          </Text>
                          <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>
                            @{friend.username}
                          </Text>
                        </View>

                        {/* Checkbox circle */}
                        <View
                          style={[
                            styles.checkboxCircle,
                            isSelected
                              ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                              : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                          ]}
                        >
                          {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.footerRow, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.cancelBtn,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceElevated,
                  },
                ]}
                activeOpacity={0.7}
                disabled={isCreating}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={!isFormValid || isCreating}
                style={[
                  styles.createBtn,
                  {
                    backgroundColor: isFormValid ? theme.colors.primary : theme.colors.primary + '66',
                  },
                ]}
                activeOpacity={0.85}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.createBtnText}>
                      Create Group ({selectedIds.size})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    maxHeight: '92%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  topInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputsColumn: {
    flex: 1,
    gap: 8,
  },
  textInputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  descInputWrap: {
    minHeight: 40,
  },
  input: {
    fontSize: 14,
    padding: 0,
  },
  selectedSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  selectedChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  selectedFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },
  removeChipBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsSectionHeader: {
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyFriendsCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyFriendsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyFriendsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptySearchBox: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 12,
  },
  friendsListCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  friendInfoWrap: {
    flex: 1,
    gap: 2,
  },
  friendDisplayName: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendUsername: {
    fontSize: 11,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
