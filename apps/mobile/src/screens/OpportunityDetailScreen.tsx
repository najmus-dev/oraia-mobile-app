import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, withAuthHeaders } from '../lib/api';
import { formatError } from '../lib/errors';
import { useFullScreenBottomInset } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { useAppState } from '../state/AppState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { ChipSelect } from '../components/ChipSelect';
import { DetailRow } from '../components/DetailRow';
import { contactDisplayName, type Contact, type ContactResponse } from '../lib/contacts';
import { navigateToContactDetail } from '../lib/navigation';
import { finishWizardFlow, popWizardBack } from '../lib/stackNavigation';
import {
  type Opportunity,
  type Pipeline,
  formatOpportunityMoney,
} from '../lib/opportunities';

import type { AppsStackParamList } from '../navigation/AppsStack';

type Props = NativeStackScreenProps<AppsStackParamList, 'OpportunityDetail'>;

export function OpportunityDetailScreen({ navigation, route }: Props) {
  const { opportunityId, title: routeTitle } = route.params;
  const scrollBottom = useFullScreenBottomInset();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { token, locationId } = useAppState();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stageId, setStageId] = useState('');
  const [contactName, setContactName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    try {
      const [oppRes, pipeRes] = await Promise.all([
        api.getJson<{ opportunity: Opportunity }>(`/api/opportunities/${opportunityId}`, {
          headers: withAuthHeaders({ token, locationId }),
        }),
        api.getJson<{ pipelines: Pipeline[] }>('/api/opportunities/pipelines', {
          headers: withAuthHeaders({ token, locationId }),
        }),
      ]);
      const opp = oppRes.opportunity;
      setOpportunity(opp);
      setPipelines(pipeRes.pipelines ?? []);
      setStageId(opp?.pipelineStageId ?? '');
      const cid = opp?.contactId?.trim();
      if (cid) {
        try {
          const contactRes = await api.getJson<ContactResponse>(`/api/contacts/${cid}`, {
            headers: withAuthHeaders({ token, locationId }),
          });
          setContactName(contactDisplayName(contactRes.contact));
        } catch {
          setContactName(null);
        }
      } else {
        setContactName(null);
      }
    } catch (e) {
      Alert.alert('Opportunity', formatError(e));
    } finally {
      setLoading(false);
    }
  }, [token, locationId, opportunityId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [load]);

  const stages = useMemo(() => {
    return pipelines.find((p) => p.id === opportunity?.pipelineId)?.stages ?? [];
  }, [pipelines, opportunity?.pipelineId]);

  function confirmDelete() {
    Alert.alert(
      'Delete opportunity',
      'This removes the deal from GHL. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          deleteOpportunity();
        }},
      ],
    );
  }

  async function deleteOpportunity() {
    if (!token || !locationId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/opportunities/${opportunityId}`, {
        headers: withAuthHeaders({ token, locationId }),
      });
      finishWizardFlow(navigation, { name: 'PipelineHome' });
    } catch (e) {
      Alert.alert('Delete failed', formatError(e));
    } finally {
      setDeleting(false);
    }
  }

  async function moveStage() {
    if (!token || !locationId || !stageId) return;
    setSaving(true);
    try {
      await api.putJson(
        `/api/opportunities/${opportunityId}`,
        { pipelineStageId: stageId },
        { headers: withAuthHeaders({ token, locationId }) },
      );
      Alert.alert('Updated', 'Opportunity moved to new stage.');
      await load();
    } catch (e) {
      Alert.alert('Update failed', formatError(e));
    } finally {
      setSaving(false);
    }
  }

  const title = opportunity?.name ?? routeTitle ?? 'Opportunity';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={loading ? 'Loading…' : (opportunity?.status ?? 'open')}
        onBack={() => popWizardBack(navigation, 'PipelineHome')}
        actionIcon="create-outline"
        onAction={() =>
          navigation.navigate('OpportunityForm', { opportunityId })
        }
        actionAccessibilityLabel="Edit opportunity"
      />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: scrollBottom }]}>
        <DetailRow label="Value" value={formatOpportunityMoney(opportunity?.monetaryValue)} />
        <DetailRow
          label="Contact"
          value={contactName ?? opportunity?.contactId ?? undefined}
          onPress={
            opportunity?.contactId?.trim()
              ? () => navigateToContactDetail(navigation, opportunity.contactId!.trim())
              : undefined
          }
        />

        <Text style={styles.sectionTitle}>Move to stage</Text>
        {stages.length > 0 ? (
          <ChipSelect
            options={stages.map((s) => ({ id: s.id, label: s.name }))}
            value={stageId}
            onChange={setStageId}
          />
        ) : (
          <Text style={styles.muted}>No stages available for this pipeline.</Text>
        )}

        <Button
          title={saving ? 'Updating…' : 'Update stage'}
          onPress={moveStage}
          disabled={saving || deleting || !stageId || loading}
          style={{ marginTop: theme.spacing.lg }}
        />

        <Button
          title={deleting ? 'Deleting…' : 'Delete opportunity'}
          onPress={confirmDelete}
          disabled={deleting || saving || loading}
          variant="danger"
          style={{ marginTop: theme.spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { padding: theme.spacing.xl, gap: theme.spacing.md },
  sectionTitle: {
    marginTop: theme.spacing.lg,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  muted: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
});
}
