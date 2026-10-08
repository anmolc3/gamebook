import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { IconButton } from '../molecules/IconButton';
import { InputField } from '../molecules/InputField';
import { PrimaryButton } from '../molecules/PrimaryButton';
import { MobileAuthService } from '../../services/auth.service';

export interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onPasswordResetSuccess?: (usernameOrEmail: string) => void;
  initialIdentifier?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onPasswordResetSuccess,
  initialIdentifier,
}) => {
  const { theme } = useTheme();

  // Wizard step: 'request' | 'verify' | 'success'
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');

  // Form states
  const [emailOrUsername, setEmailOrUsername] = useState(initialIdentifier || '');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Info from server
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      if (initialIdentifier) {
        setEmailOrUsername(initialIdentifier);
      }
    }
  }, [visible, initialIdentifier]);

  const resetForm = () => {
    setStep('request');
    setEmailOrUsername(initialIdentifier || '');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedCode(null);
    setMaskedEmail(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Step 1: Request Reset Code
  const handleRequestCode = async () => {
    setErrorMessage(null);
    const identifier = emailOrUsername.trim();
    if (!identifier) {
      setErrorMessage('Please enter your registered email address or username');
      return;
    }

    try {
      setIsLoading(true);
      const res = await MobileAuthService.forgotPassword(identifier);
      setGeneratedCode(res.resetCode);
      setMaskedEmail(res.maskedEmail);
      setResetCode(res.resetCode); // Pre-fill for seamless user testing
      setStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request reset code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit Reset Password
  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!resetCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const res = await MobileAuthService.resetPassword({
        emailOrUsername: emailOrUsername.trim(),
        resetCode: resetCode.trim(),
        newPassword,
      });
      setSuccessMessage(res.message);
      setStep('success');
      onPasswordResetSuccess?.(emailOrUsername.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <SafeAreaView style={styles.sheetContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
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

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View
                    style={[
                      styles.headerIconBox,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Icon name="lock" size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                      {step === 'success'
                        ? 'Password Reset'
                        : step === 'verify'
                        ? 'Set New Password'
                        : 'Reset Password'}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                      {step === 'success'
                        ? 'Account security updated'
                        : step === 'verify'
                        ? 'Enter verification code and your new password'
                        : 'Enter your username or email to recover account'}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon="close"
                  size={36}
                  iconSize={18}
                  variant="tinted"
                  onPress={handleClose}
                  accessibilityLabel="Close forgot password modal"
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
              >
                {/* Error Banner */}
                {errorMessage && (
                  <View
                    style={[
                      styles.banner,
                      {
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: theme.colors.error,
                      },
                    ]}
                  >
                    <Icon name="close" size={16} color={theme.colors.error} />
                    <Text style={[styles.bannerText, { color: theme.colors.error }]}>
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* STEP 1: REQUEST CODE */}
                {step === 'request' && (
                  <View style={styles.stepContainer}>
                    <Text
                      style={[
                        styles.description,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Enter your registered email address or account username. We'll generate a secure 6-digit verification code to reset your password.
                    </Text>

                    <InputField
                      label="Account Username or Email"
                      placeholder="e.g. alex_rivera or alex@example.com"
                      leftIcon="user"
                      value={emailOrUsername}
                      onChangeText={setEmailOrUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <PrimaryButton
                      label={isLoading ? 'Sending Code...' : 'Send Verification Code'}
                      icon="send"
                      rightIcon="chevronRight"
                      variant="filled"
                      onPress={handleRequestCode}
                      loading={isLoading}
                      style={{ marginTop: 8 }}
                    />
                  </View>
                )}

                {/* STEP 2: VERIFY & SET NEW PASSWORD */}
                {step === 'verify' && (
                  <View style={styles.stepContainer}>
                    {/* Demo / Verification Code Callout */}
                    <View
                      style={[
                        styles.codeInfoBox,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <View style={styles.codeInfoTop}>
                        <Icon name="shield" size={16} color={theme.colors.primary} />
                        <Text style={[styles.codeInfoTitle, { color: theme.colors.textPrimary }]}>
                          Verification Code Ready
                        </Text>
                      </View>
                      <Text style={[styles.codeInfoSub, { color: theme.colors.textSecondary }]}>
                        Sent for account: {maskedEmail || emailOrUsername}
                      </Text>
                      {generatedCode && (
                        <View style={styles.badgeRow}>
                          <Text style={[styles.codeBadgeLabel, { color: theme.colors.textSecondary }]}>
                            Your 6-Digit Code:
                          </Text>
                          <View
                            style={[
                              styles.codePill,
                              { backgroundColor: theme.colors.primary + '25', borderColor: theme.colors.primary },
                            ]}
                          >
                            <Text style={[styles.codePillText, { color: theme.colors.primary }]}>
                              {generatedCode}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    <InputField
                      label="6-Digit Verification Code"
                      placeholder="Enter 6-digit code..."
                      leftIcon="shield"
                      value={resetCode}
                      onChangeText={setResetCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />

                    {/* New Password with Eye Button */}
                    <InputField
                      label="New Password (min 8 characters)"
                      placeholder="Enter new password..."
                      leftIcon="lock"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />

                    {/* Confirm Password with Eye Button */}
                    <InputField
                      label="Confirm New Password"
                      placeholder="Repeat new password..."
                      leftIcon="lock"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />

                    <PrimaryButton
                      label={isLoading ? 'Updating Password...' : 'Reset Password'}
                      icon="check"
                      rightIcon="chevronRight"
                      variant="filled"
                      onPress={handleResetPassword}
                      loading={isLoading}
                      style={{ marginTop: 8 }}
                    />

                    <TouchableOpacity
                      onPress={() => setStep('request')}
                      style={styles.backLink}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.backLinkText, { color: theme.colors.textSecondary }]}>
                        ← Change email or request new code
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 3: SUCCESS CONFIRMATION */}
                {step === 'success' && (
                  <View style={styles.successContainer}>
                    <View
                      style={[
                        styles.successIconCircle,
                        {
                          backgroundColor: theme.colors.primary + '20',
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Icon name="check" size={36} color={theme.colors.primary} strokeWidth={3} />
                    </View>

                    <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                      Password Updated!
                    </Text>
                    <Text style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
                      {successMessage || 'Your password has been reset successfully. You can now log into your account using your new credentials.'}
                    </Text>

                    <PrimaryButton
                      label="Back to Sign In"
                      variant="filled"
                      onPress={handleClose}
                      style={{ width: '100%', marginTop: 24 }}
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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
    paddingBottom: 28,
    maxHeight: '100%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 240,
  },
  scroll: {
    paddingBottom: 24,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  stepContainer: {
    paddingTop: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  codeInfoBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  codeInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  codeInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  codeInfoSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  codePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  codePillText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
});
