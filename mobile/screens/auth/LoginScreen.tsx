import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { useAuth } from '../../features/auth/AuthContext';
import { InputField, PrimaryButton, Typography, ForgotPasswordModal } from '../../components';
import { Icon } from '../../icons';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { theme } = useTheme();
  const { login, isLoading } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please enter your username/email and password');
      return;
    }

    try {
      await login(usernameOrEmail.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
                theme.shadows.soft,
              ]}
            >
              <Icon name="gamepad" size={36} color={theme.colors.primary} />
            </View>
            <Typography variant="headingLarge" align="center" style={styles.title}>
              Social Gaming Arena
            </Typography>
            <Typography variant="bodyMedium" align="center" style={styles.subtitle}>
              Sign in to play with friends, share stories, and conquer the leaderboards.
            </Typography>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.card,
              },
              theme.shadows.card,
            ]}
          >
            {errorMessage && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: theme.colors.error,
                  },
                ]}
              >
                <Icon name="close" size={16} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <InputField
              label="Username or Email"
              placeholder="e.g. alex_rivera"
              leftIcon="user"
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Password"
              placeholder="••••••••"
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => setIsForgotPasswordVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Typography
                  variant="caption"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  Forgot Password?
                </Typography>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              label={isLoading ? 'Signing In...' : 'Sign In'}
              rightIcon="chevronRight"
              variant="filled"
              onPress={handleLogin}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Footer Switching Option */}
          <View style={styles.footer}>
            <Typography variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
              Don't have an account?{' '}
            </Typography>
            <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
              <Typography
                variant="bodyMedium"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
              >
                Create Account
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={isForgotPasswordVisible}
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
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    maxWidth: 280,
  },
  formCard: {
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
