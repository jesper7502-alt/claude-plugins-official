import type { Done, Person, Session, Task, TaskInput } from '../types';

export type Data = {
  people: Person[];
  tasks: Task[];
  done: Done[];
};

export interface Backend {
  /** 'firebase' eller 'demo' (lokal lagring utan server). */
  kind: 'firebase' | 'demo';
  subscribeData(cb: (data: Data) => void, onError: (e: unknown) => void): () => void;
  subscribeSession(cb: (s: Session) => void): () => void;

  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  addPerson(name: string, color: string): Promise<void>;
  renamePerson(id: string, name: string): Promise<void>;
  /** Tar bort personen och plockar bort den från sina tasks. Tasks utan personer tas bort. */
  removePerson(id: string, tasks: Task[]): Promise<void>;

  addTask(input: TaskInput): Promise<void>;
  updateTask(id: string, input: TaskInput): Promise<void>;
  removeTask(id: string): Promise<void>;

  markDone(task: Task, date: string, person: Person): Promise<void>;
  undoDone(doneId: string): Promise<void>;
}
