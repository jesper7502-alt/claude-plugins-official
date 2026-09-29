// Mjuk pastellblå palett. Sidan är alltid ljus, oavsett om enheten använder mörkt läge.
const colors = {
  bg: '#F2F5FC',
  surface: '#FFFFFF',
  surface2: '#E9EEF9',
  ink: '#1F2A44',
  muted: '#5E6A85',
  line: '#DCE3F2',
  /** Ytor och markeringar: knappar, bockar, valda chips. */
  accent: '#5B7FD6',
  accentInk: '#FFFFFF',
  accentSoft: '#E3E9FA',
  /** Blå text. Mörkare än accent så att den går att läsa på ljus bakgrund. */
  accentText: '#3E5BB0',
  warn: '#B0521E',
  warnSoft: '#FBEADF',
};

export type Colors = typeof colors;

export function useColors(): Colors {
  return colors;
}

/** Personfärger. Mjuka toner som passar paletten och bär vit text. */
export const PERSON_COLORS = ['#5B7FD6', '#8A6FCF', '#3E9BB8', '#D07A96', '#DB8752', '#4FA88A', '#B08A34', '#72819E'];

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
