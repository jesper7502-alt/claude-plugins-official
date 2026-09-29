import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firebaseConfig } from '../config';
import { DEFAULT_KEYWORD, doneKey, type CalendarSettings, type Done, type Person, type Repeat, type Role, type Task } from '../types';
import type { Backend, CalendarTaskFields, Data } from './types';

/** Hur många avbockningar historiken läser in. */
const DONE_LIMIT = 500;

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
/** Firestore tillåter högst 500 skrivningar per batch. */
const BATCH_SIZE = 400;

const millis = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return Date.now();
};

const toPerson = (d: QueryDocumentSnapshot<DocumentData>): Person => {
  const v = d.data();
  return {
    id: d.id,
    name: String(v.name ?? ''),
    color: String(v.color ?? '#72819E'),
    animal: typeof v.animal === 'string' ? v.animal : undefined,
    createdAt: millis(v.createdAt),
  };
};

const toTask = (d: QueryDocumentSnapshot<DocumentData>): Task => {
  const v = d.data();
  return {
    id: d.id,
    title: String(v.title ?? ''),
    date: String(v.date ?? ''),
    repeat: (v.repeat ?? 'none') as Repeat,
    assignees: Array.isArray(v.assignees) ? v.assignees.map(String) : [],
    createdAt: millis(v.createdAt),
    source: v.source === 'gcal' ? 'gcal' : undefined,
    time: typeof v.time === 'string' ? v.time : undefined,
  };
};

const calendarFields = (f: CalendarTaskFields) => ({
  title: f.title,
  date: f.date,
  repeat: 'none',
  assignees: f.assignees,
  time: f.time ?? deleteField(),
});

const toDone = (d: QueryDocumentSnapshot<DocumentData>): Done => {
  // 'estimate' ger en tid direkt för egna avbockningar innan servern har bekräftat dem.
  const v = d.data({ serverTimestamps: 'estimate' });
  return {
    id: d.id,
    taskId: String(v.taskId ?? ''),
    title: String(v.title ?? ''),
    date: String(v.date ?? ''),
    assignees: Array.isArray(v.assignees) ? v.assignees.map(String) : [],
    doneBy: String(v.doneBy ?? ''),
    doneByName: String(v.doneByName ?? ''),
    doneAt: millis(v.doneAt),
  };
};

