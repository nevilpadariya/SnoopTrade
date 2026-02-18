import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SnoopInput } from '../../components/ui/SnoopInput';
import { SnoopButton } from '../../components/ui/SnoopButton';
import { useAuth } from '../../context/AuthContext';
import { ApiError, updatePassword } from '../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../theme/tokens';

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function getLoginBadge(loginType?: string): string {
  if (loginType === 'both') return 'Google + Password';
  if (loginType === 'google') return 'Google';
  return 'Password';
}

export function AccountScreen() {
  const { user, token, requiresPassword, refreshUser, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const needsCurrentPassword = user?.login_type !== 'google' && !requiresPassword;

  useEffect(() => {
    refreshUser().catch(() => {
      // keep page usable even if refresh fails
    });
  }, [refreshUser]);

  const onUpdatePassword = async () => {
    setError('');
    setSuccess('');

    if (!token) {
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (needsCurrentPassword && !currentPassword) {
      setError('Current password is required.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(token, newPassword, currentPassword || undefined);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Password update failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(user?.name);

  return (
    <ScreenContainer>
      <Text style={styles.pageTitle}>Account Settings</Text>

      {/* ── Profile card with avatar (matches wireframe Screen 6) ── */}
      <View style={[styles.profileCard, styles.cardShadow]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || '--'}</Text>
          <Text style={styles.profileBadge}>Login: {getLoginBadge(user?.login_type)}</Text>
        </View>
      </View>

      {/* ── Account Information ── */}
      <View style={styles.card}>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.fieldValue}>
            <Text style={styles.value}>{user?.email || '--'}</Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.fieldValue}>
            <Text style={styles.value}>{user?.name || '--'}</Text>
          </View>
        </View>
      </View>

      {/* ── Change Password ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{requiresPassword ? 'Create Password' : 'Change Password'}</Text>
        {needsCurrentPassword ? (
          <SnoopInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
        ) : null}
        <SnoopInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <SnoopInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <SnoopButton title="Update Password" onPress={onUpdatePassword} loading={loading} />
      </View>

      {/* ── Logout ── */}
      <SnoopButton title="Logout" onPress={() => signOut()} variant="danger" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardShadow: {
    ...shadow,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  profileBadge: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  fieldValue: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
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
