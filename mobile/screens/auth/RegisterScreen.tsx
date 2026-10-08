import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { useAuth } from '../../features/auth/AuthContext';
import { InputField, PrimaryButton, Typography } from '../../components';
import { Icon } from '../../icons';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { theme } = useTheme();
  const { register, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill out all required fields');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    try {
      await register(email.trim(), username.trim(), password, displayName.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                },
              ]}
            >
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 84, height: 84, borderRadius: 22 }}
                resizeMode="cover"
              />
            </View>
            <Typography variant="headingLarge" align="center" style={styles.title}>
              Create Your Profile
            </Typography>
            <Typography variant="bodyMedium" align="center" style={styles.subtitle}>
              Join the network, choose your gaming handle, and challenge players worldwide.
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
              label="Display Name"
              placeholder="e.g. Alex Rivera"
              leftIcon="user"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <InputField
              label="Unique Username"
              placeholder="e.g. alex_rivera"
              leftIcon="user"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Email Address"
              placeholder="e.g. alex@example.com"
              leftIcon="search"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Password (min 8 characters)"
              placeholder="••••••••"
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <PrimaryButton
              label={isLoading ? 'Creating Account...' : 'Get Started'}
              rightIcon="chevronRight"
              variant="filled"
              onPress={handleRegister}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Footer Switching Option */}
          <View style={styles.footer}>
            <Typography variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
              Already have an account?{' '}
            </Typography>
            <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
              <Typography
                variant="bodyMedium"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
              >
                Sign In
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 6,
  },
  subtitle: {
    maxWidth: 300,
  },
  formCard: {
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
});
