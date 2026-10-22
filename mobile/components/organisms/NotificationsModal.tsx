import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { NotificationIcon } from '../atoms/NotificationIcon';
import { GameLogo } from '../atoms/GameLogo';
import { NotificationService, AppNotification } from '../../services/notification.service';

export type InAppNotification = AppNotification;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onAcceptInvite?: (gameType?: string) => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onAcceptInvite,
  onSelectNotification,
}) => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await NotificationService.fetchNotifications(50);
      setNotifications(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch when modal opens
  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  // Real-time synchronization: append or update incoming notifications live
  useEffect(() => {
    const unsubNotif = NotificationService.addNotificationListener((newNotif) => {
      setNotifications((prev) => {
        const idx = prev.findIndex((n) => n.id === newNotif.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...newNotif };
          return updated;
        }
        return [newNotif, ...prev];
      });
    });

    return unsubNotif;
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await NotificationService.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      setNotifications([]);
      await NotificationService.clearAll();
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  };

  const handleItemPress = async (notif: AppNotification) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      NotificationService.markAsRead(notif.id).catch(() => {});
    }

    if (notif.type === 'GAME_INVITE' && onAcceptInvite) {
      onClose();
      const gameType = notif.data?.gameType;
      onAcceptInvite(gameType);
      return;
    }

    if (onSelectNotification) {
      onClose();
      onSelectNotification(notif);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MENTION':
        return 'atSign';
      case 'MISSED_CALL':
        return 'missedCall';
      case 'CHAT_MESSAGE':
        return 'chat';
      case 'GAME_INVITE':
        return 'gamepad';
      case 'FRIEND_REQUEST':
        return 'userPlus';
      case 'FRIEND_ACCEPTED':
        return 'userCheck';
      case 'ACHIEVEMENT':
        return 'trophy';
      case 'FEED_LIKE':
        return 'heart';
      case 'YOUR_TURN':
        return 'clock';
      default:
        return 'bell';
    }
  };

  const getNotificationBody = (notif: AppNotification): string => {
    return notif.message || (notif as any).body || '';
  };

  const getActionText = (notif: AppNotification): string | undefined => {
    if (notif.type === 'GAME_INVITE') return 'Join Game';
    if (notif.type === 'FRIEND_REQUEST') return 'View Request';
    if (notif.type === 'MISSED_CALL') return 'Callback';
    return undefined;
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadNotifications(true)}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {isLoading && notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted, marginTop: 12 }]}>
                    Loading notifications...
                  </Text>
                </View>
              ) : error && notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="info" size={40} color={theme.colors.warning || '#F59E0B'} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    Could Not Load
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                    {error}
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => loadNotifications(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : notifications.length === 0 ? (
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
                notifications.map((notif) => {
                  const gameType = notif.data?.gameType;
                  const actionText = getActionText(notif);
                  const isMention = notif.type === 'MENTION';
                  const isMissedCall = notif.type === 'MISSED_CALL';

                  return (
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
                      {notif.type === 'GAME_INVITE' && gameType ? (
                        <GameLogo
                          gameType={gameType}
                          size={38}
                          borderRadius={8}
                          fallbackIcon="gamepad"
                        />
                      ) : (
                        <View
                          style={[
                            styles.iconWrap,
                            {
                              backgroundColor: notif.isRead
                                ? theme.colors.surfaceElevated
                                : isMention
                                ? (theme.colors.cardTintAmber || '#F59E0B20')
                                : isMissedCall
                                ? '#EF444420'
                                : theme.colors.cardTintMint,
                            },
                          ]}
                        >
                          <Icon
                            name={getTypeIcon(notif.type) as any}
                            size={18}
                            color={
                              notif.isRead
                                ? theme.colors.textMuted
                                : isMention
                                ? (theme.colors.warning || '#D97706')
                                : isMissedCall
                                ? '#EF4444'
                                : theme.colors.primary
                            }
                            strokeWidth={2.2}
                          />
                        </View>
                      )}

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
                            numberOfLines={1}
                          >
                            {notif.title}
                          </Text>
                          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                            {NotificationService.formatTimeAgo(notif.createdAt)}
                          </Text>
                        </View>

                        <Text
                          style={[styles.bodyText, { color: theme.colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {getNotificationBody(notif)}
                        </Text>

                        {actionText && (
                          <View style={styles.actionBtnRow}>
                            <View
                              style={[
                                styles.itemActionBtn,
                                {
                                  backgroundColor: isMissedCall
                                    ? '#EF4444'
                                    : theme.colors.primary,
                                },
                              ]}
                            >
                              <Text style={styles.itemActionText}>{actionText}</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {!notif.isRead && (
                        <View
                          style={[
                            styles.unreadIndicatorDot,
                            {
                              backgroundColor: isMention
                                ? '#F59E0B'
                                : isMissedCall
                                ? '#EF4444'
                                : '#3B82F6',
                            },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
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
    minHeight: 180,
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
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
