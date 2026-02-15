import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface SparklineChartProps {
  title: string;
  data: number[];
  color?: string;
  height?: number;
}

function buildLinePath(data: number[], width: number, height: number, padding = 12): string {
  if (data.length === 0) {
    return '';
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return data
    .map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * usableWidth;
      const y = padding + (1 - (value - min) / range) * usableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export const SparklineChart = React.memo(function SparklineChart({
  title,
  data,
  color = colors.accent,
  height = 180,
}: SparklineChartProps) {
  const width = 310;
  const path = useMemo(() => buildLinePath(data, width, height), [data, width, height]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {data.length > 0 ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="12" y1={height - 12} x2={width - 12} y2={height - 12} stroke="#3B4A40" strokeWidth="1" />
          <Path d={path} stroke={color} strokeWidth="3" fill="none" />
        </Svg>
      ) : (
        <View style={[styles.empty, { height }]}>
          <Text style={styles.emptyText}>No chart data yet</Text>
        </View>
      )}
    </View>
  );
}, (prev, next) => {
  // Custom comparator: only re-render if data actually changed
  return (
    prev.data.length === next.data.length &&
    prev.data[prev.data.length - 1] === next.data[next.data.length - 1] &&
    prev.title === next.title &&
    prev.color === next.color &&
    prev.height === next.height
  );
});

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
});
