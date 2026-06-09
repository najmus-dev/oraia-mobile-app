import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export function SettingsScreenHeader({
  title,
  onBack,
  paddingTop,
}: {
  title: string;
  onBack: () => void;
  paddingTop: number;
}) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn} accessibilityRole="button">
        <Ionicons name="arrow-back" size={22} color={theme.colors.white} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function SettingsSection({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function SettingsDivider() {
  return <View style={styles.divider} />;
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  chevronDirection?: 'forward' | 'down';
  destructive?: boolean;
  last?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = Boolean(onPress),
  chevronDirection = 'forward',
  destructive,
  last,
}: RowProps) {
  const content = (
    <>
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? theme.colors.danger : theme.colors.link}
        />
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {showChevron ? (
        <Ionicons
          name={chevronDirection === 'down' ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={theme.colors.mutedTextOnDark}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.row, !last && styles.rowBorder]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
}

export function SettingsProfileCard({
  initials,
  name,
  email,
  last,
}: {
  initials: string;
  name: string;
  email: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileInitials}>{initials}</Text>
      </View>
      <View style={styles.profileText}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
      </View>
    </View>
  );
}

export type AppearanceMode = 'light' | 'dark' | 'system';

export function SettingsAppearancePicker({
  value,
  onChange,
}: {
  value: AppearanceMode;
  onChange: (mode: AppearanceMode) => void;
}) {
  const options: { key: AppearanceMode; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];

  return (
    <View style={styles.segmentWrap}>
      {options.map((option) => {
        const active = value === option.key;
        return (
          <Pressable
            key={option.key}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsLogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.logoutBtn} onPress={onPress} accessibilityRole="button">
      <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
      <Text style={styles.logoutText}>Logout</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  group: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: 56,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
  rowLabelDestructive: {
    color: theme.colors.danger,
  },
  rowValue: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileInitials: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: theme.colors.textOnDark,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  profileEmail: {
    marginTop: 2,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
  },
  segmentWrap: {
    flexDirection: 'row',
    margin: theme.spacing.md,
    padding: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentText: {
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  segmentTextActive: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  logoutBtn: {
    marginTop: theme.spacing.sm,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
});
