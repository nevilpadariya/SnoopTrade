import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPANY_NAMES } from '../constants/companies';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface TickerPickerProps {
  tickers: string[];
  onSelect: (ticker: string) => void;
}

export function TickerPicker({ tickers, onSelect }: TickerPickerProps) {
  if (tickers.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No companies found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {tickers.map((ticker) => (
        <Pressable key={ticker} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} onPress={() => onSelect(ticker)}>
          <Text style={styles.itemText}>{ticker}</Text>
          <Text style={styles.subText}>{COMPANY_NAMES[ticker] ?? ticker}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  itemText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  subText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: 2,
  },
  emptyWrap: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
});
