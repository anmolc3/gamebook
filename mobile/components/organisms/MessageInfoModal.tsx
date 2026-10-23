import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { Avatar } from '../atoms/Avatar';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MessageReceiptTicks } from '../atoms/MessageReceiptTicks';

export interface MessageInfoModalProps {
  visible: boolean;
  message: ChatMessage | null;
  conversationId: string;
  isGroup?: boolean;
  onClose: () => void;
}

interface ReceiptMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  timestamp?: string | null;
}

interface MessageReceiptsData {
  messageId: string;
  content: string;
  type: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  senderId: string;
  isGroup: boolean;
  totalRecipients: number;
  readBy: ReceiptMember[];
  deliveredTo: ReceiptMember[];
  pending: ReceiptMember[];
}

function formatReceiptTime(dateString?: string | null): string {
  if (!dateString) return 'Pending';
  const d = new Date(dateString);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  visible,
  message,
  conversationId,
  isGroup = false,
  onClose,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MessageReceiptsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !message) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    ChatService.fetchMessageReceipts(conversationId, message.id)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load receipts');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, message, conversationId]);

  if (!visible || !message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
            theme.shadows.modal,
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="info" size={20} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Message Info
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Message Content Preview Box */}
          <View
            style={[
              styles.previewBox,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[styles.previewContent, { color: theme.colors.textPrimary }]}
              numberOfLines={3}
            >
              {message.content}
            </Text>
            <View style={styles.previewMetaRow}>
              <Text style={[styles.previewTime, { color: theme.colors.textMuted }]}>
                Sent: {formatReceiptTime(message.createdAt)}
              </Text>
              <MessageReceiptTicks
                status={data?.status || message.status}
                size={15}
                isGroup={isGroup}
                readCount={data?.readBy.length ?? message.readCount}
                totalRecipients={data?.totalRecipients ?? message.totalRecipients}
                isAllRead={(data?.status || message.status) === 'READ'}
              />
            </View>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading receipts...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* SECTION 1: READ BY */}
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="doubleCheck" size={16} color="#34B7F1" />
                  <Text style={[styles.sectionTitle, { color: '#34B7F1' }]}>
                    Read By
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                  {data?.readBy.length || 0}
                  {isGroup && data ? ` / ${data.totalRecipients}` : ''}
                </Text>
              </View>

              {data && data.readBy.length > 0 ? (
                data.readBy.map((item) => (
                  <View
                    key={item.userId}
                    style={[
                      styles.memberRow,
                      { borderBottomColor: theme.colors.divider },
                    ]}
                  >
                    <Avatar
                      displayName={item.displayName}
                      avatarUrl={item.avatarUrl}
                      size="sm"
                    />
                    <View style={styles.memberMeta}>
                      <Text
                        style={[styles.memberName, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.displayName}
                      </Text>
                      <Text style={[styles.memberSub, { color: theme.colors.textSecondary }]}>
                        @{item.username}
                      </Text>
                    </View>
                    <Text style={[styles.timestampText, { color: theme.colors.textMuted }]}>
                      {formatReceiptTime(item.timestamp)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    Not read yet
                  </Text>
                </View>
              )}

              {/* SECTION 2: DELIVERED TO */}
              <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="doubleCheck" size={16} color="#8696A0" />
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Delivered To
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                  {data?.deliveredTo.length || 0}
                  {isGroup && data ? ` / ${data.totalRecipients}` : ''}
                </Text>
              </View>

              {data && data.deliveredTo.length > 0 ? (
                data.deliveredTo.map((item) => (
                  <View
                    key={item.userId}
                    style={[
                      styles.memberRow,
                      { borderBottomColor: theme.colors.divider },
                    ]}
                  >
                    <Avatar
                      displayName={item.displayName}
                      avatarUrl={item.avatarUrl}
                      size="sm"
                    />
                    <View style={styles.memberMeta}>
                      <Text
                        style={[styles.memberName, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.displayName}
                      </Text>
                      <Text style={[styles.memberSub, { color: theme.colors.textSecondary }]}>
                        @{item.username}
                      </Text>
                    </View>
                    <Text style={[styles.timestampText, { color: theme.colors.textMuted }]}>
                      {formatReceiptTime(item.timestamp)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    Not delivered yet
                  </Text>
                </View>
              )}

              {/* SECTION 3: PENDING RECIPIENTS (Group chats only) */}
              {isGroup && data && data.pending && data.pending.length > 0 && (
                <>
                  <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="clock" size={15} color={theme.colors.textMuted} />
                      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
                        Pending Delivery
                      </Text>
                    </View>
                    <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                      {data.pending.length}
                    </Text>
                  </View>

                  {data.pending.map((item) => (
                    <View
                      key={item.userId}
                      style={[
                        styles.memberRow,
                        { borderBottomColor: theme.colors.divider },
                      ]}
                    >
                      <Avatar
                        displayName={item.displayName}
                        avatarUrl={item.avatarUrl}
                        size="sm"
                      />
                      <View style={styles.memberMeta}>
                        <Text
                          style={[styles.memberName, { color: theme.colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.displayName}
                        </Text>
                        <Text style={[styles.memberSub, { color: theme.colors.textMuted }]}>
                          @{item.username}
                        </Text>
                      </View>
                      <Text style={[styles.timestampText, { color: theme.colors.textMuted }]}>
                        Offline
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
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
  previewBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  previewTime: {
    fontSize: 11,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  errorBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
  },
  scrollList: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberSub: {
    fontSize: 12,
    marginTop: 2,
  },
  timestampText: {
    fontSize: 11,
  },
  emptyRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
