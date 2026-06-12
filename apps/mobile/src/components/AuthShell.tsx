import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Shared canvas for splash-adjacent auth flows (login, location pick). */
export function AuthShell({ children, style }: Props) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: t.colors.shell,
      },
      ambient: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
      },
      ambientBlobPrimary: {
        position: 'absolute',
        top: -100,
        alignSelf: 'center',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: t.colors.isDark
          ? 'rgba(166, 150, 200, 0.10)'
          : 'rgba(212, 183, 216, 0.35)',
      },
      ambientBlobSecondary: {
        position: 'absolute',
        bottom: -80,
        right: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: t.colors.isDark
          ? 'rgba(47, 45, 121, 0.35)'
          : 'rgba(166, 150, 200, 0.25)',
      },
    }),
  );

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.ambient}>
        <View style={styles.ambientBlobPrimary} />
        <View style={styles.ambientBlobSecondary} />
      </View>
      {children}
    </View>
  );
}
