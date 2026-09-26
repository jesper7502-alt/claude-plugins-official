import type { Task } from './types';

// Egna svenska namn i stället för Intl, så att formatet blir detsamma på alla plattformar.
const WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
const WEEKDAYS_SHORT = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
export const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => toIso(new Date());

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Dagnummer i UTC, så att sommartid inte ger fel antal dagar. */
function dayNumber(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatShort(s: string): string {
  const d = parseIso(s);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatLong(s: string): string {
  const d = parseIso(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "I dag", "I morgon", "I går" eller "Lör 26 sep". */
export function relativeDay(s: string): string {
  const t = today();
  if (s === t) return 'I dag';
  if (s === addDays(t, 1)) return 'I morgon';
  if (s === addDays(t, -1)) return 'I går';
  return cap(formatShort(s));
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7);
}

/** Ska tasken göras den här dagen? */
export function occursOn(t: Pick<Task, 'date' | 'repeat'>, day: string): boolean {
  if (!t.date || day < t.date) return false;
  const diff = dayNumber(day) - dayNumber(t.date);
  switch (t.repeat) {
    case 'daily':
      return true;
    case 'weekdays': {
      const w = parseIso(day).getDay();
      return w > 0 && w < 6;
    }
    case 'weekly':
      return diff % 7 === 0;
    case 'biweekly':
      return diff % 14 === 0;
    case 'monthly': {
      const a = parseIso(t.date);
      const b = parseIso(day);
      const last = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
      return b.getDate() === Math.min(a.getDate(), last);
    }
    default:
      return day === t.date;
  }
}
