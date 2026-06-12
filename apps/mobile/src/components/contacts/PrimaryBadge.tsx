import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';

type Props = {
  label?: string;
};

export function PrimaryBadge({ label = 'Primary' }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: `${theme.colors.primary}24`,
    },
    text: {
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.2,
    },
  });
}
