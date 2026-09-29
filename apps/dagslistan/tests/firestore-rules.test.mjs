// Tester för firestore.rules. Körs i Firestore-emulatorn: npm run test:rules (kräver Java).
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'dagslistan-test',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
});

const seed = async () =>
  env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/boss'), { email: 'boss@x.se' });
    await setDoc(doc(db, 'members/family'), { email: 'familjen@x.se' });
    await setDoc(doc(db, 'people/a'), { name: 'Anna', color: '#000' });
    await setDoc(doc(db, 'people/e'), { name: 'Erik', color: '#000' });
    await setDoc(doc(db, 'tasks/t1'), { title: 'Handla', date: '2026-09-26', repeat: 'none', assignees: ['a'] });
    await setDoc(doc(db, 'done/t1__2026-09-20'), {
      taskId: 't1', title: 'Handla', date: '2026-09-20', assignees: ['a'], doneBy: 'a', doneByName: 'Anna',
      doneAt: Timestamp.fromMillis(Date.now() - 2 * 864e5),
    });
  });
await seed();

const admin = env.authenticatedContext('boss', { email: 'boss@x.se' }).firestore();
const member = env.authenticatedContext('family', { email: 'familjen@x.se' }).firestore();
// Ett konto som finns i Authentication men inte i admins/members, t.ex. skapat via det öppna API:t.
const stranger = env.authenticatedContext('stranger', { email: 'x@y.se' }).firestore();
const anon = env.authenticatedContext('anon1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const nobody = env.unauthenticatedContext().firestore();

const done = (taskId, date, doneBy, extra = {}) => ({
  taskId, title: 'Handla', date, assignees: ['a'], doneBy, doneByName: 'Anna', doneAt: serverTimestamp(), ...extra,
});
const task = { title: 'Diska', date: '2026-09-26', repeat: 'daily', assignees: ['a'], createdAt: serverTimestamp() };

const results = [];
const t = async (name, p) => {
  try {
    await p;
    results.push(['OK  ', name]);
  } catch (e) {
    results.push(['FAIL', name + ' — ' + e.message.split('\n')[0]]);
  }
};

// Läsning
await t('ej inloggad kan inte läsa', assertFails(getDoc(doc(nobody, 'tasks/t1'))));
await t('anonym kan inte läsa', assertFails(getDoc(doc(anon, 'tasks/t1'))));
await t('främlingskonto kan inte läsa', assertFails(getDoc(doc(stranger, 'tasks/t1'))));
await t('främlingskonto kan inte läsa historik', assertFails(getDoc(doc(stranger, 'done/t1__2026-09-20'))));
await t('vanlig användare kan läsa tasks', assertSucceeds(getDoc(doc(member, 'tasks/t1'))));
await t('vanlig användare kan läsa personer', assertSucceeds(getDoc(doc(member, 'people/a'))));
await t('admin kan läsa tasks', assertSucceeds(getDoc(doc(admin, 'tasks/t1'))));

// Roller
await t('vanlig användare kan läsa sin egen members-post', assertSucceeds(getDoc(doc(member, 'members/family'))));
await t('vanlig användare kan inte göra sig till admin', assertFails(setDoc(doc(member, 'admins/family'), {})));
await t('främlingskonto kan inte göra sig till member', assertFails(setDoc(doc(stranger, 'members/stranger'), {})));

// Planering
await t('vanlig användare kan inte skapa person', assertFails(setDoc(doc(member, 'people/x'), { name: 'X', color: '#000' })));
await t('vanlig användare kan inte skapa task', assertFails(setDoc(doc(member, 'tasks/x'), task)));
await t('vanlig användare kan inte ändra task', assertFails(updateDoc(doc(member, 'tasks/t1'), { title: 'Hack' })));
await t('vanlig användare kan inte ta bort task', assertFails(deleteDoc(doc(member, 'tasks/t1'))));
await t('admin kan skapa person', assertSucceeds(setDoc(doc(admin, 'people/x'), { name: 'X', color: '#000', createdAt: serverTimestamp() })));
await t('admin kan skapa task', assertSucceeds(setDoc(doc(admin, 'tasks/t2'), task)));
await t('admin kan inte skapa task utan person', assertFails(setDoc(doc(admin, 'tasks/t3'), { ...task, assignees: [] })));

// Djur
await t('vanlig användare kan byta djur', assertSucceeds(updateDoc(doc(member, 'people/a'), { animal: 'fox' })));
await t('vanlig användare kan ta bort djur', assertSucceeds(updateDoc(doc(member, 'people/a'), { animal: deleteField() })));
await t('vanlig användare kan inte byta namn samtidigt', assertFails(updateDoc(doc(member, 'people/a'), { animal: 'cat', name: 'Hack' })));
await t('vanlig användare kan inte byta färg', assertFails(updateDoc(doc(member, 'people/a'), { color: '#fff' })));
await t('vanlig användare kan inte sätta för långt djurnamn', assertFails(updateDoc(doc(member, 'people/a'), { animal: 'x'.repeat(50) })));
await t('främlingskonto kan inte byta djur', assertFails(updateDoc(doc(stranger, 'people/a'), { animal: 'fox' })));
await t('admin kan skapa person med djur', assertSucceeds(setDoc(doc(admin, 'people/y'), { name: 'Y', color: '#000', animal: 'owl', createdAt: serverTimestamp() })));

// Avbockning
await t('främlingskonto kan inte bocka av', assertFails(setDoc(doc(stranger, 'done/t1__2026-09-25'), done('t1', '2026-09-25', 'a'))));
await t('anonym kan inte bocka av', assertFails(setDoc(doc(anon, 'done/t1__2026-09-25'), done('t1', '2026-09-25', 'a'))));
await t('vanlig användare kan bocka av för tilldelad person', assertSucceeds(setDoc(doc(member, 'done/t1__2026-09-26'), done('t1', '2026-09-26', 'a'))));
await t('vanlig användare kan inte bocka av för otilldelad person', assertFails(setDoc(doc(member, 'done/t1__2026-09-27'), done('t1', '2026-09-27', 'e'))));
await t('vanlig användare kan inte bocka av med fel id', assertFails(setDoc(doc(member, 'done/fel'), done('t1', '2026-09-28', 'a'))));
await t('vanlig användare kan inte bocka av task som inte finns', assertFails(setDoc(doc(member, 'done/nope__2026-09-26'), done('nope', '2026-09-26', 'a'))));
await t('vanlig användare kan inte fejka tidpunkt', assertFails(setDoc(doc(member, 'done/t1__2026-09-29'), done('t1', '2026-09-29', 'a', { doneAt: Timestamp.fromMillis(0) }))));
await t('vanlig användare kan inte lägga till extra fält', assertFails(setDoc(doc(member, 'done/t1__2026-09-30'), done('t1', '2026-09-30', 'a', { hack: 1 }))));
await t('vanlig användare kan inte ändra avbockning', assertFails(updateDoc(doc(member, 'done/t1__2026-09-26'), { doneBy: 'e' })));
await t('admin kan bocka av', assertSucceeds(setDoc(doc(admin, 'done/t2__2026-09-26'), { ...done('t2', '2026-09-26', 'a'), title: 'Diska' })));

// Ångra
await t('främlingskonto kan inte ångra', assertFails(deleteDoc(doc(stranger, 'done/t1__2026-09-26'))));
await t('vanlig användare kan ångra färsk avbockning', assertSucceeds(deleteDoc(doc(member, 'done/t1__2026-09-26'))));
await t('vanlig användare kan inte ångra gammal avbockning', assertFails(deleteDoc(doc(member, 'done/t1__2026-09-20'))));
await t('admin kan ångra gammal avbockning', assertSucceeds(deleteDoc(doc(admin, 'done/t1__2026-09-20'))));

for (const [s, n] of results) console.log(s, n);
await env.cleanup();
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
