import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { GoogleToken } from '../backend/types';
import { addDays, parseIso, today } from '../dates';
import { useStore } from '../store';
import { DEFAULT_KEYWORD, type CalendarSettings, type LinkedCalendar } from '../types';
import { GoogleApiError, listCalendars, listEvents, MissingScopeError, TokenExpiredError, type GoogleCalendar } from './google';
import { planCalendarSync, type FetchedCalendar } from './plan';

/** Hur ofta kalendern hämtas medan admin har sidan öppen. */
const SYNC_EVERY_MS = 15 * 60 * 1000;
/** Hur långt fram händelser hämtas. */
const WINDOW_DAYS = 30;
const TOKEN_KEY = 'dagslistan.gcal.token';
/** Satt när Google inte gav läsrätt; nästa inloggning visar då behörighetsrutan igen. */
const CONSENT_KEY = 'dagslistan.gcal.forceConsent';

type Status = 'idle' | 'connecting' | 'syncing';

type CalendarState = {
  /** Kalendern kräver Firebase och admin. */
  available: boolean;
  settings: CalendarSettings;
  /** Det finns en giltig Google-nyckel just nu. */
  connected: boolean;
  status: Status;
  error: string | null;
  /** Kalendrarna i det kopplade Google-kontot (laddas när man är ansluten). */
  calendars: GoogleCalendar[] | null;
  /** Loggar in med Google. Resolvar true om det lyckades. */
  connect: () => Promise<boolean>;
  sync: () => Promise<void>;
  setPersonCalendar: (personId: string, calendar: LinkedCalendar | null) => Promise<void>;
  setKeyword: (keyword: string) => Promise<void>;
};

const Ctx = createContext<CalendarState | null>(null);

// Nyckeln sparas bara i fliken (sessionStorage), aldrig i databasen, och gäller en timme.
function loadToken(): GoogleToken | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(TOKEN_KEY);
    const t = raw ? (JSON.parse(raw) as GoogleToken) : null;
    return t && t.expiresAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}
function saveToken(t: GoogleToken | null) {
  try {
    if (t) globalThis.sessionStorage?.setItem(TOKEN_KEY, JSON.stringify(t));
    else globalThis.sessionStorage?.removeItem(TOKEN_KEY);
  } catch {
    // Utan sessionStorage gäller nyckeln tills sidan laddas om.
  }
}

function getForceConsent(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}
function setForceConsent(on: boolean) {
  try {
    if (on) globalThis.sessionStorage?.setItem(CONSENT_KEY, '1');
    else globalThis.sessionStorage?.removeItem(CONSENT_KEY);
  } catch {
    // Utan sessionStorage frågar Google som vanligt.
  }
}

function connectErrorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'gcal/demo') return 'Google Kalender fungerar när Firebase är inställt, inte i demoläget.';
  if (code === 'auth/popup-blocked') return 'Webbläsaren blockerade inloggningsfönstret. Tillåt popup-fönster för sidan och försök igen.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Inloggningen avbröts.';
  if (code === 'auth/credential-already-in-use')
    return 'Det Google-kontot är redan kopplat till ett annat konto i Dagslistan. Välj ett annat Google-konto.';
  if (code === 'auth/user-mismatch') return 'Välj samma Google-konto som du kopplade första gången.';
  if (code === 'auth/operation-not-allowed') return 'Google-inloggning är inte påslagen i Firebase (Authentication → Sign-in method → Google).';
  if (code === 'auth/unauthorized-domain') return 'Den här adressen är inte godkänd i Firebase (Authentication → Settings → Authorized domains).';
  return 'Det gick inte att koppla Google Kalender. Försök igen.';
}

