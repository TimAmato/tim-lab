import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greetingFor, tapLabel } from './logic.js';

test('greetingFor picks the right part of day', () => {
  assert.equal(greetingFor(8), 'Good morning');
  assert.equal(greetingFor(13), 'Good afternoon');
  assert.equal(greetingFor(21), 'Good evening');
});

test('tapLabel pluralizes', () => {
  assert.equal(tapLabel(0), 'Tapped 0 times');
  assert.equal(tapLabel(1), 'Tapped 1 time');
  assert.equal(tapLabel(2), 'Tapped 2 times');
});
