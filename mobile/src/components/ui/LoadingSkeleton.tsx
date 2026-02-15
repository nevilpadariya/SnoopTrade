import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../../theme/tokens';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated pulsing skeleton placeholder for loading states.
 * Cycles opacity between 0.3 and 0.7 for a breathing effect.
 */
export function LoadingSkeleton({
  width = '100%',
  height = 48,
  borderRadius = radius.md,
  style,
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton for a card with title + body area. */
export function CardSkeleton({ height = 180 }: { height?: number }) {
  return (
    <View style={styles.cardWrap}>
      <LoadingSkeleton width="40%" height={14} />
      <LoadingSkeleton width="100%" height={height - 40} borderRadius={radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceSoft,
  },
  cardWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
});
