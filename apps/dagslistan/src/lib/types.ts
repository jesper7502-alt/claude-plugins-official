export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly';

export type Person = {
  id: string;
  name: string;
  color: string;
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

export type Session = {
  /** Inloggad planerare (inte anonym). */
  signedIn: boolean;
  email: string | null;
  uid: string | null;
  isAdmin: boolean;
};

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Upprepas inte',
  daily: 'Varje dag',
  weekdays: 'Vardagar',
  weekly: 'Varje vecka',
  biweekly: 'Varannan vecka',
  monthly: 'Varje månad',
};

export const doneKey = (taskId: string, date: string) => `${taskId}__${date}`;
