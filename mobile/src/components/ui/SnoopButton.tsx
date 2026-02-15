import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, shadow, typography } from '../../theme/tokens';

interface SnoopButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function SnoopButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: SnoopButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : colors.surfaceSoft;
  const textColor = variant === 'primary' ? '#182515' : variant === 'danger' ? colors.white : colors.text;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          variant === 'primary' && styles.primaryShadow,
          {
            backgroundColor,
            opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShadow: {
    ...shadow,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  text: {
    fontSize: typography.body,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
