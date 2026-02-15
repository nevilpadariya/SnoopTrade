import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TransactionCard } from '../../components/TransactionCard';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import { ApiError, fetchTransactions } from '../../services/api';
import { TransactionItem } from '../../types/api';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const FILTERS = ['ALL', 'P', 'S', 'M'] as const;

export function TransactionsScreen() {
  const { token, signOut } = useAuth();
  const { selectedTicker, selectedPeriod } = useMarket();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await fetchTransactions(token, selectedTicker, selectedPeriod);
        const validRows = rows
          .filter((row) => row.transaction_date)
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
        setTransactions(validRows);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load transactions.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, selectedTicker, selectedPeriod, signOut]);

  const filteredRows = useMemo(() => {
    if (filter === 'ALL') {
      return transactions;
    }
    return transactions.filter((row) => row.transaction_code === filter);
  }, [transactions, filter]);

  return (
    <ScreenContainer>
      <View>
        <Text style={styles.title}>Insider Transactions</Text>
        <Text style={styles.subtitle}>
          {selectedTicker} in {selectedPeriod.toUpperCase()}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item === filter;
          return (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <Text style={styles.muted}>Loading transactions...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && filteredRows.length === 0 ? <Text style={styles.muted}>No transaction data available.</Text> : null}

      {filteredRows.map((item, idx) => (
        <TransactionCard key={`${item.transaction_date}-${idx}`} item={item} />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    height: 32,
    minWidth: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#1A2A19',
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
});
