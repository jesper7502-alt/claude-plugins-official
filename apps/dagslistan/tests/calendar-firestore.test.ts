/// <reference types="node" />
// Kalendertasks måste gå att skriva med Firestore-biblioteket (kontrolleras lokalt, utan nätverk): npm run test:unit
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { initializeApp } from 'firebase/app';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';

import { calendarCreateData, calendarUpdateData } from '../src/lib/backend/firebase';

const db = getFirestore(initializeApp({ projectId: 'demo-test', apiKey: 'test' }, 'calendar-firestore-test'));

test('ny heldagstask går att skapa (utan time-fält)', () => {
  const data = calendarCreateData({ title: 'Tvätta', date: '2026-10-05', time: null, assignees: ['a'] });
  assert.equal('time' in data, false);
  assert.doesNotThrow(() => writeBatch(db).set(doc(db, 'tasks', 'gcal_1'), data));
});

test('ny task med tid sparar klockslaget', () => {
  const data = calendarCreateData({ title: 'Ring', date: '2026-10-05', time: '14:30', assignees: ['a'] });
  assert.equal(data.time, '14:30');
  assert.doesNotThrow(() => writeBatch(db).set(doc(db, 'tasks', 'gcal_2'), data));
});

test('ändring till heldag tar bort klockslaget', () => {
  assert.doesNotThrow(() =>
    writeBatch(db).update(doc(db, 'tasks', 'gcal_2'), calendarUpdateData({ title: 'Ring', date: '2026-10-05', time: null, assignees: ['a'] })),
  );
});
