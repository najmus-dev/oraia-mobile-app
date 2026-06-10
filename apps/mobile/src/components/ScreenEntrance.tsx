import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Soft fade-in after native splash — avoids a hard cut to the first screen. */
export function ScreenEntrance({ children, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.root, style, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
