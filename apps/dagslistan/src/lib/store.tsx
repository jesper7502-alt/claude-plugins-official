import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { createDemoBackend } from './backend/demo';
import { createFirebaseBackend } from './backend/firebase';
import type { Backend, Data } from './backend/types';
import { HAS_FIREBASE } from './config';
import { today } from './dates';
import { ANIMALS } from './animals';
import { PERSON_COLORS } from './theme';
import { doneKey, type Done, type Person, type Role, type Session, type Task, type TaskInput } from './types';

export type ViewMode = 'today' | 'upcoming' | 'pick';
export type ToastState = { id: number; text: string; undo?: () => void } | null;

type Store = {
  backendKind: Backend['kind'];
  ready: boolean;
  error: string | null;
  people: Person[];
  tasks: Task[];
  done: Done[];
  doneIds: Set<string>;
  session: Session;
  /** Inloggad användares roll, eller null om ingen är inloggad. */
  role: Role | null;
  isAdmin: boolean;
  person: (id: string) => Person | undefined;

  /** `me` är personen som valt "Vem är du?" på den här enheten. */
  prefs: { mode: ViewMode; filter: string; pick: string; me: string };
  setPrefs: (p: Partial<Store['prefs']>) => void;

  toast: ToastState;
  showToast: (text: string, undo?: () => void) => void;
  hideToast: () => void;

  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  addPerson: (name: string) => Promise<boolean>;
  setAnimal: (id: string, animal: string | null) => Promise<boolean>;
  renamePerson: (id: string, name: string) => Promise<boolean>;
  removePerson: (id: string) => Promise<boolean>;
  addTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: string, input: TaskInput) => Promise<boolean>;
  removeTask: (id: string) => Promise<boolean>;
  markDone: (task: Task, date: string, personId: string) => Promise<boolean>;
  undoDone: (doneId: string) => Promise<boolean>;
};

const Ctx = createContext<Store | null>(null);
const PREFS_KEY = 'dagslistan.prefs.v1';

function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'Du har inte behörighet att göra det här.';
  if (code === 'unavailable') return 'Ingen anslutning. Försök igen när du är uppkopplad.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Fel e-post eller lösenord.';
  if (code === 'auth/invalid-email') return 'E-postadressen ser inte rätt ut.';
  if (code === 'auth/too-many-requests') return 'För många försök. Vänta en stund och försök igen.';
  if (code === 'auth/network-request-failed') return 'Ingen anslutning. Kontrollera nätet.';
  return 'Något gick fel. Försök igen.';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const backend = useMemo<Backend>(() => (HAS_FIREBASE ? createFirebaseBackend() : createDemoBackend()), []);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [prefs, setPrefsState] = useState<Store['prefs']>({ mode: 'today', filter: '', pick: today(), me: '' });
  const [toast, setToast] = useState<ToastState>(null);
  const toastSeq = useRef(0);

  const role = session.status === 'signedIn' ? session.role : null;
  const canRead = role === 'admin' || role === 'member';

  useEffect(() => backend.subscribeSession(setSession), [backend]);
  // Läs data bara när kontot har behörighet, och släpp den vid utloggning.
  useEffect(() => {
    if (!canRead) return;
    const unsub = backend.subscribeData(
      (d) => {
        setData(d);
        setError(null);
      },
      (e) => setError(errorText(e)),
    );
    return () => {
      unsub();
      setData(null);
      setError(null);
    };
  }, [backend, canRead]);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw) as Partial<Store['prefs']>;
        setPrefsState((s) => ({ ...s, mode: p.mode ?? s.mode, filter: p.filter ?? s.filter, me: p.me ?? s.me }));
      })
      .catch(() => {});
  }, []);

  const setPrefs = useCallback((p: Partial<Store['prefs']>) => {
    setPrefsState((s) => {
      const next = { ...s, ...p };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ mode: next.mode, filter: next.filter, me: next.me })).catch(() => {});
      return next;
    });
  }, []);

  const showToast = useCallback((text: string, undo?: () => void) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, undo });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);

  const people = useMemo(() => [...(data?.people ?? [])].sort((a, b) => a.createdAt - b.createdAt), [data]);
  const tasks = data?.tasks ?? [];
  const done = data?.done ?? [];
  const doneIds = useMemo(() => new Set((data?.done ?? []).map((d) => d.id)), [data]);
  const person = useCallback((id: string) => people.find((p) => p.id === id), [people]);

  // Kör en skrivning och visa ett begripligt fel om den misslyckas.
  const run = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      try {
        await fn();
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    [showToast],
  );

  const store: Store = {
    backendKind: backend.kind,
    ready: data !== null,
    error,
    people,
    tasks,
    done,
    doneIds,
    session,
    role,
    isAdmin: role === 'admin',
    person,
    prefs,
    setPrefs,
    toast,
    showToast,
    hideToast,

    async signIn(email, password) {
      try {
        await backend.signIn(email, password);
        return null;
      } catch (e) {
        return errorText(e);
      }
    },
    signOut: () => backend.signOut(),

    addPerson(name) {
      const used = new Set(people.map((p) => p.color));
      const color = PERSON_COLORS.find((c) => !used.has(c)) ?? PERSON_COLORS[people.length % PERSON_COLORS.length];
      // Ett slumpat djur som ingen annan har (eller vilket som helst om alla är tagna).
      const taken = new Set(people.map((p) => p.animal));
      const free = ANIMALS.filter((a) => !taken.has(a.key));
      const pool = free.length ? free : ANIMALS;
      const animal = pool[Math.floor(Math.random() * pool.length)].key;
      return run(() => backend.addPerson(name, color, animal));
    },
    setAnimal: (id, animal) => run(() => backend.setAnimal(id, animal)),
    renamePerson: (id, name) => run(() => backend.renamePerson(id, name)),
    removePerson: (id) => run(() => backend.removePerson(id, tasks)),
    addTask: (input) => run(() => backend.addTask(input)),
    updateTask: (id, input) => run(() => backend.updateTask(id, input)),
    removeTask: (id) => run(() => backend.removeTask(id)),

    async markDone(task, date, personId) {
      const p = person(personId);
      if (!p) return false;
      const ok = await run(() => backend.markDone(task, date, p));
      if (ok) showToast(`”${task.title}” klar`, () => void run(() => backend.undoDone(doneKey(task.id, date))));
      return ok;
    },
    undoDone: (doneId) => run(() => backend.undoDone(doneId)),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore måste användas inuti StoreProvider');
  return s;
}
