/// <reference types="node" />
// Tester för hur kalenderhändelser blir tasks: npm run test:unit
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { GoogleEvent } from '../src/lib/calendar/google';
import { calendarTaskId, planCalendarSync, titleWithoutKeyword } from '../src/lib/calendar/plan';
import type { Task } from '../src/lib/types';

const FROM = '2026-10-01';
const TO = '2026-10-31';

const ev = (uid: string, summary: string, start: GoogleEvent['start'], original?: GoogleEvent['start']): GoogleEvent => ({
  iCalUID: uid,
  summary,
  start,
  originalStartTime: original,
});

const gcalTask = (e: GoogleEvent, fields: Partial<Task>): Task => ({
  id: calendarTaskId(e),
  title: '',
  date: '',
  repeat: 'none',
  assignees: [],
  createdAt: 0,
  source: 'gcal',
  ...fields,
});

test('nyckelordet tas bort ur titeln, oavsett versaler och plats', () => {
  assert.equal(titleWithoutKeyword('#task Tvätta', '#task'), 'Tvätta');
  assert.equal(titleWithoutKeyword('Tvätta #TASK', '#task'), 'Tvätta');
  assert.equal(titleWithoutKeyword('#task: Handla mat', '#task'), 'Handla mat');
  assert.equal(titleWithoutKeyword('Tandläkare', '#task'), null);
  assert.equal(titleWithoutKeyword('#task', '#task'), null);
});

test('heldagshändelse med nyckelord blir en ny task för kalenderns personer', () => {
  const e = ev('a@google.com', '#task Tvätta', { date: '2026-10-05' });
  const plan = planCalendarSync([], [{ personIds: ['anna'], events: [e, ev('b', 'Möte', { date: '2026-10-05' })] }], '#task', FROM, TO);
  assert.deepEqual(plan.create, [{ id: calendarTaskId(e), fields: { title: 'Tvätta', date: '2026-10-05', time: null, assignees: ['anna'] } }]);
  assert.deepEqual(plan.update, []);
  assert.deepEqual(plan.remove, []);
});

test('händelse med tid får datum och klockslag i lokal tid', () => {
  const local = new Date(2026, 9, 7, 14, 30); // 7 okt 14:30 lokal tid
  const e = ev('c', '#task Ring mormor', { dateTime: local.toISOString() });
  const plan = planCalendarSync([], [{ personIds: ['erik'], events: [e] }], '#task', FROM, TO);
  assert.equal(plan.create[0].fields.date, '2026-10-07');
  assert.equal(plan.create[0].fields.time, '14:30');
});

test('samma händelse i två personers kalendrar blir en gemensam task', () => {
  const e = ev('shared', '#task Handla', { date: '2026-10-10' });
  const plan = planCalendarSync(
    [],
    [
      { personIds: ['erik'], events: [e] },
      { personIds: ['anna'], events: [e] },
    ],
    '#task',
    FROM,
    TO,
  );
  assert.equal(plan.create.length, 1);
  assert.deepEqual(plan.create[0].fields.assignees, ['anna', 'erik']);
});

test('återkommande händelse blir en task per tillfälle', () => {
  const a = ev('rec', '#task Sopor', { date: '2026-10-06' }, { date: '2026-10-06' });
  const b = ev('rec', '#task Sopor', { date: '2026-10-13' }, { date: '2026-10-13' });
  const plan = planCalendarSync([], [{ personIds: ['anna'], events: [a, b] }], '#task', FROM, TO);
  assert.equal(plan.create.length, 2);
  assert.notEqual(plan.create[0].id, plan.create[1].id);
});

test('ändrad titel eller flyttad dag uppdaterar befintlig task, oförändrad lämnas', () => {
  const moved = ev('m', '#task Dammsuga hela huset', { date: '2026-10-09' }, { date: '2026-10-08' });
  const same = ev('s', '#task Vattna', { date: '2026-10-08' });
  const existing = [
    gcalTask(moved, { title: 'Dammsuga', date: '2026-10-08', assignees: ['anna'] }),
    gcalTask(same, { title: 'Vattna', date: '2026-10-08', assignees: ['anna'] }),
  ];
  const plan = planCalendarSync(existing, [{ personIds: ['anna'], events: [moved, same] }], '#task', FROM, TO);
  assert.deepEqual(plan.update, [{ id: calendarTaskId(moved), fields: { title: 'Dammsuga hela huset', date: '2026-10-09', time: null, assignees: ['anna'] } }]);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.remove, []);
});

test('borttagen händelse tar bort tasken, men bara inom fönstret och bara kalendertasks', () => {
  const gone = ev('gone', '#task Borta', { date: '2026-10-12' });
  const old = ev('old', '#task Gammal', { date: '2026-09-20' });
  const manual: Task = { id: 'manual1', title: 'Egen', date: '2026-10-12', repeat: 'none', assignees: ['anna'], createdAt: 0 };
  const existing = [gcalTask(gone, { title: 'Borta', date: '2026-10-12', assignees: ['anna'] }), gcalTask(old, { title: 'Gammal', date: '2026-09-20', assignees: ['anna'] }), manual];
  const plan = planCalendarSync(existing, [{ personIds: ['anna'], events: [] }], '#task', FROM, TO);
  assert.deepEqual(plan.remove, [calendarTaskId(gone)]);
});

test('nyckelordet borttaget ur händelsen tar bort tasken', () => {
  const e = ev('k', 'Tvätta', { date: '2026-10-05' });
  const plan = planCalendarSync([gcalTask(e, { title: 'Tvätta', date: '2026-10-05', assignees: ['anna'] })], [{ personIds: ['anna'], events: [e] }], '#task', FROM, TO);
  assert.deepEqual(plan.remove, [calendarTaskId(e)]);
});

test('händelser utanför fönstret ignoreras', () => {
  const e = ev('late', '#task Senare', { date: '2026-11-15' });
  const plan = planCalendarSync([], [{ personIds: ['anna'], events: [e] }], '#task', FROM, TO);
  assert.deepEqual(plan.create, []);
});
