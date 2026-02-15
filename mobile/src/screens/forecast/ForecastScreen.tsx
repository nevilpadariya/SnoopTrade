import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { ForecastChart } from '../../components/charts/ForecastChart';
import { useMarket } from '../../context/MarketContext';
import { colors, radius, shadow, spacing, typography } from '../../theme/tokens';

function formatPctChange(forecastPrice: number, referencePrice: number): { text: string; color: string } {
  if (!referencePrice || !forecastPrice) return { text: '--', color: colors.textMuted };
  const pct = ((forecastPrice - referencePrice) / referencePrice) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    color: pct >= 0 ? colors.primary : colors.danger,
  };
}

export function ForecastScreen() {
  const { selectedTicker, forecastByTicker, stockSeriesByTicker } = useMarket();
  const forecast = forecastByTicker[selectedTicker] || [];
  const stockRows = stockSeriesByTicker[selectedTicker] || [];

  const latestClose = stockRows.length
    ? Number(stockRows[stockRows.length - 1]?.close) || 0
    : 0;

  const tomorrow = forecast[0];
  const day7 = forecast[6];

  const tomorrowPct = tomorrow ? formatPctChange(Number(tomorrow.open), latestClose) : null;
  const day7Pct = day7 ? formatPctChange(Number(day7.open), latestClose) : null;

  return (
    <ScreenContainer>
      <View>
        <Text style={styles.title}>Forecast (30d)</Text>
        <Text style={styles.subtitle}>{selectedTicker} — generated from latest OHLC data</Text>
      </View>

      <ForecastChart data={forecast} />

      {/* ── Forecast cards with % change (matches wireframe Screen 4) ── */}
      <View style={[styles.card, styles.cardShadow]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.label}>Tomorrow</Text>
            <Text style={styles.value}>{tomorrow ? `$${Number(tomorrow.open).toFixed(2)}` : '--'}</Text>
          </View>
          {tomorrowPct && (
            <Text style={[styles.pctBadge, { color: tomorrowPct.color }]}>{tomorrowPct.text}</Text>
          )}
        </View>
      </View>

      <View style={[styles.card, styles.cardShadow]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.label}>In 7 days</Text>
            <Text style={styles.value}>{day7 ? `$${Number(day7.open).toFixed(2)}` : '--'}</Text>
          </View>
          {day7Pct && (
            <Text style={[styles.pctBadge, { color: day7Pct.color }]}>{day7Pct.text}</Text>
          )}
        </View>
      </View>

      {!forecast.length ? (
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>No forecast yet</Text>
          <Text style={styles.hintText}>Open a ticker in Stock Detail and tap "Predict Future Trends" first.</Text>
        </View>
      ) : null}
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardShadow: {
    ...shadow,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  value: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  pctBadge: {
    fontSize: typography.h3,
    fontWeight: '700',
  },
  hintCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hintTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '600',
  },
  hintText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
