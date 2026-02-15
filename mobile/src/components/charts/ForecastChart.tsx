import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { ForecastPoint } from '../../types/api';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface ForecastChartProps {
  data: ForecastPoint[];
}

function normalize(data: number[], width: number, height: number, padding = 12): Array<{ x: number; y: number }> {
  if (!data.length) {
    return [];
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return data.map((value, idx) => ({
    x: padding + (idx / Math.max(data.length - 1, 1)) * usableWidth,
    y: padding + (1 - (value - min) / range) * usableHeight,
  }));
}

function toPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function ForecastChart({ data }: ForecastChartProps) {
  const width = 310;
  const height = 220;

  const { openPath, trendPath, areaPath } = useMemo(() => {
    if (!data.length) {
      return { openPath: '', trendPath: '', areaPath: '' };
    }

    const openPoints = normalize(data.map((item) => item.open), width, height);
    const trendPoints = normalize(data.map((item) => item.trend), width, height);
    const upper = normalize(data.map((item) => item.yhat_upper), width, height);
    const lower = normalize(data.map((item) => item.yhat_lower), width, height);

    const open = toPath(openPoints);
    const trend = toPath(trendPoints);
    const area = `${toPath(upper)} ${lower.reverse().map((point) => `L ${point.x} ${point.y}`).join(' ')} Z`;

    return { openPath: open, trendPath: trend, areaPath: area };
  }, [data]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Predicted Price (30 Days)</Text>
      {data.length > 0 ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="12" y1={height - 12} x2={width - 12} y2={height - 12} stroke="#3B4A40" strokeWidth="1" />
          <Path d={areaPath} fill={colors.primary} fillOpacity={0.18} stroke="none" />
          <Path d={trendPath} stroke="#738678" strokeWidth="2" fill="none" strokeDasharray="5 6" />
          <Path d={openPath} stroke={colors.primary} strokeWidth="3" fill="none" />
        </Svg>
      ) : (
        <View style={[styles.empty, { height }]}>
          <Text style={styles.emptyText}>Run forecast from Stock Detail first</Text>
        </View>
      )}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Forecast</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#738678' }]} />
          <Text style={styles.legendText}>Trend</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.35 }]} />
          <Text style={styles.legendText}>Confidence</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  empty: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
