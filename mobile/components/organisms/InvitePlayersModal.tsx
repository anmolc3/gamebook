import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { FriendsService, FriendUser } from '../../services/friends.service';
import { MobileSocketService } from '../../services/socket.service';
import { Avatar } from '../atoms/Avatar';
import { GameLogo } from '../atoms/GameLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);

export interface InvitePlayersModalProps {
  visible: boolean;
  roomCode: string;
  gameType: string;
  gameName?: string;
  onClose: () => void;
  onInvited?: (friendId: string) => void;
}

export const InvitePlayersModal: React.FC<InvitePlayersModalProps> = ({
  visible,
  roomCode,
  gameType,
  gameName = 'Multiplayer Game',
  onClose,
  onInvited,
}) => {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (visible) {
      loadFriends();
    } else {
      setSearchQuery('');
      setToastMessage(null);
    }
  }, [visible]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const list = await FriendsService.fetchFriends();
      // Sort online friends to the top
      const sorted = [...list].sort((a, b) => {
        if (a.isOnline === b.isOnline) return 0;
        return a.isOnline ? -1 : 1;
      });
      setFriends(sorted);
    } catch (err: any) {
      console.warn('Could not load friends for invite:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.trim().toLowerCase();
    return friends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(query) ||
        f.username.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const handleCopyCode = () => {
    showToast(`Code #${roomCode} copied!`);
  };

  const handleShareNative = async () => {
    try {
      await Share.share({
        title: `Join ${gameName} on GameBook`,
        message: `🎮 Let's play ${gameName} together on GameBook! Join my lobby with room code: ${roomCode}`,
      });
    } catch (err) {
      console.warn('Share sheet error:', err);
    }
  };

  const handleSendInvite = async (friend: FriendUser) => {
    if (invitedMap[friend.id] || invitingId) return;

    setInvitingId(friend.id);
    try {
      const res = await MobileSocketService.sendGameInvite(
        friend.id,
        roomCode,
        gameType,
        gameName
      );

      if (res.success) {
        setInvitedMap((prev) => ({ ...prev, [friend.id]: true }));
        showToast(`Invite sent to ${friend.displayName}!`);
        onInvited?.(friend.id);
      } else {
        showToast(res.error || 'Failed to send invite');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not send invite');
    } finally {
      setInvitingId(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <GameLogo
                gameType={gameType}
                size={44}
                borderRadius={10}
                fallbackIcon="users"
              />
              <View style={styles.headerTexts}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.headerTitle}>Invite Players</Text>
                </View>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {gameName} • Room #{roomCode}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#94A3B8"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Quick Room Code & Native Share Strip */}
          <View style={styles.shareStrip}>
            <View style={styles.roomCodePill}>
              <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
              <Text style={styles.roomCodeValue}>{roomCode}</Text>
            </View>

            <View style={styles.shareActionsRow}>
              {/* Copy Code Button */}
              <TouchableOpacity
                style={styles.shareActionBtn}
                onPress={handleCopyCode}
                activeOpacity={0.75}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Rect x="9" y="9" width="13" height="13" rx="2" stroke="#CBD5E1" strokeWidth="2" />
                  <Path
                    d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.shareActionBtnText}>Copy</Text>
              </TouchableOpacity>

              {/* Native System Share Sheet */}
              <TouchableOpacity
                style={[styles.shareActionBtn, styles.shareActionBtnGold]}
                onPress={handleShareNative}
                activeOpacity={0.75}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Circle cx="18" cy="5" r="3" stroke="#080E13" strokeWidth="2" />
                  <Circle cx="6" cy="12" r="3" stroke="#080E13" strokeWidth="2" />
                  <Circle cx="18" cy="19" r="3" stroke="#080E13" strokeWidth="2" />
                  <Path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="#080E13" strokeWidth="2" />
                </Svg>
                <Text style={styles.shareActionBtnGoldText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast Notification Alert */}
          {toastMessage && (
            <View style={styles.toastWrap}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          {/* Search Friends Filter */}
          <View style={styles.searchRow}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx="11" cy="11" r="8" stroke="#64748B" strokeWidth="2" />
              <Path d="M21 21L16.65 16.65" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Friends List */}
          <View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color="#FFB800" />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="1.8" />
                  <Path d="M8 15C8.5 13.5 10 12.5 12 12.5C14 12.5 15.5 13.5 16 15" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
                  <Circle cx="9" cy="9.5" r="1.5" fill="#334155" />
                  <Circle cx="15" cy="9.5" r="1.5" fill="#334155" />
                </Svg>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching friends' : 'No friends found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try searching with another name or username'
                    : 'Share the room code above with your friends to play together!'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isInvited = !!invitedMap[item.id];
                  const isInvitingThis = invitingId === item.id;

                  return (
                    <View style={styles.friendRow}>
                      {/* Avatar with Online/Offline indicator */}
                      <View style={styles.avatarWrap}>
                        <Avatar
                          displayName={item.displayName}
                          avatarUrl={item.avatarUrl}
                          size="sm"
                          status={item.isOnline ? 'online' : 'offline'}
                        />
                      </View>

                      {/* Info */}
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        <View style={styles.friendMetaRow}>
                          <Text style={styles.friendUsername} numberOfLines={1}>
                            @{item.username}
                          </Text>
                          <Text style={styles.metaDot}>•</Text>
                          <Text
                            style={[
                              styles.friendPresence,
                              item.isOnline && styles.friendPresenceOnline,
                            ]}
                          >
                            {item.isOnline ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                      </View>

                      {/* Invite Button */}
                      <TouchableOpacity
                        style={[
                          styles.inviteButton,
                          isInvited && styles.inviteButtonSent,
                          isInvitingThis && styles.inviteButtonLoading,
                        ]}
                        onPress={() => handleSendInvite(item)}
                        disabled={isInvited || isInvitingThis}
                        activeOpacity={0.8}
                      >
                        {isInvitingThis ? (
                          <ActivityIndicator size="small" color="#080E13" />
                        ) : isInvited ? (
                          <View style={styles.invitedBtnContent}>
                            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                              <Polyline points="20 6 9 17 4 12" stroke="#10B981" strokeWidth={3} strokeLinecap="round" />
                            </Svg>
                            <Text style={styles.invitedBtnText}>SENT</Text>
                          </View>
                        ) : (
                          <Text style={styles.inviteBtnText}>INVITE</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 99999,
  },
  modalCard: {
    width: MODAL_WIDTH,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.82, 600),
    backgroundColor: '#111822',
    borderColor: '#1D2838',
    borderWidth: 1.5,
    borderRadius: 26,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTexts: {
    flex: 1,
    gap: 4,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E9CAE',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  shareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0F16',
    borderWidth: 1,
    borderColor: '#1D2838',
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  roomCodePill: {
    gap: 2,
    paddingLeft: 4,
  },
  roomCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  roomCodeValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFB800',
    letterSpacing: 2,
  },
  shareActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  shareActionBtnGold: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  shareActionBtnGoldText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080E13',
  },
  toastWrap: {
    backgroundColor: '#10B98125',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090F16',
    borderWidth: 1.2,
    borderColor: '#243245',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchClearText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  listContainer: {
    maxHeight: 280,
    minHeight: 160,
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#8E9CAE',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1520',
    borderWidth: 1,
    borderColor: '#1A2534',
    borderRadius: 16,
    padding: 10,
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  friendUsername: {
    fontSize: 12,
    color: '#8E9CAE',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: '#475569',
  },
  friendPresence: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  friendPresenceOnline: {
    color: '#10B981',
  },
  inviteButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
  },
  inviteButtonSent: {
    backgroundColor: '#10B98118',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  inviteButtonLoading: {
    opacity: 0.6,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080E13',
    letterSpacing: 0.5,
  },
  invitedBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invitedBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
});
