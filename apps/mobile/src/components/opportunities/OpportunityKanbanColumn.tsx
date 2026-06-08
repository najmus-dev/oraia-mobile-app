import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, formatOpportunityMoney } from '../../lib/opportunities';
import { computeStageStats } from '../../lib/opportunityPipeline';
import { theme } from '../../theme';
import { OpportunityCard } from './OpportunityCard';

type Props = {
  stageName: string;
  opportunities: Opportunity[];
  onCreate: () => void;
  onOpen: (opportunity: Opportunity) => void;
  height?: number;
};

export function OpportunityKanbanColumn({
  stageName,
  opportunities,
  onCreate,
  onOpen,
  height = Dimensions.get('window').height * 0.58,
}: Props) {
  const stats = computeStageStats(opportunities);

  return (
    <View style={[styles.column, { height }]}>
      <Text style={styles.stageTitle} numberOfLines={2}>
        {stageName}
      </Text>
      <Text style={styles.stageMeta}>
        {stats.count} {stats.count === 1 ? 'Opportunity' : 'Opportunities'} |{' '}
        {formatOpportunityMoney(stats.totalValue) || '$0.00'}
      </Text>

      <Pressable style={styles.createBtn} onPress={onCreate}>
        <Ionicons name="add" size={18} color={theme.colors.textOnDark} />
        <Text style={styles.createText}>Create Opportunity</Text>
      </Pressable>

      <ScrollView
        style={styles.cardsScroll}
        contentContainerStyle={styles.cardsContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} onPress={() => onOpen(opp)} />
        ))}
      </ScrollView>
    </View>
  );
}

const COLUMN_WIDTH = 300;

const styles = StyleSheet.create({
  column: {
    width: COLUMN_WIDTH,
    marginRight: theme.spacing.md,
    backgroundColor: '#151A1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: theme.spacing.md,
  },
  stageTitle: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  stageMeta: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  createText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  cardsScroll: { flex: 1 },
  cardsContent: { paddingBottom: theme.spacing.sm },
});

export { COLUMN_WIDTH };
