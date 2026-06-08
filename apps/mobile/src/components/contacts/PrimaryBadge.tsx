import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

type Props = {
  label?: string;
};

export function PrimaryBadge({ label = 'Primary' }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(47, 45, 121, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(134, 182, 255, 0.35)',
  },
  text: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.xs,
  },
});
