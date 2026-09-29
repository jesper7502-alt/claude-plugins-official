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
};

export type TaskInput = Pick<Task, 'title' | 'date' | 'repeat' | 'assignees'>;

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

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Upprepas inte',
  daily: 'Varje dag',
  weekdays: 'Vardagar',
  weekly: 'Varje vecka',
  biweekly: 'Varannan vecka',
  monthly: 'Varje månad',
};

export const doneKey = (taskId: string, date: string) => `${taskId}__${date}`;
