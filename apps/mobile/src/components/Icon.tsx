import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../hooks/useTheme';

export type AppIconName =
  | 'home'
  | 'inbox'
  | 'contacts'
  | 'calendar'
  | 'deals'
  | 'refresh'
  | 'settings'
  | 'back'
  | 'search'
  | 'filter'
  | 'star'
  | 'dnd'
  | 'more'
  | 'mail'
  | 'phone'
  | 'plus'
  | 'user';

const glyph: Record<AppIconName, string> = {
  home: '⌂',
  inbox: '✉',
  contacts: '👥',
  calendar: '◷',
  deals: '◉',
  refresh: '↻',
  settings: '⚙',
  back: '‹',
  search: '⌕',
  filter: '⇅',
  star: '☆',
  dnd: '☾',
  more: '⋮',
  mail: '✉',
  phone: '⌁',
  plus: '+',
  user: '○',
};

export function Icon({
  name,
  color,
  style,
}: {
  name: AppIconName;
  color?: string;
  style?: TextStyle;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(() =>
    StyleSheet.create({
      base: {
        fontSize: 18,
        lineHeight: 18,
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  );

  return (
    <Text style={[styles.base, { color: color ?? theme.colors.white }, style]} accessibilityRole="image">
      {glyph[name]}
    </Text>
  );
}
