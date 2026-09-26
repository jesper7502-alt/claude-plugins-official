import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'dagslistan-test',
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'admins/boss'), {});
  await setDoc(doc(db, 'people/a'), { name: 'Anna', color: '#000' });
  await setDoc(doc(db, 'people/e'), { name: 'Erik', color: '#000' });
  await setDoc(doc(db, 'tasks/t1'), { title: 'Handla', date: '2026-09-26', repeat: 'none', assignees: ['a'] });
  await setDoc(doc(db, 'done/t1__2026-09-20'), {
    taskId: 't1', title: 'Handla', date: '2026-09-20', assignees: ['a'], doneBy: 'a', doneByName: 'Anna',
    doneAt: Timestamp.fromMillis(Date.now() - 2 * 864e5),
  });
});

const admin = env.authenticatedContext('boss', { email: 'boss@x.se' }).firestore();
const other = env.authenticatedContext('someone', { email: 'someone@x.se' }).firestore();
const anon = env.authenticatedContext('anon1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const nobody = env.unauthenticatedContext().firestore();

const done = (taskId, date, doneBy, extra = {}) => ({
  taskId, title: 'Handla', date, assignees: ['a'], doneBy, doneByName: 'Anna', doneAt: serverTimestamp(), ...extra,
});

const results = [];
const t = async (name, p) => {
  try {
    await p;
    results.push(['OK  ', name]);
  } catch (e) {
    results.push(['FAIL', name + ' — ' + e.message.split('\n')[0]]);
  }
};

await t('ej inloggad kan inte läsa', assertFails(getDoc(doc(nobody, 'tasks/t1'))));
await t('anonym kan läsa tasks', assertSucceeds(getDoc(doc(anon, 'tasks/t1'))));
await t('anonym kan inte skapa person', assertFails(setDoc(doc(anon, 'people/x'), { name: 'X', color: '#000' })));
await t('anonym kan inte ändra task', assertFails(updateDoc(doc(anon, 'tasks/t1'), { title: 'Hack' })));
await t('anonym kan inte ta bort task', assertFails(deleteDoc(doc(anon, 'tasks/t1'))));
await t('inloggad icke-planerare kan inte skapa task', assertFails(setDoc(doc(other, 'tasks/x'), { title: 'X', date: '2026-09-26', repeat: 'none', assignees: ['a'] })));
await t('anonym kan inte göra sig till planerare', assertFails(setDoc(doc(anon, 'admins/anon1'), {})));
await t('planerare kan skapa person', assertSucceeds(setDoc(doc(admin, 'people/x'), { name: 'X', color: '#000', createdAt: serverTimestamp() })));
await t('planerare kan skapa task', assertSucceeds(setDoc(doc(admin, 'tasks/t2'), { title: 'Diska', date: '2026-09-26', repeat: 'daily', assignees: ['a'], createdAt: serverTimestamp() })));
await t('planerare kan inte skapa task utan person', assertFails(setDoc(doc(admin, 'tasks/t3'), { title: 'Diska', date: '2026-09-26', repeat: 'daily', assignees: [] })));
await t('anonym kan bocka av för tilldelad person', assertSucceeds(setDoc(doc(anon, 'done/t1__2026-09-26'), done('t1', '2026-09-26', 'a'))));
await t('anonym kan inte bocka av för otilldelad person', assertFails(setDoc(doc(anon, 'done/t1__2026-09-27'), done('t1', '2026-09-27', 'e'))));
await t('anonym kan inte bocka av med fel id', assertFails(setDoc(doc(anon, 'done/fel'), done('t1', '2026-09-28', 'a'))));
await t('anonym kan inte bocka av task som inte finns', assertFails(setDoc(doc(anon, 'done/nope__2026-09-26'), done('nope', '2026-09-26', 'a'))));
await t('anonym kan inte fejka tidpunkt', assertFails(setDoc(doc(anon, 'done/t1__2026-09-29'), done('t1', '2026-09-29', 'a', { doneAt: Timestamp.fromMillis(0) }))));
await t('anonym kan inte lägga till extra fält', assertFails(setDoc(doc(anon, 'done/t1__2026-09-30'), done('t1', '2026-09-30', 'a', { hack: 1 }))));
await t('anonym kan inte ändra avbockning', assertFails(updateDoc(doc(anon, 'done/t1__2026-09-26'), { doneBy: 'e' })));
await t('anonym kan ångra färsk avbockning', assertSucceeds(deleteDoc(doc(anon, 'done/t1__2026-09-26'))));
await t('anonym kan inte ångra gammal avbockning', assertFails(deleteDoc(doc(anon, 'done/t1__2026-09-20'))));
await t('planerare kan ångra gammal avbockning', assertSucceeds(deleteDoc(doc(admin, 'done/t1__2026-09-20'))));

for (const [s, n] of results) console.log(s, n);
await env.cleanup();
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
