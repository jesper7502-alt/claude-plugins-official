// Räknar ut hur tasks ska ändras efter en hämtning från Google Kalender. Ren funktion utan nätverk,
// så att logiken går att testa för sig.

import type { CalendarTaskChanges, CalendarTaskFields } from '../backend/types';
import { toIso } from '../dates';
import type { Task } from '../types';
import type { GoogleEvent } from './google';

/** Stabilt id för ett kalendertillfälle, så att samma händelse alltid blir samma task. */
export function calendarTaskId(e: GoogleEvent): string {
  const when = e.originalStartTime?.dateTime ?? e.originalStartTime?.date ?? e.start.dateTime ?? e.start.date ?? '';
  return `gcal_${hash(`${e.iCalUID}|${when}`)}`;
}

/** cyrb53: snabb 53-bitars hash, bara för att få korta id:n utan specialtecken. */
function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Titeln utan nyckelordet, eller null om nyckelordet inte finns i titeln. */
export function titleWithoutKeyword(summary: string, keyword: string): string | null {
  const k = keyword.trim();
  if (!k) return summary.trim() || null;
  const re = new RegExp(escapeRegExp(k), 'gi');
  if (!re.test(summary)) return null;
  const title = summary.replace(re, ' ').replace(/\s+/g, ' ').trim().replace(/^[:\-–·]\s*/, '');
  return title || null;
}

function dateAndTime(e: GoogleEvent): { date: string; time: string | null } | null {
  if (e.start.date) return { date: e.start.date, time: null };
  if (!e.start.dateTime) return null;
  const d = new Date(e.start.dateTime);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: toIso(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export type FetchedCalendar = {
  /** Personerna som är kopplade till kalendern. */
  personIds: string[];
  events: GoogleEvent[];
};

/**
 * Jämför hämtade händelser med befintliga kalendertasks.
 * Bara tasks inom fönstret [fromDate, toDate) tas bort; äldre kalendertasks lämnas orörda.
 */
export function planCalendarSync(
  existing: Task[],
  fetched: FetchedCalendar[],
  keyword: string,
  fromDate: string,
  toDate: string,
): CalendarTaskChanges {
  const wanted = new Map<string, CalendarTaskFields>();
  for (const cal of fetched) {
    for (const e of cal.events) {
      const title = titleWithoutKeyword(e.summary ?? '', keyword);
      const when = dateAndTime(e);
      if (!title || !when || when.date < fromDate || when.date >= toDate) continue;
      const id = calendarTaskId(e);
      const prev = wanted.get(id);
      // Finns händelsen i flera personers kalendrar blir tasken gemensam.
      const assignees = [...new Set([...(prev?.assignees ?? []), ...cal.personIds])].sort();
      wanted.set(id, { title: title.slice(0, 120), date: when.date, time: when.time, assignees });
    }
  }

  const byId = new Map(existing.filter((t) => t.source === 'gcal').map((t) => [t.id, t]));
  const changes: CalendarTaskChanges = { create: [], update: [], remove: [] };

  for (const [id, fields] of wanted) {
    if (!fields.assignees.length) continue;
    const t = byId.get(id);
    if (!t) changes.create.push({ id, fields });
    else if (
      t.title !== fields.title ||
      t.date !== fields.date ||
      (t.time ?? null) !== fields.time ||
      [...t.assignees].sort().join() !== fields.assignees.join()
    ) {
      changes.update.push({ id, fields });
    }
  }
  for (const t of byId.values()) {
    if (!wanted.has(t.id) && t.date >= fromDate && t.date < toDate) changes.remove.push(t.id);
  }
  return changes;
}
