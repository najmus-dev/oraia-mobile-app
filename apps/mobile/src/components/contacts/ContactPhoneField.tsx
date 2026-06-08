import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PrimaryBadge } from './PrimaryBadge';

type Props = {
  phoneType: string;
  countryCode: string;
  value: string;
  onPressType: () => void;
  onPressCountryCode: () => void;
  onChangeText: (text: string) => void;
};

export function ContactPhoneField({
  phoneType,
  countryCode,
  value,
  onPressType,
  onPressCountryCode,
  onChangeText,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Phone</Text>
        <PrimaryBadge />
      </View>

      <View style={styles.field}>
        <Pressable style={styles.typeBtn} onPress={onPressType} accessibilityRole="button">
          <Text style={styles.typeText} numberOfLines={1}>
            {phoneType}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.mutedTextOnDark} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.codeBtn}
          onPress={onPressCountryCode}
          accessibilityRole="button"
        >
          <Text style={styles.codeText}>{countryCode}</Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.mutedTextOnDark} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder="(555) 555-0100"
          placeholderTextColor={theme.colors.mutedText}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={countryCode === '+1' ? 14 : 20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    minHeight: 52,
    overflow: 'hidden',
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    maxWidth: 96,
  },
  typeText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    flexShrink: 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
  },
  codeText: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
  },
});
