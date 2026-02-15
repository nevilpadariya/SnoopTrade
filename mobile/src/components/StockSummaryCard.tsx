import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface StockSummaryCardProps {
  label: string;
  value: string;
}

export function StockSummaryCard({ label, value }: StockSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  value: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
});