export function createFirebaseBackend(): Backend {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {});

  return {
    kind: 'firebase',

    subscribeData(cb, onError) {
      const data: Data = { people: [], tasks: [], done: [] };
      const loaded = { people: false, tasks: false, done: false };
      const emit = () => {
        if (loaded.people && loaded.tasks && loaded.done) cb({ ...data });
      };
      const unsubs = [
        onSnapshot(collection(db, 'people'), (s) => {
          data.people = s.docs.map(toPerson);
          loaded.people = true;
          emit();
        }, onError),
        onSnapshot(collection(db, 'tasks'), (s) => {
          data.tasks = s.docs.map(toTask);
          loaded.tasks = true;
          emit();
        }, onError),
        onSnapshot(query(collection(db, 'done'), orderBy('doneAt', 'desc'), limit(DONE_LIMIT)), (s) => {
          data.done = s.docs.map(toDone);
          loaded.done = true;
          emit();
        }, onError),
      ];
      return () => unsubs.forEach((u) => u());
    },

    subscribeSession(cb) {
      return onAuthStateChanged(auth, async (user) => {
        if (!user || user.isAnonymous) {
          cb({ status: 'signedOut' });
          return;
        }
        // Rollen avgörs av om kontots uid finns i admins eller members (läggs in i Firebase-konsolen).
        const has = async (col: string) => {
          try {
            return (await getDoc(doc(db, col, user.uid))).exists();
          } catch {
            return false;
          }
        };
        const role: Role = (await has('admins')) ? 'admin' : (await has('members')) ? 'member' : 'none';
        cb({ status: 'signedIn', email: user.email, uid: user.uid, role });
      });
    },

    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signOut() {
      await signOut(auth);
    },

    async addPerson(name, color, animal) {
      await setDoc(doc(collection(db, 'people')), { name, color, animal, createdAt: serverTimestamp() });
    },
    async setAnimal(id, animal) {
      await updateDoc(doc(db, 'people', id), { animal: animal ?? deleteField() });
    },
    async renamePerson(id, name) {
      await updateDoc(doc(db, 'people', id), { name });
    },
    async removePerson(id, tasks) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'people', id));
      for (const t of tasks) {
        if (!t.assignees.includes(id)) continue;
        const rest = t.assignees.filter((a) => a !== id);
        if (rest.length) batch.update(doc(db, 'tasks', t.id), { assignees: rest });
        else batch.delete(doc(db, 'tasks', t.id));
      }
      await batch.commit();
    },

    async addTask(input) {
      await setDoc(doc(collection(db, 'tasks')), { ...input, createdAt: serverTimestamp() });
    },
    async updateTask(id, input) {
      await updateDoc(doc(db, 'tasks', id), { ...input });
    },
    async removeTask(id) {
      await deleteDoc(doc(db, 'tasks', id));
    },

    async markDone(task, date, person) {
      await setDoc(doc(db, 'done', doneKey(task.id, date)), {
        taskId: task.id,
        title: task.title,
        date,
        assignees: task.assignees,
        doneBy: person.id,
        doneByName: person.name,
        doneAt: serverTimestamp(),
      });
    },
    async undoDone(doneId) {
      await deleteDoc(doc(db, 'done', doneId));
    },

    async connectGoogleCalendar() {
      const user = auth.currentUser;
      if (!user) throw Object.assign(new Error('not signed in'), { code: 'auth/no-current-user' });
      const provider = new GoogleAuthProvider();
      provider.addScope(CALENDAR_SCOPE);
      // Första gången kopplas Google-kontot till admin-kontot; därefter loggar man bara in igen för en ny nyckel.
      const linked = user.providerData.some((p) => p.providerId === 'google.com');
      const result = linked ? await reauthenticateWithPopup(user, provider) : await linkWithPopup(user, provider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
      if (!token) throw Object.assign(new Error('no token'), { code: 'gcal/no-token' });
      // Googles åtkomstnycklar gäller en timme; räkna med lite marginal.
      return { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    },

    subscribeCalendarSettings(cb) {
      return onSnapshot(
        doc(db, 'settings', 'calendar'),
        (s) => {
          if (!s.exists()) return cb(null);
          const v = s.data();
          const settings: CalendarSettings = {
            keyword: typeof v.keyword === 'string' && v.keyword ? v.keyword : DEFAULT_KEYWORD,
            calendars: v.calendars && typeof v.calendars === 'object' ? v.calendars : {},
            lastSync: typeof v.lastSync === 'number' ? v.lastSync : undefined,
            lastResult: typeof v.lastResult === 'string' ? v.lastResult : undefined,
          };
          cb(settings);
        },
        () => cb(null),
      );
    },
    async setPersonCalendar(personId, calendar) {
      await setDoc(doc(db, 'settings', 'calendar'), { calendars: { [personId]: calendar ?? deleteField() } }, { merge: true });
    },
    async setCalendarSettings(patch) {
      await setDoc(doc(db, 'settings', 'calendar'), patch, { merge: true });
    },

    async applyCalendarTasks({ create, update, remove }) {
      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
        ...create.map((c) => (b: ReturnType<typeof writeBatch>) =>
          b.set(doc(db, 'tasks', c.id), { ...calendarFields(c.fields), source: 'gcal', createdAt: serverTimestamp() }),
        ),
        ...update.map((u) => (b: ReturnType<typeof writeBatch>) => b.update(doc(db, 'tasks', u.id), calendarFields(u.fields))),
        ...remove.map((id) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, 'tasks', id))),
      ];
      for (let i = 0; i < ops.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        ops.slice(i, i + BATCH_SIZE).forEach((op) => op(batch));
        await batch.commit();
      }
    },
  };
}
