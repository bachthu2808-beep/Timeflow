import { Platform } from 'react-native';
import { colors } from './colors';

export { colors };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Tabular-figure font for money/time/counters, echoing the reference design's ledger feel. */
export const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const typography = {
  heading: { fontWeight: '800' as const, letterSpacing: -0.3 },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  mono: { fontFamily: monoFont, fontVariant: ['tabular-nums'] as const },
};

export const shadow = {
  shadowColor: '#0F2B1E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
