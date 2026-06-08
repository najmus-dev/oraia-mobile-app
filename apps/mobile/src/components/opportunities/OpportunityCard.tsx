import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, formatOpportunityMoney } from '../../lib/opportunities';
import { theme } from '../../theme';

type Props = {
  opportunity: Opportunity;
  onPress: () => void;
};

export const OpportunityCard = React.memo(function OpportunityCard({ opportunity, onPress }: Props) {
  const valueLabel =
    opportunity.monetaryValue != null ? formatOpportunityMoney(opportunity.monetaryValue) : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={2}>
        {opportunity.name ?? 'Untitled'}
      </Text>
      {valueLabel ? <Text style={styles.value}>{valueLabel}</Text> : null}
      {opportunity.status && opportunity.status !== 'open' ? (
        <Text style={styles.status}>{opportunity.status}</Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  value: {
    marginTop: theme.spacing.xs,
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  status: {
    marginTop: theme.spacing.xs,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'capitalize',
  },
});
