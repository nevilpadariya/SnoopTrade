import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COMPANY_NAMES, COMPANIES } from '../../constants/companies';
import { HomeStackParamList } from '../../navigation/types';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SnoopInput } from '../../components/ui/SnoopInput';
import { TickerPicker } from '../../components/TickerPicker';
import { SparklineChart } from '../../components/charts/SparklineChart';
import { StockSummaryCard } from '../../components/StockSummaryCard';
import { SnoopButton } from '../../components/ui/SnoopButton';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import { ApiError, fetchStocks, fetchTransactions } from '../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export function HomeScreen({ navigation }: Props) {
  const { token, signOut, user } = useAuth();
  const { selectedTicker, setSelectedTicker, selectedPeriod, setStockSeries } = useMarket();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockPrices, setStockPrices] = useState<number[]>([]);
  const [latestOpen, setLatestOpen] = useState<number | null>(null);
  const [latestHigh, setLatestHigh] = useState<number | null>(null);
  const [latestLow, setLatestLow] = useState<number | null>(null);
  const [latestClose, setLatestClose] = useState<number | null>(null);
  const [purchases, setPurchases] = useState(0);
  const [sales, setSales] = useState(0);

  const debouncedSearch = useDebounce(search, 120);
  const filteredTickers = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) {
      return [];
    }

    return COMPANIES.filter((ticker) => {
      const name = (COMPANY_NAMES[ticker] || '').toLowerCase();
      return ticker.toLowerCase().includes(term) || name.includes(term);
    }).slice(0, 6);
  }, [debouncedSearch]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [stocks, transactions] = await Promise.all([
          fetchStocks(token, selectedTicker, selectedPeriod),
          fetchTransactions(token, selectedTicker, selectedPeriod),
        ]);

        const sortedStocks = [...stocks]
          .filter((row) => row.date)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setStockSeries(selectedTicker, sortedStocks);
        setStockPrices(sortedStocks.map((row) => Number(row.open) || 0));

        const latest = sortedStocks[sortedStocks.length - 1] || null;
        setLatestOpen(latest ? Number(latest.open) : null);
        setLatestHigh(latest ? Number(latest.high) : null);
        setLatestLow(latest ? Number(latest.low) : null);
        setLatestClose(latest ? Number(latest.close) : null);

        const buys = transactions.filter((tx) => tx.transaction_code === 'P').length;
        const sells = transactions.filter((tx) => tx.transaction_code === 'S').length;
        setPurchases(buys);
        setSales(sells);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load market data.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, signOut, selectedTicker, selectedPeriod, setStockSeries]);

  const netSignal = purchases > sales ? 'mildly bullish' : sales > purchases ? 'cautious' : 'neutral';
  const initials = getInitials(user?.name || user?.first_name);

  return (
    <ScreenContainer>
      {/* ── Avatar header (matches wireframe Screen 2) ── */}
      <View style={styles.headerRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.first_name || user?.name || 'Trader'}</Text>
        </View>
      </View>

      <SnoopInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search ticker or company..."
        autoCapitalize="characters"
      />

      {filteredTickers.length > 0 ? (
        <TickerPicker
          tickers={filteredTickers as string[]}
          onSelect={(ticker) => {
            setSelectedTicker(ticker);
            setSearch('');
          }}
        />
      ) : null}

      <View style={styles.selectedChip}>
        <View style={styles.chipDot} />
        <Text style={styles.selectedTicker}>{selectedTicker}</Text>
        <Text style={styles.selectedName}>{COMPANY_NAMES[selectedTicker] || selectedTicker}</Text>
      </View>

      {loading ? (
        <CardSkeleton height={200} />
      ) : (
        <SparklineChart title={`Stock Price (${selectedPeriod.toUpperCase()})`} data={stockPrices} />
      )}

      <View style={styles.summaryRow}>
        <StockSummaryCard label="Open" value={latestOpen ? `$${latestOpen.toFixed(2)}` : '--'} />
        <StockSummaryCard label="Close" value={latestClose ? `$${latestClose.toFixed(2)}` : '--'} />
      </View>

      <View style={styles.summaryRow}>
        <StockSummaryCard label="High" value={latestHigh ? `$${latestHigh.toFixed(2)}` : '--'} />
        <StockSummaryCard label="Low" value={latestLow ? `$${latestLow.toFixed(2)}` : '--'} />
      </View>

      <View style={styles.snapshotCard}>
        <Text style={styles.snapshotTitle}>Insider Snapshot</Text>
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotBadge}>
            <View style={[styles.snapshotDot, { backgroundColor: colors.buy }]} />
            <Text style={styles.snapshotText}>Purchases: {purchases}</Text>
          </View>
          <View style={styles.snapshotBadge}>
            <View style={[styles.snapshotDot, { backgroundColor: colors.sell }]} />
            <Text style={styles.snapshotText}>Sales: {sales}</Text>
          </View>
        </View>
        <Text style={styles.snapshotSignal}>Net signal: {netSignal}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SnoopButton
        title={loading ? 'Refreshing...' : 'Open Stock Detail'}
        onPress={() => navigation.navigate('StockDetail', { ticker: selectedTicker })}
        disabled={loading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  name: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryStrong,
  },
  selectedTicker: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  selectedName: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  snapshotCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  snapshotTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  snapshotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  snapshotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  snapshotText: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  snapshotSignal: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
});
