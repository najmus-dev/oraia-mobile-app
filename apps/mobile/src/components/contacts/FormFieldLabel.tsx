import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { PrimaryBadge } from './PrimaryBadge';

type Props = {
  label: string;
  required?: boolean;
  primary?: boolean;
};

export function FormFieldLabel({ label, required, primary }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {primary ? <PrimaryBadge /> : null}
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  label: {
    flexShrink: 1,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  required: { color: theme.colors.danger },
});
}
