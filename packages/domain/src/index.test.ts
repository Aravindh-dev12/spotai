import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRAIT_RULE_VERSION,
  applySignal,
  awakeningProgress,
  evidenceMultiplier,
  newTraitVector,
  resolveForm,
  signalDelta,
  traitDifference,
  type ClassifiedSignal
} from './index.js';

const classified: ClassifiedSignal = {
  signalId: '00000000-0000-4000-8000-000000000001',
  weights: { explore: 100, connect: 50, create: 0, move: 25, build: 0, care: 0 },
  confidence: 1,
  rationale: 'Exploration with some social and movement activity.'
};

test('progression rules are explicitly versioned', () => {
  assert.equal(TRAIT_RULE_VERSION, 'traits-v1');
});

test('the same classified evidence always produces the same deterministic delta', () => {
  assert.deepEqual(signalDelta(classified), {
    explore: 8,
    connect: 4,
    create: 0,
    move: 2,
    build: 0,
    care: 0
  });
  assert.deepEqual(applySignal(newTraitVector(), classified), applySignal(newTraitVector(), classified));
});

test('verified evidence can strengthen a signal without changing its meaning', () => {
  assert.equal(evidenceMultiplier('self'), 1);
  assert.ok(evidenceMultiplier('media') > evidenceMultiplier('self'));
  const self = applySignal(newTraitVector(), classified, evidenceMultiplier('self'));
  const media = applySignal(newTraitVector(), classified, evidenceMultiplier('media'));
  assert.ok(media.explore > self.explore);
  assert.equal(media.create, self.create);
});

test('trait values never exceed 100', () => {
  let traits = newTraitVector();
  for (let i = 0; i < 100; i++) traits = applySignal(traits, classified, 1.15);
  assert.equal(traits.explore, 100);
  assert.ok(Object.values(traits).every(value => value >= 0 && value <= 100));
});

test('Form does not awaken before the threshold', () => {
  const traits = { explore: 20, connect: 10, create: 5, move: 10, build: 5, care: 5 };
  assert.ok(awakeningProgress(traits) < 100);
  assert.equal(resolveForm(traits), null);
});

test('traitDifference makes recomputation explainable including removals', () => {
  const previous = { explore: 10, connect: 8, create: 2, move: 3, build: 0, care: 0 };
  const next = { explore: 7, connect: 8, create: 4, move: 2, build: 1, care: 0 };
  assert.deepEqual(traitDifference(previous, next), {
    explore: -3,
    connect: 0,
    create: 2,
    move: -1,
    build: 1,
    care: 0
  });
});
