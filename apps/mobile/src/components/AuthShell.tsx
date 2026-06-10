import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Shared dark canvas for splash-adjacent auth flows (login, location pick). */
export function AuthShell({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.ambient}>
        <View style={styles.ambientBlob} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.shell,
  },
  ambient: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientBlob: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(166, 150, 200, 0.1)',
  },
});
