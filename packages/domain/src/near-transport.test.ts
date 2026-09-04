import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveNearSessionStatus } from './near-transport.js';

test('transport stays authorized until a participant starts', () => {
  assert.equal(deriveNearSessionStatus(['idle', 'idle']), 'authorized');
});

test('transport enters connecting when either participant reports progress', () => {
  assert.equal(deriveNearSessionStatus(['connecting', 'idle']), 'connecting');
  assert.equal(deriveNearSessionStatus(['connected', 'connecting']), 'connecting');
});

test('transport only becomes connected when both participants report connected', () => {
  assert.equal(deriveNearSessionStatus(['connected', 'connected']), 'connected');
});

test('transport fails closed and ends when either participant ends', () => {
  assert.equal(deriveNearSessionStatus(['connected', 'failed']), 'failed');
  assert.equal(deriveNearSessionStatus(['connected', 'ended']), 'ended');
});
