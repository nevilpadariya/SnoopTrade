import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SnoopButton } from '../../components/ui/SnoopButton';
import { SnoopInput } from '../../components/ui/SnoopInput';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError('');
    setSuccess('');

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await signUp(name.trim(), email.trim(), password);
      setSuccess('Account created. Redirecting to login...');
      setTimeout(() => navigation.replace('Login'), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking insider trades on mobile.</Text>
        </View>

        <View style={styles.formBlock}>
          <SnoopInput label="Full Name" value={name} onChangeText={setName} />
          <SnoopInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <SnoopInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <SnoopInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <SnoopButton title="Create Account" onPress={onSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  headerBlock: {
    gap: spacing.sm,
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
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
  success: {
    color: colors.primary,
    fontSize: typography.caption,
  },
});
