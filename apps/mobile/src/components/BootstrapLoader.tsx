import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';

type Props = {
  message?: string;
};

/** Subtle branded loader for bootstrap / first paint. */
export function BootstrapLoader({ message }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      wrap: {
        alignItems: 'center',
        marginTop: t.spacing['2xl'],
        minHeight: 48,
      },
      ring: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: t.colors.secondary,
        borderTopColor: 'transparent',
      },
      message: {
        marginTop: t.spacing.lg,
        color: t.colors.shellForegroundMuted,
        fontFamily: t.typography.fontFamily.regular,
        fontSize: t.typography.fontSize.sm,
        letterSpacing: 0.2,
      },
    }),
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
    >
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}
