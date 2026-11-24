import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TITLE, normalizeTitle, validateTitle, sortTodos, filterTodos, visibleTodos, counts,
  remainingLabel, emptyMessage, togglePatch, replaceById, removeById, friendlyError,
} from './logic.js';

const t = (id, done, created, doneAt = null) => ({ id, title: id, done, created_at: created, done_at: doneAt });
const sample = [
  t('a', false, '2026-11-01T10:00:00Z'),
  t('b', true, '2026-11-01T09:00:00Z', '2026-11-02T08:00:00Z'),
  t('c', false, '2026-11-03T10:00:00Z'),
  t('d', true, '2026-11-04T09:00:00Z', '2026-11-05T08:00:00Z'),
];

test('normalizeTitle trims and collapses whitespace', () => {
  assert.equal(normalizeTitle('  buy   milk \n now '), 'buy milk now');
  assert.equal(normalizeTitle(null), '');
  assert.equal(normalizeTitle('   '), '');
});

test('validateTitle rejects blank and too-long titles', () => {
  assert.equal(validateTitle('   '), 'Type something first.');
  assert.match(validateTitle('x'.repeat(MAX_TITLE + 1)), /under 500/);
  assert.equal(validateTitle('x'.repeat(MAX_TITLE)), null);
  assert.equal(validateTitle('Call mom'), null);
});

test('sortTodos: open newest first, then done by most recently finished', () => {
  assert.deepEqual(sortTodos(sample).map((x) => x.id), ['c', 'a', 'd', 'b']);
});

test('sortTodos does not mutate input', () => {
  const copy = [...sample];
  sortTodos(sample);
  assert.deepEqual(sample, copy);
});

test('filterTodos and visibleTodos', () => {
  assert.deepEqual(filterTodos(sample, 'active').map((x) => x.id), ['a', 'c']);
  assert.deepEqual(filterTodos(sample, 'done').map((x) => x.id), ['b', 'd']);
  assert.equal(filterTodos(sample, 'all').length, 4);
  assert.deepEqual(visibleTodos(sample, 'done').map((x) => x.id), ['d', 'b']);
});

test('counts and remainingLabel', () => {
  assert.deepEqual(counts(sample), { total: 4, done: 2, active: 2 });
  assert.equal(remainingLabel(0), 'All done');
  assert.equal(remainingLabel(1), '1 task left');
  assert.equal(remainingLabel(3), '3 tasks left');
});

test('emptyMessage depends on filter and total', () => {
  assert.match(emptyMessage('all', 0), /No tasks yet/);
  assert.equal(emptyMessage('active', 2), 'Nothing left to do.');
  assert.equal(emptyMessage('done', 2), 'Nothing finished yet.');
});

test('togglePatch sets and clears done_at', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  assert.deepEqual(togglePatch({ done: false }, now), { done: true, done_at: '2026-11-24T12:00:00.000Z' });
  assert.deepEqual(togglePatch({ done: true }, now), { done: false, done_at: null });
});

test('replaceById and removeById return new lists', () => {
  const next = replaceById(sample, 'a', { done: true });
  assert.equal(next.find((x) => x.id === 'a').done, true);
  assert.equal(sample.find((x) => x.id === 'a').done, false);
  assert.deepEqual(removeById(sample, 'b').map((x) => x.id), ['a', 'c', 'd']);
});

test('friendlyError explains a missing table and network issues', () => {
  assert.match(friendlyError({ code: 'PGRST205', message: "Could not find the table 'public.todo_items'" }), /001_todo_items\.sql/);
  assert.match(friendlyError({ code: '42P01', message: 'relation does not exist' }), /migrations/);
  assert.match(friendlyError(new TypeError('Failed to fetch')), /Network problem/);
  assert.equal(friendlyError({ message: 'boom' }), 'boom');
});
