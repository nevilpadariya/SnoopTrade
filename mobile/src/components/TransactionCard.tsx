import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TransactionItem } from '../types/api';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface TransactionCardProps {
  item: TransactionItem;
}

function getTypeLabel(code: string) {
  const types: Record<string, string> = {
    P: 'Purchase',
    S: 'Sale',
    A: 'Grant',
    D: 'Sale to Issuer',
    F: 'Exercise Payment',
    I: 'Discretionary',
    M: 'Exercise/Conversion',
  };
  return types[code] || code;
}

function getTypeColor(code: string) {
  if (code === 'P') {
    return '#68D08E';
  }
  if (code === 'S') {
    return colors.danger;
  }
  return '#75B7FF';
}

export const TransactionCard = React.memo(function TransactionCard({ item }: TransactionCardProps) {
  const date = new Date(item.transaction_date);
  const total = (Number(item.shares) || 0) * (Number(item.price_per_share) || 0);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.typeWrap}>
          <View style={[styles.dot, { backgroundColor: getTypeColor(item.transaction_code) }]} />
          <Text style={styles.typeText}>{getTypeLabel(item.transaction_code)}</Text>
        </View>
        <Text style={styles.dateText}>{isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString()}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Shares: {(Number(item.shares) || 0).toLocaleString()}</Text>
        <Text style={styles.metaText}>Price: ${(Number(item.price_per_share) || 0).toFixed(2)}</Text>
      </View>
      <Text style={styles.totalText}>Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  totalText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
