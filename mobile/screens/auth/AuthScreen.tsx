import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthContext';
import { InputField, PrimaryButton, ForgotPasswordModal, OtterMascotAnimation } from '../../components';
import { Icon } from '../../icons';

export interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
}

/**
 * Unified, Fixed Dark Mode Authentication Screen for Otter.
 * Permanently dark (#000000 background, #121212 input fields, #FFFFFF text, #FF2A6D pink accents)
 * regardless of device system theme or in-app theme toggle.
 *
 * Maintains the waving Otter mascot video persistently across Sign In and Create Account tabs
 * so the video never restarts and entered form data is never lost.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onModeChange,
}) => {
  const { login, register, loginWithGoogle, signInWithGoogle, isLoading } = useAuth();

  // Active view mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sync mode if initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  // -------------------------------------------------------------
  // Persistent Form State (Retained across tab switching)
  // -------------------------------------------------------------
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Register validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Hardware back press handler on Android:
  // If in register view, navigate back to login view instead of exiting app
  useEffect(() => {
    const onBackPress = () => {
      if (isForgotPasswordVisible) {
        setIsForgotPasswordVisible(false);
        return true;
      }
      if (mode === 'register') {
        switchMode('login');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [mode, isForgotPasswordVisible]);

  // -------------------------------------------------------------
  // Actions: Sign In
  // -------------------------------------------------------------
  const handleLogin = async () => {
    if (!loginIdentifier.trim() || !loginPassword) {
      Alert.alert(
        'Required Fields',
        'Please enter your username or email and password to sign in.'
      );
      return;
    }

    try {
      await login(loginIdentifier.trim(), loginPassword);
    } catch (err: any) {
      Alert.alert(
        'Sign In Failed',
        err.message || 'Invalid credentials. Please verify your details and try again.'
      );
    }
  };

  // -------------------------------------------------------------
  // Actions: Register / Create Account
  // -------------------------------------------------------------
  const validateRegister = () => {
    const errors: typeof fieldErrors = {};

    if (!regUsername.trim()) {
      errors.username = 'Username is required';
    } else if (regUsername.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(regUsername.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!regEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!regPassword) {
      errors.password = 'Password is required';
    } else if (regPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegister()) {
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
        regEmail.trim(),
        regUsername.trim(),
        regPassword,
        regUsername.trim()
      );
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.message || 'Could not complete registration. Please try again.'
      );
    }
  };

  // -------------------------------------------------------------
  // Actions: Google Sign-In
  // -------------------------------------------------------------
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

  const isLogin = mode === 'login';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
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
          {/* Top Back Button (Only on Register Mode) */}
          <View style={styles.topBar}>
            {!isLogin ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => switchMode('login')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Back to Login"
              >
                <Icon name="chevronLeft" size={20} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            ) : (
              <View style={styles.topBarPlaceholder} />
            )}
          </View>

          {/* Persistent Otter Mascot Waving Video Animation */}
          {/* Sits seamlessly on pure black background, waves naturally, voice plays once */}
          <View style={styles.mascotContainer}>
            <OtterMascotAnimation
              format="mp4"
              width={180}
              playVoiceOnce={true}
              testID="auth-mascot-animation"
            />
          </View>

          {/* Heading */}
          <View style={styles.header}>
            <Text style={styles.titleText}>
              {isLogin ? (
                <>Welcome to <Text style={styles.titleAccent}>Otter</Text></>
              ) : (
                <>Create Your <Text style={styles.titleAccent}>Account</Text></>
              )}
            </Text>
            <Text style={styles.subtitleText}>
              {isLogin
                ? 'Sign in to play with friends, share stories, and conquer the leaderboards.'
                : 'Join the gaming community and start your journey.'}
            </Text>
          </View>

          {/* ----------------------------------------------------- */}
          {/* VIEW: LOGIN FORM                                      */}
          {/* ----------------------------------------------------- */}
          {isLogin ? (
            <View style={styles.formContainer}>
              <InputField
                minimal
                forceDark
                placeholder="Username or Email"
                leftIcon="user"
                value={loginIdentifier}
                onChangeText={setLoginIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <InputField
                minimal
                forceDark
                placeholder="Password"
                leftIcon="lock"
                value={loginPassword}
                onChangeText={setLoginPassword}
                isPassword
                autoCapitalize="none"
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity
                  onPress={() => setIsForgotPasswordVisible(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pink-to-Orange Gradient Sign In Button */}
              <PrimaryButton
                variant="gradient"
                label={isLoading ? 'Signing In...' : 'Sign In'}
                rightIcon="arrowRight"
                onPress={handleLogin}
                loading={isLoading}
                gradientColors={['#FF2A6D', '#FF5E3A', '#FF9500']}
              />

              {/* Subtle OR Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Charcoal Continue with Google Button */}
              <TouchableOpacity
                style={styles.googleButton}
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
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Footer Switch to Register */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => switchMode('register')} activeOpacity={0.7}>
                  <Text style={styles.footerActionText}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ----------------------------------------------------- */
            /* VIEW: CREATE ACCOUNT / REGISTER FORM                  */
            /* ----------------------------------------------------- */
            <View style={styles.formContainer}>
              <InputField
                minimal
                forceDark
                placeholder="Username"
                leftIcon="user"
                value={regUsername}
                onChangeText={(text) => {
                  setRegUsername(text);
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                error={fieldErrors.username}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <InputField
                minimal
                forceDark
                placeholder="Email Address"
                leftIcon="mail"
                value={regEmail}
                onChangeText={(text) => {
                  setRegEmail(text);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <InputField
                minimal
                forceDark
                placeholder="Password"
                leftIcon="lock"
                value={regPassword}
                onChangeText={(text) => {
                  setRegPassword(text);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={fieldErrors.password}
                isPassword
                autoCapitalize="none"
              />

              <InputField
                minimal
                forceDark
                placeholder="Confirm Password"
                leftIcon="lock"
                value={regConfirmPassword}
                onChangeText={(text) => {
                  setRegConfirmPassword(text);
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
                  ]}
                >
                  {termsAccepted && <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.termsText}>
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

              {/* Subtle OR Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Charcoal Continue with Google Button */}
              <TouchableOpacity
                style={styles.googleButton}
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
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Footer Switch to Sign In */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.7}>
                  <Text style={styles.footerActionText}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal (Forced Dark Mode) */}
      <ForgotPasswordModal
        visible={isForgotPasswordVisible}
        forceDark
        onClose={() => setIsForgotPasswordVisible(false)}
        onPasswordResetSuccess={(ident) => {
          if (ident) setLoginIdentifier(ident);
          setIsForgotPasswordVisible(false);
        }}
      />
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
    paddingBottom: 24,
    justifyContent: 'center',
  },
  topBar: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 4,
  },
  topBarPlaceholder: {
    height: 40,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  titleText: {
    fontSize: 25,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#FF2A6D',
    fontSize: 13,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
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
    marginTop: 22,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#FF2A6D',
    borderColor: '#FF2A6D',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#8E9BAE',
    lineHeight: 18,
  },
  termsHighlight: {
    color: '#FF2A6D',
    fontWeight: '600',
  },
});

export default AuthScreen;
