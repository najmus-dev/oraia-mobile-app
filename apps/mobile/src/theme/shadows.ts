import type { ViewStyle } from 'react-native';

export type ShadowSet = {
  card: ViewStyle;
  fab: ViewStyle;
  sheet: ViewStyle;
};

export const shadowsDark: ShadowSet = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  fab: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
};

export const shadowsLight: ShadowSet = {
  card: {
    shadowColor: paletteShadowNavy(),
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  fab: {
    shadowColor: paletteShadowNavy(),
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: paletteShadowNavy(),
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
};

function paletteShadowNavy(): string {
  return '#0E1323';
}
