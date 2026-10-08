import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { NotificationIcon } from '../atoms/NotificationIcon';

export interface InAppNotification {
  id: string;
  type: 'GAME_INVITE' | 'FRIEND_REQUEST' | 'ACHIEVEMENT' | 'FEED_LIKE' | 'SYSTEM';
  title: string;
  body: string;
  timeAgo: string;
  isRead: boolean;
  gameType?: string;
  actionText?: string;
}

const INITIAL_NOTIFICATIONS: InAppNotification[] = [];

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onAcceptInvite?: (gameType?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onAcceptInvite,
}) => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<InAppNotification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleItemPress = (notif: InAppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    if (notif.type === 'GAME_INVITE' && onAcceptInvite) {
      onClose();
      onAcceptInvite(notif.gameType);
    }
  };

  const getTypeIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'GAME_INVITE':
        return 'gamepad';
      case 'FRIEND_REQUEST':
        return 'userPlus';
      case 'ACHIEVEMENT':
        return 'trophy';
      case 'FEED_LIKE':
        return 'heart';
      default:
        return 'bell';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              theme.shadows.card,
            ]}
          >
            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: theme.colors.divider }]}>
              <View style={styles.headerTitleWrap}>
                <NotificationIcon size={24} hasUnread={unreadCount > 0} />
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                  Notifications
                </Text>
                {unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                    <Text style={[styles.markReadText, { color: theme.colors.primary }]}>
                      Mark Read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <NotificationIcon size={48} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    All Caught Up!
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                    You have no new notifications right now.
                  </Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => handleItemPress(notif)}
                    activeOpacity={0.75}
                    style={[
                      styles.notifItem,
                      {
                        backgroundColor: notif.isRead
                          ? theme.colors.surface
                          : theme.colors.surfaceElevated,
                        borderBottomColor: theme.colors.divider,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: notif.isRead
                            ? theme.colors.surfaceElevated
                            : theme.colors.cardTintMint,
                        },
                      ]}
                    >
                      <Icon
                        name={getTypeIcon(notif.type) as any}
                        size={18}
                        color={notif.isRead ? theme.colors.textMuted : theme.colors.primary}
                      />
                    </View>

                    <View style={styles.contentWrap}>
                      <View style={styles.topMetaRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            {
                              color: theme.colors.textPrimary,
                              fontWeight: notif.isRead ? '600' : '800',
                            },
                          ]}
                        >
                          {notif.title}
                        </Text>
                        <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                          {notif.timeAgo}
                        </Text>
                      </View>

                      <Text
                        style={[styles.bodyText, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {notif.body}
                      </Text>

                      {notif.actionText && (
                        <View style={styles.actionBtnRow}>
                          <View
                            style={[
                              styles.itemActionBtn,
                              { backgroundColor: theme.colors.primary },
                            ]}
                          >
                            <Text style={styles.itemActionText}>{notif.actionText}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {!notif.isRead && <View style={styles.unreadIndicatorDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            {notifications.length > 0 && (
              <View style={[styles.footerRow, { borderTopColor: theme.colors.divider }]}>
                <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                  <Text style={[styles.clearAllText, { color: theme.colors.textMuted }]}>
                    Clear all notifications
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '85%',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notifItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    gap: 14,
    position: 'relative',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    marginLeft: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionBtnRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  itemActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  itemActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  unreadIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    alignSelf: 'center',
  },
  footerRow: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
