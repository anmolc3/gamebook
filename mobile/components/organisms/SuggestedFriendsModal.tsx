import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { FriendsService, SuggestedPlayer } from '../../services/friends.service';

export interface SuggestedFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export const SuggestedFriendsModal: React.FC<SuggestedFriendsModalProps> = ({
  visible,
  onClose,
  onViewProfile,
}) => {
  const { theme } = useTheme();

  const [suggestions, setSuggestions] = useState<SuggestedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadSuggestions();
    }
  }, [visible]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await FriendsService.fetchSuggestedFriends(12);
      setSuggestions(data);
    } catch (err) {
      console.warn('Failed to load suggested friends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(targetUserId);
    try {
      await FriendsService.sendRequest(targetUserId);
      setSentMap((prev) => ({ ...prev, [targetUserId]: true }));
    } catch (err: any) {
      console.warn('Failed to send friend request:', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddAll = async () => {
    const unadded = suggestions.filter(
      (s) => s.relationship === 'NONE' && !sentMap[s.id]
    );
    for (const player of unadded) {
      try {
        await FriendsService.sendRequest(player.id);
        setSentMap((prev) => ({ ...prev, [player.id]: true }));
      } catch (e) {
        // Continue adding others
      }
    }
  };

  const pendingCount = suggestions.filter(
    (s) => s.relationship === 'NONE' && !sentMap[s.id]
  ).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <SafeAreaView style={styles.sheetContainer}>
          <View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.radius.sheet,
                borderTopRightRadius: theme.radius.sheet,
                borderColor: theme.colors.border,
              },
              theme.shadows.modal,
            ]}
          >
            {/* Grab Handle */}
            <View style={styles.grabHandleWrapper}>
              <View
                style={[
                  styles.grabHandle,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            </View>

            {/* Header Banner */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.brandIcon}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Welcome to the Arena! 👋
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.primary }]}>
                People You May Know & Players Near You
              </Text>
              <View
                style={[
                  styles.bannerCallout,
                  {
                    backgroundColor: theme.colors.primary + '14',
                    borderColor: theme.colors.primary + '33',
                  },
                ]}
              >
                <Icon name="users" size={16} color={theme.colors.primary} />
                <Text style={[styles.calloutText, { color: theme.colors.primary }]}>
                  Add friends to see feeds and play with them!
                </Text>
              </View>
            </View>

            {/* Player List */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                  Finding gamers around you...
                </Text>
              </View>
            ) : suggestions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="users" size={32} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  You're among the first players in this area!
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollList}
                contentContainerStyle={styles.scrollContent}
              >
                {suggestions.map((player) => {
                  const isSent = sentMap[player.id] || player.relationship === 'REQUEST_SENT';
                  const isFriends = player.relationship === 'FRIENDS';

                  return (
                    <View
                      key={player.id}
                      style={[
                        styles.playerCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.playerMetaRow}
                        onPress={() => onViewProfile?.(player.id)}
                        activeOpacity={0.7}
                      >
                        <Avatar
                          displayName={player.displayName}
                          avatarUrl={player.avatarUrl}
                          size="md"
                          status={player.isOnline ? 'online' : 'offline'}
                        />
                        <View style={styles.playerInfo}>
                          <Text
                            style={[styles.displayName, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {player.displayName}
                          </Text>
                          <Text style={[styles.username, { color: theme.colors.textMuted }]}>
                            @{player.username}
                          </Text>
                          <View style={styles.tagBadge}>
                            <Text style={[styles.tagBadgeText, { color: theme.colors.accent }]}>
                              {player.suggestionReason || 'Lives Near You 📍'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Action Button */}
                      {isFriends ? (
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: theme.colors.success + '18' },
                          ]}
                        >
                          <Icon name="check" size={13} color={theme.colors.success} />
                          <Text style={[styles.statusPillText, { color: theme.colors.success }]}>
                            Friends
                          </Text>
                        </View>
                      ) : isSent ? (
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          ]}
                        >
                          <Icon name="check" size={13} color={theme.colors.textMuted} />
                          <Text style={[styles.statusPillText, { color: theme.colors.textMuted }]}>
                            Sent
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
                          onPress={() => handleAddFriend(player.id)}
                          disabled={actionLoadingId === player.id}
                          activeOpacity={0.8}
                        >
                          {actionLoadingId === player.id ? (
                            <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                          ) : (
                            <>
                              <Icon name="userPlus" size={14} color={theme.colors.textOnPrimary} />
                              <Text style={[styles.addBtnText, { color: theme.colors.textOnPrimary }]}>
                                Add
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Bottom Actions */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              {pendingCount > 1 && (
                <TouchableOpacity
                  style={[
                    styles.addAllBtn,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleAddAll}
                  activeOpacity={0.8}
                >
                  <Icon name="userCheck" size={16} color={theme.colors.primary} />
                  <Text style={[styles.addAllBtnText, { color: theme.colors.primary }]}>
                    Add All ({pendingCount})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: theme.colors.primary }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.continueBtnText, { color: theme.colors.textOnPrimary }]}>
                  Continue to Arena
                </Text>
                <Icon name="chevronRight" size={16} color={theme.colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '92%',
  },
  content: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '100%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  brandIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  bannerCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  calloutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  scrollList: {
    maxHeight: 380,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playerInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '800',
  },
  username: {
    fontSize: 11,
    marginTop: 1,
  },
  tagBadge: {
    marginTop: 3,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  addAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  addAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
