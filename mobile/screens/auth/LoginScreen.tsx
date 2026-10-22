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
import { InputField, PrimaryButton, ForgotPasswordModal, OtterMascotAnimation } from '../../components';
import { Icon } from '../../icons';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const { login, loginWithGoogle, signInWithGoogle, isLoading } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('testuser');
  const [password, setPassword] = useState('password123');
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isForgotPasswordVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsForgotPasswordVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [isForgotPasswordVisible]);

  const handleLogin = async () => {
    const targetUser = usernameOrEmail.trim() || 'testuser';
    const targetPass = password || 'password123';

    try {
      await login(targetUser, targetPass);
    } catch (err: any) {
      Alert.alert(
        'Sign In Failed',
        err.message || 'Invalid credentials. Please verify your details and try again.'
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

      // Real Google Sign-In for Android & iOS via secure Expo browser session
      const success = await signInWithGoogle();
      if (!success) {
        // User cancelled or dismissed sign-in dialog - silently reset
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
          {/* Otter Mascot Wave Animation */}
          <View style={styles.mascotContainer}>
            <OtterMascotAnimation format="mp4" width={180} playVoiceOnce={true} />
          </View>

          {/* Brand Heading */}
          <View style={styles.header}>
            <Text style={styles.titleText}>
              Welcome to <Text style={styles.titleAccent}>Otter</Text>
            </Text>
            <Text style={styles.subtitleText}>
              Sign in to play with friends, share stories, and conquer the leaderboards.
            </Text>
          </View>

          {/* Direct Input Fields (Clean & Minimal) */}
          <View style={styles.formContainer}>
            <InputField
              minimal
              forceDark
              placeholder="Username or Email"
              leftIcon="user"
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              minimal
              forceDark
              placeholder="Password"
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
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

            {/* Subtle "OR" Divider */}
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

            {/* Footer Switching Option */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
                <Text style={styles.footerActionText}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={isForgotPasswordVisible}
        forceDark
        onClose={() => setIsForgotPasswordVisible(false)}
        onPasswordResetSuccess={(ident) => {
          if (ident) setUsernameOrEmail(ident);
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
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 24,
    justifyContent: 'center',
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
    marginBottom: 20,
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
});
