import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CONNECTION_PERMISSIONS,
  canTransitionPresence,
  canUseRepresentation,
  connectionPermissionsSchema,
  isPresenceRepresentationAllowed,
  presenceStateForNearLevel
} from './index.js';

test('presence cannot jump from away directly into intimate states', () => {
  assert.equal(canTransitionPresence('away', 'near'), false);
  assert.equal(canTransitionPresence('away', 'together'), false);
  assert.equal(canTransitionPresence('away', 'present'), true);
});

test('presence can de-escalate to away from any richer state', () => {
  assert.equal(canTransitionPresence('present', 'away'), true);
  assert.equal(canTransitionPresence('near', 'away'), true);
  assert.equal(canTransitionPresence('together', 'away'), true);
});

test('shared reality is only a together representation', () => {
  assert.equal(isPresenceRepresentationAllowed('near', 'shared_reality'), false);
  assert.equal(isPresenceRepresentationAllowed('together', 'shared_reality'), true);
});

test('default relationship permissions keep AI memory and sensitive media off', () => {
  const permissions = connectionPermissionsSchema.parse(DEFAULT_CONNECTION_PERMISSIONS);
  assert.equal(permissions.aiMemory, false);
  assert.equal(permissions.matureThemes, false);
  assert.equal(permissions.sensitiveMedia, false);
  assert.equal(permissions.recording, 'ask_every_time');
});

test('representation access is bounded by explicit relationship permissions', () => {
  assert.equal(canUseRepresentation(DEFAULT_CONNECTION_PERMISSIONS, 'camera'), true);
  assert.equal(canUseRepresentation({ ...DEFAULT_CONNECTION_PERMISSIONS, camera: false }, 'camera'), false);
  assert.equal(canUseRepresentation({ ...DEFAULT_CONNECTION_PERMISSIONS, sharePresence: false }, 'signal'), false);
});

test('near level maps to deterministic social distance', () => {
  assert.equal(presenceStateForNearLevel('voice'), 'near');
  assert.equal(presenceStateForNearLevel('camera'), 'near');
  assert.equal(presenceStateForNearLevel('shared_reality'), 'together');
});
