import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_MODE } from '../config';
import { doneKey, type Done, type Person, type Session, type Task } from '../types';
import type { Backend, Data } from './types';

const KEY = 'dagslistan.demo.v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * Demoläge: all data sparas bara på den här enheten. Används när inga Firebase-uppgifter
 * finns, så att appen går att prova direkt. I demoläget är man alltid planerare.
 */
export function createDemoBackend(): Backend {
  let data: Data = { people: [], tasks: [], done: [] };
  let loaded = false;
  const listeners = new Set<(d: Data) => void>();

  const emit = () => {
    if (!loaded) return;
    const snapshot = { ...data, done: [...data.done].sort((a, b) => b.doneAt - a.doneAt) };
    listeners.forEach((l) => l(snapshot));
  };
  const save = async () => {
    emit();
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Lagringen är bara en bekvämlighet i demoläget.
    }
  };

  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) data = JSON.parse(raw) as Data;
    })
    .catch(() => {})
    .finally(() => {
      loaded = true;
      emit();
    });

  const session: Session = { signedIn: APP_MODE === 'admin', email: 'demo', uid: 'demo', isAdmin: APP_MODE === 'admin' };

  return {
    kind: 'demo',
    subscribeData(cb) {
      listeners.add(cb);
      emit();
      return () => listeners.delete(cb);
    },
    subscribeSession(cb) {
      cb(session);
      return () => {};
    },
    async signIn() {},
    async signOut() {},

    async addPerson(name, color) {
      const p: Person = { id: uid(), name, color, createdAt: Date.now() };
      data = { ...data, people: [...data.people, p] };
      await save();
    },
    async renamePerson(id, name) {
      data = { ...data, people: data.people.map((p) => (p.id === id ? { ...p, name } : p)) };
      await save();
    },
    async removePerson(id) {
      const tasks = data.tasks
        .map((t) => ({ ...t, assignees: t.assignees.filter((a) => a !== id) }))
        .filter((t) => t.assignees.length > 0);
      data = { ...data, people: data.people.filter((p) => p.id !== id), tasks };
      await save();
    },

    async addTask(input) {
      const t: Task = { id: uid(), ...input, createdAt: Date.now() };
      data = { ...data, tasks: [...data.tasks, t] };
      await save();
    },
    async updateTask(id, input) {
      data = { ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...input } : t)) };
      await save();
    },
    async removeTask(id) {
      data = { ...data, tasks: data.tasks.filter((t) => t.id !== id) };
      await save();
    },

    async markDone(task, date, person) {
      const d: Done = {
        id: doneKey(task.id, date),
        taskId: task.id,
        title: task.title,
        date,
        assignees: task.assignees,
        doneBy: person.id,
        doneByName: person.name,
        doneAt: Date.now(),
      };
      data = { ...data, done: [...data.done.filter((x) => x.id !== d.id), d] };
      await save();
    },
    async undoDone(doneId) {
      data = { ...data, done: data.done.filter((d) => d.id !== doneId) };
      await save();
    },
  };
}
