import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { useAuth } from '../../features/auth/AuthContext';

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { deleteAccount } = useAuth();
  const isDark = theme.mode === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return; // Prevent closing while deletion is actively processing
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await deleteAccount({
        confirm: true,
      });

      // On successful deletion, close modal and trigger parent success callback
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to delete account at this time. Please check your connection and try again.'
      );
      setIsLoading(false);
    }
  };

  // Color tokens aligned with Otter's design system & Dark/Light mode
  const titleColor = isDark ? '#FFFFFF' : '#0F172A';
  const messageColor = isDark ? '#94A3B8' : '#475569';
  const cardBg = isDark ? '#141A26' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const cancelBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)';
  const cancelText = isDark ? '#E2E8F0' : '#334155';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose} disabled={isLoading}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.dialogContainer,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              {/* Warning Destructive Badge */}
              <View style={styles.iconCircle}>
                <Icon name="trash" size={26} color="#EF4444" strokeWidth={2.2} />
              </View>

              {/* Title */}
              <Text style={[styles.dialogTitle, { color: titleColor }]}>
                Delete Account Permanently?
              </Text>

              {/* Message */}
              <Text style={[styles.dialogMessage, { color: messageColor }]}>
                Once you delete your account, your data will be deleted forever. This action cannot be undone.
              </Text>

              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Icon name="alertTriangle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Action Buttons: Cancel and Delete My Account */}
              <View style={styles.buttonContainer}>
                {/* Cancel Button */}
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      borderColor: cancelBorder,
                      opacity: isLoading ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={handleClose}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel account deletion"
                >
                  <Text style={[styles.cancelButtonText, { color: cancelText }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                {/* Delete My Account Button */}
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    {
                      opacity: isLoading ? 0.75 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleDelete}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Delete My Account permanently"
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.deleteButtonText}>Deleting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete My Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 18,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  deleteButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
