export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly';

export type Person = {
  id: string;
  name: string;
  color: string;
  /** Nyckel i ANIMALS (t.ex. "fox"). Saknas den visas initialer. */
  animal?: string;
  createdAt: number;
};

export type Task = {
  id: string;
  title: string;
  /** Första (eller enda) dagen, YYYY-MM-DD. */
  date: string;
  repeat: Repeat;
  assignees: string[];
  createdAt: number;
  /** 'gcal' för tasks som skapats från Google Kalender. Sådana ändras bara via kalendern. */
  source?: 'gcal';
  /** Klockslag "HH:MM". Saknas för tasks utan tid. */
  time?: string;
};

/** `time: null` betyder ingen tid. */
export type TaskInput = Pick<Task, 'title' | 'date' | 'repeat' | 'assignees'> & { time: string | null };

/** En avbockad förekomst. Id är alltid `${taskId}__${date}`. */
export type Done = {
  id: string;
  taskId: string;
  title: string;
  date: string;
  assignees: string[];
  doneBy: string;
  doneByName: string;
  /** Millisekunder sedan epoch. */
  doneAt: number;
};

/**
 * admin: planerar och bockar av. member: ser och bockar av.
 * none: inloggad men kontot finns varken i admins eller members.
 */
export type Role = 'admin' | 'member' | 'none';

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; email: string | null; uid: string; role: Role };

/** En Google-kalender som kopplats till en person. */
export type LinkedCalendar = { id: string; name: string };

/** Inställningar för hämtning från Google Kalender. Bara admin kan läsa och ändra dem. */
export type CalendarSettings = {
  /** Bara händelser vars titel innehåller ordet blir tasks, t.ex. "#task". */
  keyword: string;
  /** Person-id → kalender. */
  calendars: Record<string, LinkedCalendar>;
  lastSync?: number;
  lastResult?: string;
};

export const DEFAULT_KEYWORD = '#task';

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Upprepas inte',
  daily: 'Varje dag',
  weekdays: 'Vardagar',
  weekly: 'Varje vecka',
  biweekly: 'Varannan vecka',
  monthly: 'Varje månad',
};

export const doneKey = (taskId: string, date: string) => `${taskId}__${date}`;