function syncErrorText(e: unknown): string {
  if (e instanceof TokenExpiredError) return 'Google-inloggningen har gått ut. Tryck på Hämta från kalendern för att logga in igen.';
  if (e instanceof MissingScopeError)
    return 'Google gav ingen läsrätt till kalendern. Logga in igen och kryssa i rutan för kalenderåtkomst (”Se och ladda ned alla kalendrar …”) innan du fortsätter.';
  if (e instanceof GoogleApiError) {
    if (e.status === 403 && /has not been used|is disabled/i.test(e.message))
      return 'Google Calendar API är inte påslaget för projektet. Slå på det i Google Cloud Console (se README).';
    if (e.status === 404) return 'En kopplad kalender hittades inte. Välj kalender igen för personen.';
    return `Google svarade med ett fel: ${e.message}`;
  }
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return 'Du har inte behörighet att spara kalendertasks.';
  return 'Det gick inte att hämta från kalendern. Kontrollera nätet och försök igen.';
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const s = useStore();
  const backend = s.backend;
  const available = s.isAdmin;

  const [settings, setSettings] = useState<CalendarSettings>({ keyword: DEFAULT_KEYWORD, calendars: {} });
  const [token, setTokenState] = useState<GoogleToken | null>(() => loadToken());
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[] | null>(null);

  const setToken = useCallback((t: GoogleToken | null) => {
    saveToken(t);
    setTokenState(t);
  }, []);

  useEffect(() => {
    if (!available) return;
    return backend.subscribeCalendarSettings((v) => setSettings(v ?? { keyword: DEFAULT_KEYWORD, calendars: {} }));
  }, [backend, available]);

  // Nyckeln går ut efter en timme; släpp den då så att knappen för att logga in igen visas.
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => setToken(null), Math.max(0, token.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [token, setToken]);

  // Läs alltid senaste data i hämtningen, utan att starta om timern varje gång något ändras.
  const latest = useRef({ tasks: s.tasks, people: s.people, settings, token });
  useEffect(() => {
    latest.current = { tasks: s.tasks, people: s.people, settings, token };
  }, [s.tasks, s.people, settings, token]);
  const busy = useRef(false);

  const runSync = useCallback(
    async (tok: GoogleToken) => {
      const { tasks, people, settings: cfg } = latest.current;
      const alive = new Set(people.map((p) => p.id));
      const byCalendar = new Map<string, { name: string; personIds: string[] }>();
      for (const [pid, cal] of Object.entries(cfg.calendars)) {
        if (!alive.has(pid)) continue;
        const entry = byCalendar.get(cal.id) ?? { name: cal.name, personIds: [] };
        entry.personIds.push(pid);
        byCalendar.set(cal.id, entry);
      }
      if (!byCalendar.size || busy.current) return;
      busy.current = true;
      setStatus('syncing');
      setError(null);
      try {
        const from = today();
        const to = addDays(from, WINDOW_DAYS);
        const fetched: FetchedCalendar[] = [];
        // Hämta allt först; skrivs inget om någon kalender misslyckas, så att inga tasks tas bort av misstag.
        for (const [calendarId, { personIds }] of byCalendar) {
          fetched.push({ personIds, events: await listEvents(tok.token, calendarId, parseIso(from), parseIso(to)) });
        }
        const changes = planCalendarSync(tasks, fetched, cfg.keyword, from, to);
        await backend.applyCalendarTasks(changes);
        const n = changes.create.length + changes.update.length + changes.remove.length;
        const summary = n
          ? [
              changes.create.length && `${changes.create.length} nya`,
              changes.update.length && `${changes.update.length} ändrade`,
              changes.remove.length && `${changes.remove.length} borttagna`,
            ]
              .filter(Boolean)
              .join(', ')
          : 'Inga ändringar';
        await backend.setCalendarSettings({ lastSync: Date.now(), lastResult: summary });
      } catch (e) {
        if (e instanceof TokenExpiredError || e instanceof MissingScopeError) setToken(null);
        if (e instanceof MissingScopeError) setForceConsent(true);
        setError(syncErrorText(e));
      } finally {
        busy.current = false;
        setStatus('idle');
      }
    },
    [backend, setToken],
  );

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const tok = await backend.connectGoogleCalendar({ forceConsent: getForceConsent() });
      setForceConsent(false);
      setToken(tok);
      setCalendars(null);
      setStatus('idle');
      void runSync(tok);
      return true;
    } catch (e) {
      setError(connectErrorText(e));
      setStatus('idle');
      return false;
    }
  }, [backend, setToken, runSync]);

  const sync = useCallback(async () => {
    const tok = latest.current.token;
    if (tok) await runSync(tok);
    else await connect();
  }, [runSync, connect]);

  // Automatisk hämtning: när data finns, var 15:e minut och när fliken blir aktiv igen.
  const hasLinks = Object.keys(settings.calendars).length > 0;
  const ready = available && s.ready && !!token && hasLinks;
  useEffect(() => {
    if (!ready) return;
    const maybeSync = () => {
      const { token: tok, settings: cfg } = latest.current;
      if (tok && Date.now() - (cfg.lastSync ?? 0) >= SYNC_EVERY_MS - 5000) void runSync(tok);
    };
    maybeSync();
    const timer = setInterval(maybeSync, 60 * 1000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && maybeSync());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, runSync]);

  // Hämta listan med kalendrar när det finns en nyckel men listan saknas (t.ex. efter omladdning).
  useEffect(() => {
    if (!available || !token || calendars) return;
    let cancelled = false;
    listCalendars(token.token)
      .then((list) => !cancelled && setCalendars(list))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof TokenExpiredError || e instanceof MissingScopeError) setToken(null);
        if (e instanceof MissingScopeError) setForceConsent(true);
        setError(syncErrorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [available, token, calendars, setToken]);

  const value = useMemo<CalendarState>(
    () => ({
      available,
      settings,
      connected: !!token,
      status,
      error,
      calendars,
      connect,
      sync,
      setPersonCalendar: async (personId, calendar) => {
        await backend.setPersonCalendar(personId, calendar);
      },
      setKeyword: async (keyword) => {
        await backend.setCalendarSettings({ keyword: keyword.trim() || DEFAULT_KEYWORD, lastSync: 0 });
      },
    }),
    [available, settings, token, status, error, calendars, connect, sync, backend],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCalendar(): CalendarState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCalendar måste användas inuti CalendarProvider');
  return c;
}
