import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { ContactFormValues } from '../../lib/contacts';

type Props = {
  values: ContactFormValues;
  onChange: (patch: Partial<ContactFormValues>) => void;
};

function DndRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={theme.colors.mutedTextOnDark} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
        thumbColor={theme.colors.white}
      />
    </View>
  );
}

export function ContactFormDndSection({ values, onChange }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assign DND settings</Text>
      <DndRow
        icon="notifications-off-outline"
        label="DND for all channels"
        value={values.dndAll}
        onValueChange={(dndAll) => onChange({ dndAll })}
      />
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>
      <DndRow
        icon="mail-outline"
        label="DND for Emails"
        value={values.dndEmail}
        onValueChange={(dndEmail) => onChange({ dndEmail, dndAll: false })}
      />
      <DndRow
        icon="chatbubble-ellipses-outline"
        label="DND for Text Messages"
        value={values.dndSms}
        onValueChange={(dndSms) => onChange({ dndSms, dndAll: false })}
      />
      <DndRow
        icon="call-outline"
        label="DND for Calls & Voicemails"
        value={values.dndCall}
        onValueChange={(dndCall) => onChange({ dndCall, dndAll: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  rowLabel: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  orText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
});
