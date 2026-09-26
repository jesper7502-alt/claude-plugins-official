import { getApps, initializeApp } from 'firebase/app';
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
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
import { doneKey, type Done, type Person, type Repeat, type Task } from '../types';
import { createAuth } from './auth';
import type { Backend, Data } from './types';

/** Hur många avbockningar historiken läser in. */
const DONE_LIMIT = 500;

const millis = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return Date.now();
};

const toPerson = (d: QueryDocumentSnapshot<DocumentData>): Person => {
  const v = d.data();
  return { id: d.id, name: String(v.name ?? ''), color: String(v.color ?? '#5B6963'), createdAt: millis(v.createdAt) };
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
  };
};

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
  const auth = createAuth(app);
  const db = initializeFirestore(app, {});

  return {
    kind: 'firebase',

    subscribeData(cb, onError) {
      const data: Data = { people: [], tasks: [], done: [] };
      const loaded = { people: false, tasks: false, done: false };
      let unsubs: (() => void)[] = [];
      const emit = () => {
        if (loaded.people && loaded.tasks && loaded.done) cb({ ...data });
      };
      const start = () => {
        unsubs = [
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
      };
      const stop = () => {
        unsubs.forEach((u) => u());
        unsubs = [];
      };
      // Läsning kräver en inloggad användare (anonym räcker). Starta om lyssnarna när användaren byts.
      const unsubAuth = onAuthStateChanged(auth, (user) => {
        stop();
        if (user) start();
      });
      return () => {
        unsubAuth();
        stop();
      };
    },

    subscribeSession(cb) {
      return onAuthStateChanged(auth, async (user) => {
        if (!user) {
          // Den som inte loggat in blir anonym, vilket räcker för att läsa och bocka av.
          signInAnonymously(auth).catch(() => {});
          cb({ signedIn: false, email: null, uid: null, isAdmin: false });
          return;
        }
        if (user.isAnonymous) {
          cb({ signedIn: false, email: null, uid: user.uid, isAdmin: false });
          return;
        }
        let isAdmin = false;
        try {
          isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists();
        } catch {
          isAdmin = false;
        }
        cb({ signedIn: true, email: user.email, uid: user.uid, isAdmin });
      });
    },

    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signOut() {
      await signOut(auth);
    },

    async addPerson(name, color) {
      await setDoc(doc(collection(db, 'people')), { name, color, createdAt: serverTimestamp() });
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
  };
}
