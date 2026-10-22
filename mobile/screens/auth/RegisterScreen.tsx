import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  BackHandler,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../theme';
import { InputField, PrimaryButton, OtterMascotAnimation } from '../../components';
import { Icon } from '../../icons';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const { register, loginWithGoogle, signInWithGoogle, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onNavigateToLogin();
      return true;
    });
    return () => sub.remove();
  }, [onNavigateToLogin]);

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const errors: typeof fieldErrors = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Terms & Privacy',
        'Please agree to the Terms of Service and Privacy Policy to continue.'
      );
      return;
    }

    try {
      await register(
        email.trim(),
        username.trim(),
        password,
        username.trim()
      );
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.message || 'Could not complete registration. Please try again.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      if (Platform.OS === 'web') {
        const win = window as any;
        if (win.google?.accounts?.id) {
          win.google.accounts.id.initialize({
            client_id: '584037157308-6jortk40dk68qg2hiuam5pjqgrro0lam.apps.googleusercontent.com',
            callback: async (response: any) => {
              if (response.credential) {
                await loginWithGoogle(response.credential);
              }
            },
          });
          win.google.accounts.id.prompt();
          return;
        }
      }

      const success = await signInWithGoogle();
      if (!success) {
        return;
      }
    } catch (err: any) {
      Alert.alert(
        'Google Sign-In Failed',
        err.message || 'Google authentication could not be completed.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleOpenTerms = () => {
    Alert.alert(
      'Terms of Service',
      'By using Otter, you agree to respect community guidelines, maintain fair play, and protect your account credentials.'
    );
  };

  const handleOpenPrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'We value your privacy. Your data is encrypted and securely managed to ensure seamless gaming and profile experiences.'
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000000' : theme.colors.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Top Bar with Circular Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? '#121212' : theme.colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border,
                },
              ]}
              onPress={onNavigateToLogin}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to Login"
            >
              <Icon name="chevronLeft" size={20} color={isDark ? '#FFFFFF' : theme.colors.textPrimary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Otter Mascot Wave Animation */}
          <View style={styles.mascotContainer}>
            <OtterMascotAnimation />
          </View>

          {/* Heading */}
          <View style={styles.header}>
            <Text style={[styles.titleText, { color: isDark ? '#FFFFFF' : theme.colors.textPrimary }]}>
              Create Your <Text style={styles.titleAccent}>Account</Text>
            </Text>
            <Text style={[styles.subtitleText, { color: isDark ? '#8E9BAE' : theme.colors.textSecondary }]}>
              Join the gaming community and start your journey.
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.formContainer}>
            <InputField
              minimal
              placeholder="Username"
              leftIcon="user"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              error={fieldErrors.username}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              minimal
              placeholder="Email Address"
              leftIcon="mail"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              minimal
              placeholder="Password"
              leftIcon="lock"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={fieldErrors.password}
              isPassword
              autoCapitalize="none"
            />

            <InputField
              minimal
              placeholder="Confirm Password"
              leftIcon="lock"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={fieldErrors.confirmPassword}
              isPassword
              autoCapitalize="none"
            />

            {/* Terms of Service & Privacy Policy Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxActive,
                  {
                    backgroundColor: termsAccepted
                      ? '#FF2A6D'
                      : isDark
                      ? '#121212'
                      : theme.colors.surface,
                    borderColor: termsAccepted
                      ? '#FF2A6D'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : theme.colors.border,
                  },
                ]}
              >
                {termsAccepted && <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={[styles.termsText, { color: isDark ? '#8E9BAE' : theme.colors.textSecondary }]}>
                I agree to the{' '}
                <Text style={styles.termsHighlight} onPress={handleOpenTerms}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.termsHighlight} onPress={handleOpenPrivacy}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Pink-to-Orange Gradient Create Account Button */}
            <PrimaryButton
              variant="gradient"
              label={isLoading ? 'Creating Account...' : 'Create Account'}
              rightIcon="arrowRight"
              onPress={handleRegister}
              loading={isLoading}
              gradientColors={['#FF2A6D', '#FF5E3A', '#FF9500']}
              style={{ marginTop: 4 }}
            />

            {/* Subtle "OR" Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: isDark ? '#64748B' : theme.colors.textMuted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border }]} />
            </View>

            {/* Charcoal Continue with Google Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: isDark ? '#121212' : theme.colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="google" size={19} />
                  <Text style={[styles.googleButtonText, { color: isDark ? '#FFFFFF' : theme.colors.textPrimary }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer Switching Option */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: isDark ? '#8E9BAE' : theme.colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
                <Text style={styles.footerActionText}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 6 : 2,
    paddingBottom: 28,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121212',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  titleAccent: {
    color: '#FF9F1C',
  },
  subtitleText: {
    fontSize: 13,
    color: '#8E9BAE',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    alignSelf: 'center',
  },
  formContainer: {
    width: '100%',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
    marginBottom: 18,
    paddingRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#121212',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#FF2A6D',
    borderColor: '#FF2A6D',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#8E9BAE',
    lineHeight: 19,
  },
  termsHighlight: {
    color: '#FF2A6D',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    marginHorizontal: 14,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#64748B',
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#121212',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#8E9BAE',
  },
  footerActionText: {
    fontSize: 14,
    color: '#FF2A6D',
    fontWeight: '700',
  },
});
