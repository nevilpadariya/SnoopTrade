import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COMPANY_NAMES, TIME_PERIODS, TimePeriod } from '../../constants/companies';
import { HomeStackParamList, TabParamList } from '../../navigation/types';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SparklineChart } from '../../components/charts/SparklineChart';
import { StockSummaryCard } from '../../components/StockSummaryCard';
import { SnoopButton } from '../../components/ui/SnoopButton';
import { CardSkeleton, LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import { ApiError, fetchForecast, fetchStocks } from '../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<HomeStackParamList, 'StockDetail'>;

export function StockDetailScreen({ route, navigation }: Props) {
  const ticker = route.params.ticker;
  const { token, signOut } = useAuth();
  const {
    selectedPeriod,
    setSelectedPeriod,
    setSelectedTicker,
    stockSeriesByTicker,
    setStockSeries,
    setForecastSeries,
  } = useMarket();

  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedTicker(ticker);
  }, [ticker, setSelectedTicker]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const stocks = await fetchStocks(token, ticker, selectedPeriod);
        const sorted = [...stocks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setStockSeries(ticker, sorted);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load stock details.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, ticker, selectedPeriod, signOut, setStockSeries]);

  const stockRows = stockSeriesByTicker[ticker] || [];
  const priceSeries = useMemo(() => stockRows.map((row) => Number(row.open) || 0), [stockRows]);

  const latest = stockRows[stockRows.length - 1] || null;

  // Compute 52W High/Low from available data
  const { high52w, low52w } = useMemo(() => {
    if (!stockRows.length) return { high52w: null, low52w: null };
    const highs = stockRows.map((r) => Number(r.high) || 0);
    const lows = stockRows.map((r) => Number(r.low) || Infinity);
    return {
      high52w: Math.max(...highs),
      low52w: Math.min(...lows.filter((l) => l !== Infinity)),
    };
  }, [stockRows]);

  const onPredict = async () => {
    if (!token) {
      return;
    }

    if (!stockRows.length) {
      setError('No stock data available for forecast.');
      return;
    }

    setPredicting(true);
    setError('');

    try {
      const payload = stockRows.map((row) => ({
        date: (() => {
          const parsed = new Date(row.date);
          return Number.isNaN(parsed.getTime()) ? String(row.date).slice(0, 10) : parsed.toISOString().slice(0, 10);
        })(),
        open: Number(row.open) || 0,
        high: Number(row.high) || 0,
        low: Number(row.low) || 0,
        close: Number(row.close) || 0,
      }));

      const forecast = await fetchForecast(token, payload);
      setForecastSeries(ticker, forecast);
      const parentNav = navigation.getParent<BottomTabNavigationProp<TabParamList>>();
      parentNav?.navigate('Forecast');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Forecast failed. Please retry.');
      }
    } finally {
      setPredicting(false);
    }
  };

  return (
    <ScreenContainer>
      <View>
        <Text style={styles.title}>{ticker}</Text>
        <Text style={styles.subtitle}>{COMPANY_NAMES[ticker] || ticker}</Text>
      </View>

      {/* ── Period selector (matches wireframe Screen 3) ── */}
      <View style={styles.segmentWrap}>
        {TIME_PERIODS.map((period) => {
          const active = selectedPeriod === period.value;
          return (
            <Pressable
              key={period.value}
              onPress={() => setSelectedPeriod(period.value as TimePeriod)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{period.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <CardSkeleton height={240} />
      ) : (
        <SparklineChart title="Stock Price Trends" data={priceSeries} color={colors.accent} height={220} />
      )}

      <SnoopButton
        title={predicting ? 'Predicting...' : loading ? 'Loading data...' : 'Predict Future Trends'}
        onPress={onPredict}
        disabled={loading || predicting}
      />

      {/* ── 52W High / Low cards (matches wireframe Screen 3) ── */}
      <View style={styles.metricsWrap}>
        <View style={[styles.metricCard, styles.metricCardShadow]}>
          <Text style={styles.metricLabel}>52W High</Text>
          <Text style={[styles.metricValue, { color: colors.buy }]}>
            {high52w != null ? `$${high52w.toFixed(2)}` : '--'}
          </Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardShadow]}>
          <Text style={styles.metricLabel}>52W Low</Text>
          <Text style={[styles.metricValue, { color: colors.sell }]}>
            {low52w != null ? `$${low52w.toFixed(2)}` : '--'}
          </Text>
        </View>
      </View>

      {/* ── Latest Open / Close ── */}
      <View style={styles.metricsWrap}>
        <StockSummaryCard label="Latest Open" value={latest ? `$${Number(latest.open).toFixed(2)}` : '--'} />
        <StockSummaryCard label="Latest Close" value={latest ? `$${Number(latest.close).toFixed(2)}` : '--'} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  segmentWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#1A2A19',
  },
  metricsWrap: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  metricCardShadow: {
    ...shadow,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
});
