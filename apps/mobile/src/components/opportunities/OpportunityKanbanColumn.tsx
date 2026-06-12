import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Opportunity, formatOpportunityMoney } from '../../lib/opportunities';
import { computeStageStats } from '../../lib/opportunityPipeline';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { OraiaTheme } from '../../theme';
import { OpportunityCard } from './OpportunityCard';

type Props = {
  stageName: string;
  stageId: string;
  opportunities: Opportunity[];
  onCreate: () => void;
  onOpen: (opportunity: Opportunity) => void;
  onMove?: (opportunity: Opportunity) => void;
  height?: number;
};

export function OpportunityKanbanColumn({
  stageName,
  stageId,
  opportunities,
  onCreate,
  onOpen,
  onMove,
  height = Dimensions.get('window').height * 0.58,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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
        <Ionicons name="add" size={18} color={theme.colors.foreground} />
        <Text style={styles.createText}>Create Opportunity</Text>
      </Pressable>

      <ScrollView
        style={styles.cardsScroll}
        contentContainerStyle={styles.cardsContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            onPress={() => onOpen(opp)}
            onLongPress={onMove ? () => onMove(opp) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const COLUMN_WIDTH = 300;

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  column: {
    width: COLUMN_WIDTH,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  stageTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  stageMeta: {
    color: theme.colors.foregroundMuted,
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
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  createText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  cardsScroll: { flex: 1 },
  cardsContent: { paddingBottom: theme.spacing.sm },
});
}

export { COLUMN_WIDTH };
