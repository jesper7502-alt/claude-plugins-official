import { occursOn, today } from './dates';
import { doneKey, type Task } from './types';

export type Occurrence = { task: Task; date: string };

const isOneOff = (t: Task) => !t.repeat || t.repeat === 'none';

/** Personens tasks en viss dag som inte är avbockade. */
export function openFor(tasks: Task[], done: Set<string>, personId: string, day: string): Occurrence[] {
  return tasks
    .filter((t) => t.assignees.includes(personId) && occursOn(t, day) && !done.has(doneKey(t.id, day)))
    .sort((a, b) => a.title.localeCompare(b.title, 'sv'))
    .map((task) => ({ task, date: day }));
}

/**
 * Engångstasks från tidigare dagar som ingen bockat av. Missade återkommande tasks
 * följer inte med, annars skulle till exempel en daglig task hopa sig.
 */
export function overdueFor(tasks: Task[], done: Set<string>, personId: string): Occurrence[] {
  const t0 = today();
  return tasks
    .filter((t) => isOneOff(t) && t.date < t0 && t.assignees.includes(personId) && !done.has(doneKey(t.id, t.date)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((task) => ({ task, date: task.date }));
}

export function countOpenOn(tasks: Task[], done: Set<string>, day: string): number {
  return tasks.filter((t) => occursOn(t, day) && !done.has(doneKey(t.id, day))).length;
}

export function countOverdue(tasks: Task[], done: Set<string>): number {
  const t0 = today();
  return tasks.filter((t) => isOneOff(t) && t.date < t0 && !done.has(doneKey(t.id, t.date))).length;
}
