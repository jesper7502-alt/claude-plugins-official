import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_KEYWORD, doneKey, type CalendarSettings, type Done, type Person, type Session, type Task } from '../types';
import type { Backend, Data } from './types';

const KEY = 'dagslistan.demo.v1';
const SESSION_KEY = 'dagslistan.demo.session.v1';
const CALENDAR_KEY = 'dagslistan.demo.calendar.v1';
/** Bara för automatiska tester: låtsas att Google-inloggningen lyckas. */
const FAKE_GOOGLE_KEY = 'dagslistan.demo.fakeGoogle';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * Demoläge: all data sparas bara i den här webbläsaren. Används när inga Firebase-uppgifter
 * finns, så att sidan går att prova direkt. En e-post som börjar med "admin" loggar in som
 * admin, alla andra som vanlig användare. Lösenordet kontrolleras inte.
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

  // Inloggningen sparas också, så att en omladdning inte loggar ut (som i Firebase).
  let session: Session = { status: 'loading' };
  const sessionListeners = new Set<(s: Session) => void>();
  const setSession = (s: Session) => {
    session = s;
    sessionListeners.forEach((l) => l(s));
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s)).catch(() => {});
  };
  AsyncStorage.getItem(SESSION_KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as Session) : null;
      setSession(saved?.status === 'signedIn' ? saved : { status: 'signedOut' });
    })
    .catch(() => setSession({ status: 'signedOut' }));

  let calendar: CalendarSettings | null = null;
  const calendarListeners = new Set<(s: CalendarSettings | null) => void>();
  const setCalendar = (s: CalendarSettings) => {
    calendar = s;
    calendarListeners.forEach((l) => l(s));
    AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(s)).catch(() => {});
  };
  AsyncStorage.getItem(CALENDAR_KEY)
    .then((raw) => {
      if (raw) setCalendar(JSON.parse(raw) as CalendarSettings);
    })
    .catch(() => {});
  const calendarOrDefault = (): CalendarSettings => calendar ?? { keyword: DEFAULT_KEYWORD, calendars: {} };

  return {
    kind: 'demo',
    subscribeData(cb) {
      listeners.add(cb);
      emit();
      return () => listeners.delete(cb);
    },
    subscribeSession(cb) {
      sessionListeners.add(cb);
      cb(session);
      return () => sessionListeners.delete(cb);
    },
    async signIn(email) {
      const role = email.toLowerCase().startsWith('admin') ? 'admin' : 'member';
      setSession({ status: 'signedIn', email, uid: `demo-${role}`, role });
    },
    async signOut() {
      setSession({ status: 'signedOut' });
    },

    async addPerson(name, color, animal) {
      const p: Person = { id: uid(), name, color, animal, createdAt: Date.now() };
      data = { ...data, people: [...data.people, p] };
      await save();
    },
    async setAnimal(id, animal) {
      data = { ...data, people: data.people.map((p) => (p.id === id ? { ...p, animal: animal ?? undefined } : p)) };
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

    async connectGoogleCalendar(opts) {
      const fake = await AsyncStorage.getItem(FAKE_GOOGLE_KEY).catch(() => null);
      // Sparas så att testerna kan se om behörighetsrutan begärdes.
      await AsyncStorage.setItem(`${FAKE_GOOGLE_KEY}.lastConsent`, String(!!opts?.forceConsent)).catch(() => {});
      if (fake !== '1') throw Object.assign(new Error('demo'), { code: 'gcal/demo' });
      return { token: 'demo-token', expiresAt: Date.now() + 55 * 60 * 1000 };
    },
    subscribeCalendarSettings(cb) {
      calendarListeners.add(cb);
      cb(calendar);
      return () => calendarListeners.delete(cb);
    },
    async setPersonCalendar(personId, cal) {
      const current = calendarOrDefault();
      const calendars = { ...current.calendars };
      if (cal) calendars[personId] = cal;
      else delete calendars[personId];
      setCalendar({ ...current, calendars });
    },
    async setCalendarSettings(patch) {
      setCalendar({ ...calendarOrDefault(), ...patch });
    },
    async applyCalendarTasks({ create, update, remove }) {
      const gone = new Set(remove);
      const changed = new Map(update.map((u) => [u.id, u.fields]));
      const withFields = (t: Task, f: { title: string; date: string; time: string | null; assignees: string[] }): Task => ({
        ...t,
        title: f.title,
        date: f.date,
        repeat: 'none',
        assignees: f.assignees,
        time: f.time ?? undefined,
      });
      const tasks = data.tasks
        .filter((t) => !gone.has(t.id))
        .map((t) => (changed.has(t.id) ? withFields(t, changed.get(t.id)!) : t));
      for (const c of create) {
        tasks.push(withFields({ id: c.id, title: '', date: '', repeat: 'none', assignees: [], createdAt: Date.now(), source: 'gcal' }, c.fields));
      }
      data = { ...data, tasks };
      await save();
    },
  };
}
