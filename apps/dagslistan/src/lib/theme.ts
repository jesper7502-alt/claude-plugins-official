import { useColorScheme } from 'react-native';

const light = {
  bg: '#F3F6F4',
  surface: '#FFFFFF',
  surface2: '#EAF0ED',
  ink: '#15201B',
  muted: '#5B6963',
  line: '#DBE3DF',
  accent: '#1E6B57',
  accentInk: '#FFFFFF',
  accentSoft: '#DDEEE7',
  warn: '#A8501C',
  warnSoft: '#F7E6DA',
};

const dark: typeof light = {
  bg: '#0F1412',
  surface: '#171E1B',
  surface2: '#1F2824',
  ink: '#E6EDEA',
  muted: '#94A39C',
  line: '#2A3531',
  accent: '#5CC0A0',
  accentInk: '#0D1A15',
  accentSoft: '#1C3A30',
  warn: '#E59767',
  warnSoft: '#3A261A',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Personfärger. Mellantoner med vit text som fungerar i både ljust och mörkt läge. */
export const PERSON_COLORS = ['#2F7D6D', '#3A63A8', '#9A4F9E', '#B5602F', '#6F7A1F', '#B23A5A', '#2B8499', '#6B5CC2'];

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
