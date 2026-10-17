import React, { useState, useEffect } from 'react';
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
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Field-level inline errors
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
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
    setMaskedEmail(null);
    setEmailSent(false);
    setGeneralError(null);
    setSuccessMessage(null);
    setIdentifierError(null);
    setCodeError(null);
    setPasswordError(null);
    setConfirmError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Step 1: Request Reset Code
  const handleRequestCode = async () => {
    setGeneralError(null);
    setIdentifierError(null);
    const identifier = emailOrUsername.trim();
    if (!identifier) {
      setIdentifierError('Please enter your username or registered email');
      return;
    }

    try {
      setIsLoading(true);
      const res = await MobileAuthService.forgotPassword(identifier);
      setMaskedEmail(res.maskedEmail);
      setEmailSent(res.emailSent ?? false);
      setStep('verify');
    } catch (err: any) {
      const msg = err.message || 'Failed to request reset code';
      if (
        msg.toLowerCase().includes('user') ||
        msg.toLowerCase().includes('account') ||
        msg.toLowerCase().includes('email')
      ) {
        setIdentifierError(msg);
      } else {
        setGeneralError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Field change handlers with live error clearing & formatting
  const handleCodeChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '').slice(0, 6);
    setResetCode(numeric);
    if (codeError) {
      if (numeric.length === 6) {
        setCodeError(null);
      } else if (numeric.length > 0 && numeric.length < 6) {
        setCodeError('Code must be exactly 6 digits');
      } else {
        setCodeError(null);
      }
    }
    if (generalError) setGeneralError(null);
  };

  const handlePasswordChange = (text: string) => {
    setNewPassword(text);
    if (passwordError && text.length >= 8) {
      setPasswordError(null);
    }
    if (confirmError && confirmPassword && text === confirmPassword) {
      setConfirmError(null);
    }
    if (generalError) setGeneralError(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmError && text === newPassword) {
      setConfirmError(null);
    }
    if (generalError) setGeneralError(null);
  };

  // Step 2: Submit Reset Password with inline validations
  const handleResetPassword = async () => {
    setGeneralError(null);

    let hasError = false;

    // 1. Validate Code
    const trimmedCode = resetCode.trim();
    if (!trimmedCode) {
      setCodeError('Verification code is required');
      hasError = true;
    } else if (!/^\d{6}$/.test(trimmedCode)) {
      setCodeError('Code must be exactly 6 digits');
      hasError = true;
    } else {
      setCodeError(null);
    }

    // 2. Validate Password
    if (!newPassword) {
      setPasswordError('New password is required');
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    // 3. Validate Confirm Password
    if (!confirmPassword) {
      setConfirmError('Please confirm your new password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('New passwords do not match');
      hasError = true;
    } else {
      setConfirmError(null);
    }

    if (hasError) return;

    try {
      setIsLoading(true);
      const res = await MobileAuthService.resetPassword({
        emailOrUsername: emailOrUsername.trim(),
        resetCode: trimmedCode,
        newPassword,
      });
      setSuccessMessage(res.message);
      setStep('success');
      onPasswordResetSuccess?.(emailOrUsername.trim());
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password';
      const lower = msg.toLowerCase();
      if (
        lower.includes('code') ||
        lower.includes('otp') ||
        lower.includes('expired') ||
        lower.includes('invalid verification')
      ) {
        setCodeError(msg);
      } else if (lower.includes('password')) {
        setPasswordError(msg);
      } else {
        setGeneralError(msg);
      }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={styles.keyboardAvoid}
        >
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
                  <View style={styles.headerTextCol}>
                    <Text
                      style={[styles.title, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {step === 'success'
                        ? 'Password Reset'
                        : step === 'verify'
                        ? 'Set New Password'
                        : 'Reset Password'}
                    </Text>
                    <Text
                      style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
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
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                bounces={false}
              >
                {/* General / Server Error Banner (Only for non-field server errors) */}
                {generalError && (
                  <View
                    style={[
                      styles.generalErrorBanner,
                      {
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        borderColor: theme.colors.error,
                      },
                    ]}
                  >
                    <Icon name="close" size={14} color={theme.colors.error} />
                    <Text style={[styles.generalErrorText, { color: theme.colors.error }]}>
                      {generalError}
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
                      Enter your registered email address or account username. We'll send a secure 6-digit verification code to reset your password.
                    </Text>

                    <InputField
                      label="Account Username or Email"
                      placeholder="e.g. alex_rivera or alex@example.com"
                      leftIcon="user"
                      value={emailOrUsername}
                      onChangeText={(text) => {
                        setEmailOrUsername(text);
                        if (identifierError) setIdentifierError(null);
                        if (generalError) setGeneralError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={identifierError || undefined}
                      editable={!isLoading}
                      containerStyle={styles.fieldContainer}
                    />

                    <PrimaryButton
                      label={isLoading ? 'Sending Code...' : 'Send Verification Code'}
                      icon="send"
                      rightIcon="chevronRight"
                      variant="filled"
                      onPress={handleRequestCode}
                      loading={isLoading}
                      disabled={isLoading}
                      style={styles.actionButton}
                    />
                  </View>
                )}

                {/* STEP 2: VERIFY & SET NEW PASSWORD */}
                {step === 'verify' && (
                  <View style={styles.stepContainer}>
                    {/* Compact Email Sent Notice (No duplicate code) */}
                    <View
                      style={[
                        styles.codeNoticeCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.noticeIconCircle,
                          { backgroundColor: theme.colors.primary + '18' },
                        ]}
                      >
                        <Icon name="shield" size={16} color={theme.colors.primary} />
                      </View>
                      <View style={styles.noticeTextWrap}>
                        <Text style={[styles.noticeTitle, { color: theme.colors.textPrimary }]}>
                          Verification code sent
                        </Text>
                        <Text style={[styles.noticeSub, { color: theme.colors.textSecondary }]}>
                          Code sent to{' '}
                          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                            {maskedEmail || emailOrUsername}
                          </Text>
                          . Check your inbox and spam folder.
                        </Text>
                      </View>
                    </View>

                    {/* 1. 6-Digit Verification Code */}
                    <InputField
                      label="6-Digit Verification Code"
                      placeholder="Enter 6-digit code..."
                      leftIcon="shield"
                      value={resetCode}
                      onChangeText={handleCodeChange}
                      keyboardType="number-pad"
                      maxLength={6}
                      error={codeError || undefined}
                      editable={!isLoading}
                      containerStyle={styles.fieldContainer}
                    />

                    {/* 2. New Password (with eye toggle) */}
                    <InputField
                      label="New Password (min 8 characters)"
                      placeholder="Enter new password..."
                      leftIcon="lock"
                      value={newPassword}
                      onChangeText={handlePasswordChange}
                      secureTextEntry
                      autoCapitalize="none"
                      error={passwordError || undefined}
                      editable={!isLoading}
                      containerStyle={styles.fieldContainer}
                    />

                    {/* 3. Confirm New Password (with eye toggle) */}
                    <InputField
                      label="Confirm New Password"
                      placeholder="Repeat new password..."
                      leftIcon="lock"
                      value={confirmPassword}
                      onChangeText={handleConfirmPasswordChange}
                      secureTextEntry
                      autoCapitalize="none"
                      error={confirmError || undefined}
                      editable={!isLoading}
                      containerStyle={styles.fieldContainer}
                    />

                    {/* Reset Password Button */}
                    <PrimaryButton
                      label={isLoading ? 'Resetting Password...' : 'Reset Password'}
                      icon="check"
                      rightIcon="chevronRight"
                      variant="filled"
                      onPress={handleResetPassword}
                      loading={isLoading}
                      disabled={isLoading}
                      style={styles.actionButton}
                    />

                    {/* Change email or request new code link */}
                    <TouchableOpacity
                      onPress={() => {
                        setCodeError(null);
                        setPasswordError(null);
                        setConfirmError(null);
                        setGeneralError(null);
                        setStep('request');
                      }}
                      style={styles.backLink}
                      activeOpacity={0.7}
                      disabled={isLoading}
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
                      {successMessage ||
                        'Your password has been reset successfully. You can now log into your account using your new credentials.'}
                    </Text>

                    <PrimaryButton
                      label="Back to Sign In"
                      rightIcon="chevronRight"
                      variant="filled"
                      onPress={handleClose}
                      style={{ width: '100%', marginTop: 20 }}
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '94%',
    width: '100%',
  },
  content: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '100%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  generalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  stepContainer: {
    paddingTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  codeNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  noticeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  noticeSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  actionButton: {
    marginTop: 6,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 290,
  },
});

