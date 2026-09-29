// Läser från Google Calendar API med en åtkomstnyckel från Google-inloggningen (bara läsrätt).

const API = 'https://www.googleapis.com/calendar/v3';

export type GoogleCalendar = { id: string; name: string; primary: boolean; color?: string };

/** Det lilla vi behöver av en kalenderhändelse. */
export type GoogleEvent = {
  /** Samma för en händelse i alla kalendrar den finns i. */
  iCalUID: string;
  summary: string;
  /** Heldag: date = "YYYY-MM-DD". Med tid: dateTime (ISO med tidszon). */
  start: { date?: string; dateTime?: string };
  /** Återkommande händelser delas upp per tillfälle; varje tillfälle har en egen originalStartTime. */
  originalStartTime?: { date?: string; dateTime?: string };
  status?: string;
};

/** Nyckeln har gått ut eller dragits tillbaka; admin behöver logga in med Google igen. */
export class TokenExpiredError extends Error {
  constructor() {
    super('Google-inloggningen har gått ut.');
  }
}

/** Inloggningen saknar läsrätt till kalendern (rutan för kalenderåtkomst kryssades inte i). */
export class MissingScopeError extends Error {
  constructor() {
    super('Google gav ingen läsrätt till kalendern.');
  }
}

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new TokenExpiredError();
  if (!res.ok) {
    let message = `Google svarade ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // Ingen JSON i felet; behåll statuskoden.
    }
    if (res.status === 403 && /insufficient authentication scopes|insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(message)) {
      throw new MissingScopeError();
    }
    throw new GoogleApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export async function listCalendars(token: string): Promise<GoogleCalendar[]> {
  const out: GoogleCalendar[] = [];
  let pageToken: string | undefined;
  do {
    const page = await get<{
      items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean; backgroundColor?: string }[];
      nextPageToken?: string;
    }>(token, '/users/me/calendarList', { maxResults: '250', ...(pageToken ? { pageToken } : {}) });
    for (const c of page.items ?? []) {
      out.push({ id: c.id, name: c.summaryOverride || c.summary || c.id, primary: !!c.primary, color: c.backgroundColor });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out.sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name, 'sv'));
}

/** Händelser i [timeMin, timeMax), med återkommande händelser uppdelade i enskilda tillfällen. */
export async function listEvents(token: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<GoogleEvent[]> {
  const out: GoogleEvent[] = [];
  let pageToken: string | undefined;
  do {
    const page = await get<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: '2500',
        fields: 'items(iCalUID,summary,start,originalStartTime,status),nextPageToken',
        ...(pageToken ? { pageToken } : {}),
      },
    );
    out.push(...(page.items ?? []).filter((e) => e.status !== 'cancelled'));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}
