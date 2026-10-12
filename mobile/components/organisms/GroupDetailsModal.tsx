import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { ChatService, GroupMetaItem, GroupMemberItem } from '../../services/chat.service';
import { FriendsService, FriendUser } from '../../services/friends.service';
import { ImagePickerService } from '../../services/imagePicker.service';

export interface GroupDetailsModalProps {
  visible: boolean;
  groupId: string;
  currentUserId: string;
  onClose: () => void;
  onGroupUpdated?: () => void;
  onGroupLeft?: () => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  visible,
  groupId,
  currentUserId,
  onClose,
  onGroupUpdated,
  onGroupLeft,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupMetaItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Editing group metadata
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Add members sub-flow
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<FriendUser[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Selected member action sheet
  const [selectedMember, setSelectedMember] = useState<GroupMemberItem | null>(null);

  const loadGroupDetails = async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      const data = await ChatService.fetchGroupDetails(groupId);
      setGroup(data);
      setEditTitle(data.title);
      setEditDesc(data.description || '');
    } catch (err) {
      console.warn('Failed to load group details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && groupId) {
      setIsEditing(false);
      setIsAddMembersOpen(false);
      setSelectedMember(null);
      loadGroupDetails();
    }
  }, [visible, groupId]);

  const isAdmin = group?.userRole === 'ADMIN' || group?.isAdmin;
  const isCreator = group?.creatorId === currentUserId;

  // Change Group Avatar
  const handlePickAvatar = async () => {
    if (!isAdmin) return;
    try {
      const result = await ImagePickerService.pickImageFromDevice({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result && !result.canceled && result.uri) {
        setIsSaving(true);
        await ChatService.updateGroup(groupId, { avatarUrl: result.uri });
        await loadGroupDetails();
        onGroupUpdated?.();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update group photo');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Title & Description
  const handleSaveInfo = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Required', 'Group name cannot be empty');
      return;
    }
    try {
      setIsSaving(true);
      await ChatService.updateGroup(groupId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      setIsEditing(false);
      await loadGroupDetails();
      onGroupUpdated?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update group details');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Members Drawer
  const handleOpenAddMembers = async () => {
    try {
      setIsAddMembersOpen(true);
      setIsLoadingFriends(true);
      setSelectedFriendIds(new Set());
      const allFriends = await FriendsService.fetchFriends();
      const currentMemberIds = new Set(group?.members.map((m) => m.userId) || []);
      const unadded = allFriends.filter((f) => !currentMemberIds.has(f.id));
      setAvailableFriends(unadded);
    } catch (err) {
      console.warn('Failed to load friends to add:', err);
      setAvailableFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const toggleSelectFriendToAdd = (fId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(fId)) {
        next.delete(fId);
      } else {
        next.add(fId);
      }
      return next;
    });
  };

  const handleConfirmAddMembers = async () => {
    if (selectedFriendIds.size === 0) return;
    try {
      setIsAddingMembers(true);
      await ChatService.addGroupMembers(groupId, Array.from(selectedFriendIds));
      setIsAddMembersOpen(false);
      await loadGroupDetails();
      onGroupUpdated?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add members');
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Remove Member
  const handleRemoveMember = (member: GroupMemberItem) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.displayName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSelectedMember(null);
              await ChatService.removeGroupMember(groupId, member.userId);
              await loadGroupDetails();
              onGroupUpdated?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove member');
            }
          },
        },
      ]
    );
  };

  // Toggle Role (Admin <-> Member)
  const handleToggleAdminRole = async (member: GroupMemberItem) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const actionLabel = newRole === 'ADMIN' ? 'Promote to Admin' : 'Dismiss as Admin';

    Alert.alert(
      actionLabel,
      `Are you sure you want to ${newRole === 'ADMIN' ? 'promote' : 'dismiss'} ${member.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSelectedMember(null);
              await ChatService.updateGroupMemberRole(groupId, member.userId, newRole);
              await loadGroupDetails();
              onGroupUpdated?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not change member role');
            }
          },
        },
      ]
    );
  };

  // Leave Group
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will no longer receive messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await ChatService.leaveGroup(groupId);
              onClose();
              onGroupLeft?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not leave group');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
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
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Group Info
              </Text>
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

          {isLoading && !group ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                Loading group details...
              </Text>
            </View>
          ) : !group ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Could not load group info.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Profile Card */}
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={isAdmin ? handlePickAvatar : undefined}
                  activeOpacity={isAdmin ? 0.75 : 1}
                  style={styles.avatarWrap}
                  disabled={isSaving}
                >
                  {group.avatarUrl ? (
                    <Image source={{ uri: group.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: theme.colors.primary + '22' },
                      ]}
                    >
                      <Icon name="users" size={36} color={theme.colors.primary} />
                    </View>
                  )}
                  {isAdmin && (
                    <View
                      style={[
                        styles.cameraBadge,
                        { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface },
                      ]}
                    >
                      <Icon name="camera" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {isEditing ? (
                  <View style={styles.editSection}>
                    <TextInput
                      style={[
                        styles.editTitleInput,
                        {
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Group Name"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TextInput
                      style={[
                        styles.editDescInput,
                        {
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      value={editDesc}
                      onChangeText={setEditDesc}
                      placeholder="Group Description (optional)"
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                    />
                    <View style={styles.editButtonsRow}>
                      <TouchableOpacity
                        onPress={() => setIsEditing(false)}
                        style={[styles.smallCancelBtn, { borderColor: theme.colors.border }]}
                      >
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveInfo}
                        style={[styles.smallSaveBtn, { backgroundColor: theme.colors.primary }]}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.metaSection}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.groupTitle, { color: theme.colors.textPrimary }]}>
                        {group.title}
                      </Text>
                      {isAdmin && (
                        <TouchableOpacity
                          onPress={() => setIsEditing(true)}
                          style={styles.editIconBtn}
                          activeOpacity={0.7}
                        >
                          <Icon name="edit" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {!!group.description && (
                      <Text style={[styles.groupDesc, { color: theme.colors.textSecondary }]}>
                        {group.description}
                      </Text>
                    )}
                    <Text style={[styles.groupMetaText, { color: theme.colors.textMuted }]}>
                      Group • {group.memberCount} members
                    </Text>
                  </View>
                )}
              </View>

              {/* Members Section Header */}
              <View style={styles.membersHeaderRow}>
                <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
                  GROUP MEMBERS ({group.members.length})
                </Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleOpenAddMembers}
                    style={[styles.addMemberBtn, { backgroundColor: theme.colors.primary + '18' }]}
                    activeOpacity={0.75}
                  >
                    <Icon name="plus" size={14} color={theme.colors.primary} />
                    <Text style={[styles.addMemberText, { color: theme.colors.primary }]}>
                      Add Friends
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Members List */}
              <View
                style={[
                  styles.membersCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {group.members.map((member, index) => {
                  const isLast = index === group.members.length - 1;
                  const isUser = member.userId === currentUserId;
                  const memberIsAdmin = member.role === 'ADMIN';

                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => {
                        if (isAdmin && !isUser) {
                          setSelectedMember(member);
                        }
                      }}
                      activeOpacity={isAdmin && !isUser ? 0.7 : 1}
                      style={[
                        styles.memberRow,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                      ]}
                    >
                      <Avatar
                        displayName={member.displayName}
                        avatarUrl={member.avatarUrl}
                        size="md"
                        status={member.isOnline ? 'online' : 'offline'}
                      />
                      <View style={styles.memberInfoCol}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberDisplayName, { color: theme.colors.textPrimary }]}>
                            {member.displayName} {isUser && '(You)'}
                          </Text>
                        </View>
                        <Text style={[styles.memberUsername, { color: theme.colors.textSecondary }]}>
                          @{member.username}
                        </Text>
                      </View>

                      {/* Role Pill */}
                      {memberIsAdmin ? (
                        <View
                          style={[
                            styles.adminBadge,
                            { backgroundColor: theme.colors.accentAmber + '22', borderColor: theme.colors.accentAmber },
                          ]}
                        >
                          <Icon name="crown" size={11} color={theme.colors.accentAmber} />
                          <Text style={[styles.adminBadgeText, { color: theme.colors.accentAmber }]}>
                            Admin
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.memberRoleText, { color: theme.colors.textMuted }]}>
                          Member
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Leave Group Action */}
              <TouchableOpacity
                onPress={handleLeaveGroup}
                style={[
                  styles.leaveGroupBtn,
                  {
                    borderColor: theme.colors.error + '44',
                    backgroundColor: theme.colors.surfaceElevated,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Icon name="logOut" size={18} color={theme.colors.error} />
                <Text style={[styles.leaveGroupText, { color: theme.colors.error }]}>
                  Exit Group
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Add Members Sub-Modal */}
          <Modal
            visible={isAddMembersOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setIsAddMembersOpen(false)}
          >
            <View style={styles.subModalOverlay}>
              <View
                style={[
                  styles.subModalCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={[styles.subModalHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.subModalTitle, { color: theme.colors.textPrimary }]}>
                    Add Friends to Group
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsAddMembersOpen(false)}
                    style={styles.closeBtn}
                  >
                    <Icon name="close" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {isLoadingFriends ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : availableFriends.length === 0 ? (
                  <View style={styles.emptyAddBox}>
                    <Text style={[styles.emptyAddText, { color: theme.colors.textMuted }]}>
                      All your current friends are already in this group!
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={styles.subModalScroll}>
                    {availableFriends.map((f) => {
                      const isSelected = selectedFriendIds.has(f.id);
                      return (
                        <TouchableOpacity
                          key={f.id}
                          onPress={() => toggleSelectFriendToAdd(f.id)}
                          style={[styles.addFriendRow, { borderBottomColor: theme.colors.border }]}
                          activeOpacity={0.7}
                        >
                          <Avatar
                            displayName={f.displayName}
                            avatarUrl={f.avatarUrl}
                            size="md"
                            status={f.isOnline ? 'online' : 'offline'}
                          />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.friendDisplayName, { color: theme.colors.textPrimary }]}>
                              {f.displayName}
                            </Text>
                            <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>
                              @{f.username}
                            </Text>
                          </View>
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
                  </ScrollView>
                )}

                <View style={[styles.subModalFooter, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    onPress={handleConfirmAddMembers}
                    disabled={selectedFriendIds.size === 0 || isAddingMembers}
                    style={[
                      styles.confirmAddBtn,
                      {
                        backgroundColor:
                          selectedFriendIds.size > 0
                            ? theme.colors.primary
                            : theme.colors.primary + '66',
                      },
                    ]}
                  >
                    {isAddingMembers ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmAddBtnText}>
                        Add ({selectedFriendIds.size}) Members
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Member Admin Actions Bottom Sheet */}
          {selectedMember && (
            <Modal
              visible={!!selectedMember}
              animationType="fade"
              transparent
              onRequestClose={() => setSelectedMember(null)}
            >
              <TouchableOpacity
                style={styles.sheetOverlay}
                activeOpacity={1}
                onPress={() => setSelectedMember(null)}
              >
                <View
                  style={[
                    styles.actionSheetCard,
                    { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.actionSheetTitle, { color: theme.colors.textPrimary }]}>
                    {selectedMember.displayName}
                  </Text>
                  <Text style={[styles.actionSheetSub, { color: theme.colors.textSecondary }]}>
                    @{selectedMember.username} • {selectedMember.role}
                  </Text>

                  {/* Make/Dismiss Admin */}
                  <TouchableOpacity
                    onPress={() => handleToggleAdminRole(selectedMember)}
                    style={[styles.sheetActionItem, { borderBottomColor: theme.colors.border }]}
                  >
                    <Icon
                      name="crown"
                      size={18}
                      color={selectedMember.role === 'ADMIN' ? theme.colors.textSecondary : theme.colors.accentAmber}
                    />
                    <Text style={[styles.sheetActionText, { color: theme.colors.textPrimary }]}>
                      {selectedMember.role === 'ADMIN' ? 'Dismiss as Admin' : 'Make Group Admin'}
                    </Text>
                  </TouchableOpacity>

                  {/* Remove from Group */}
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(selectedMember)}
                    style={styles.sheetActionItem}
                  >
                    <Icon name="userX" size={18} color={theme.colors.error} />
                    <Text style={[styles.sheetActionText, { color: theme.colors.error }]}>
                      Remove from Group
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </View>
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
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  errorBox: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  profileCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaSection: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  editIconBtn: {
    padding: 4,
  },
  groupDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  groupMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  editSection: {
    width: '100%',
    gap: 10,
  },
  editTitleInput: {
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editDescInput: {
    fontSize: 13,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 50,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  smallCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  addMemberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  membersCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  memberInfoCol: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberDisplayName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberUsername: {
    fontSize: 11,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberRoleText: {
    fontSize: 12,
  },
  leaveGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  leaveGroupText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subModalScroll: {
    paddingHorizontal: 16,
    maxHeight: 320,
  },
  emptyAddBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyAddText: {
    fontSize: 13,
    textAlign: 'center',
  },
  addFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
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
  subModalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmAddBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  actionSheetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionSheetSub: {
    fontSize: 12,
    marginBottom: 6,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
