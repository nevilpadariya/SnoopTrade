import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type GoogleIdTokenPayload = { email?: string };

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_FALLBACK_CLIENT_ID = GOOGLE_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || 'missing-google-client-id';

export function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_FALLBACK_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID || GOOGLE_FALLBACK_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_FALLBACK_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_FALLBACK_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    const completeGoogleSignIn = async () => {
      if (!response) {
        return;
      }

      if (response.type === 'error') {
        setError(response.error?.message || 'Google login failed.');
        return;
      }

      if (response.type !== 'success') {
        return;
      }

      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (!idToken) {
        setError('Google sign-in did not return an ID token.');
        return;
      }

      let userEmail = '';
      try {
        const decoded = jwtDecode<GoogleIdTokenPayload>(idToken);
        userEmail = decoded.email || '';
      } catch {
        setError('Failed to decode Google account details.');
        return;
      }

      if (!userEmail) {
        setError('Google account email is missing.');
        return;
      }

      try {
        setGoogleLoading(true);
        setError('');
        await signInWithGoogle(userEmail, idToken);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error && /network request failed|failed to fetch|network/i.test(err.message)) {
          setError('Cannot reach backend API from phone. Check EXPO_PUBLIC_API_BASE_URL in mobile/.env and backend host binding.');
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      } finally {
        setGoogleLoading(false);
      }
    };

    completeGoogleSignIn();
  }, [response, signInWithGoogle]);

  const onLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error && /network request failed|failed to fetch|network/i.test(err.message)) {
        setError('Cannot reach backend API from phone. Check EXPO_PUBLIC_API_BASE_URL in mobile/.env and backend host binding.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID && !GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID) {
      setError('Google client ID is missing. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env.');
      return;
    }

    if (Constants.appOwnership === 'expo') {
      setError('Google sign-in requires an Expo development build. Expo Go cannot handle OAuth redirects for this flow.');
      return;
    }

    setError('');
    try {
      await promptAsync();
    } catch {
      setError('Failed to open Google sign-in.');
    }
  };

  return (
    <ScreenContainer scroll={false} contentStyle={styles.screenContent}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.brand}>SnoopTrade</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to track insider activity.</Text>
        </View>

        <View style={styles.formBlock}>
          <View style={styles.inputWrap}>
            <View style={styles.inputDot} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputDot} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={({ pressed }) => [styles.loginButton, (pressed || loading) && styles.loginButtonPressed]}
          >
            <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            onPress={onGoogleLogin}
            disabled={loading || googleLoading || !request}
            style={({ pressed }) => [
              styles.googleButton,
              (pressed || loading || googleLoading || !request) && styles.googleButtonPressed,
            ]}
          >
            <View style={styles.googleDot} />
            <Text style={styles.googleText}>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</Text>
          </Pressable>

          <Pressable style={styles.signUpPressable} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signUpText}>
              No account yet? <Text style={styles.signUpLink}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spacing.xxl + spacing.lg,
    gap: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.sm,
  },
  brand: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  formBlock: {
    gap: spacing.md,
  },
  inputWrap: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#2F4A3A',
    backgroundColor: '#1B2B22',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C9D5CC',
    opacity: 0.85,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  loginButton: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: '#A5D47A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonText: {
    color: '#152214',
    fontSize: typography.h3,
    fontWeight: '700',
  },
  orRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  googleButton: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#324B3B',
    backgroundColor: '#25352D',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  googleButtonPressed: {
    opacity: 0.9,
  },
  googleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CFD8D1',
  },
  googleText: {
    color: '#C9D4CC',
    fontSize: typography.body,
    fontWeight: '600',
  },
  signUpPressable: {
    marginTop: spacing.xl,
  },
  signUpText: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: 'center',
  },
  signUpLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
