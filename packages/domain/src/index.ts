import { z } from 'zod';

export const TRAIT_RULE_VERSION = 'traits-v1';
export const traitKeys = ['explore', 'connect', 'create', 'move', 'build', 'care'] as const;
export type TraitKey = (typeof traitKeys)[number];

export const traitVectorSchema = z.object({
  explore: z.number().min(0).max(100),
  connect: z.number().min(0).max(100),
  create: z.number().min(0).max(100),
  move: z.number().min(0).max(100),
  build: z.number().min(0).max(100),
  care: z.number().min(0).max(100)
});
export type TraitVector = z.infer<typeof traitVectorSchema>;

export const lifeModeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  seasonId: z.string().uuid(),
  label: z.string().min(1).max(40),
  wantsMore: z.array(z.string()).min(1).max(5),
  wantsLess: z.array(z.string()).max(5).default([]),
  desiredFeeling: z.string().max(40).optional(),
  createdAt: z.string().datetime()
});
export type LifeMode = z.infer<typeof lifeModeSchema>;

export const evidenceLevelSchema = z.enum(['self', 'friend', 'media', 'system']);
export type EvidenceLevel = z.infer<typeof evidenceLevelSchema>;
export const lifeSignalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  seasonId: z.string().uuid(),
  description: z.string().min(1).max(500),
  evidenceLevel: evidenceLevelSchema,
  mediaIds: z.array(z.string().uuid()).default([]),
  occurredAt: z.string().datetime(),
  visibility: z.enum(['private', 'crew']).default('private')
});
export type LifeSignal = z.infer<typeof lifeSignalSchema>;

export const classifiedSignalSchema = z.object({
  signalId: z.string().uuid(),
  weights: traitVectorSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(300)
});
export type ClassifiedSignal = z.infer<typeof classifiedSignalSchema>;

export const formArchetypes = {
  VECTOR: { explore: 1, connect: 0.7, create: 0.2, move: 0.8, build: 0.3, care: 0.2 },
  ECHO: { explore: 0.3, connect: 0.9, create: 1, move: 0.2, build: 0.3, care: 0.6 },
  FORGE: { explore: 0.2, connect: 0.3, create: 0.4, move: 0.7, build: 1, care: 0.3 },
  ORBIT: { explore: 0.9, connect: 0.4, create: 0.8, move: 0.3, build: 0.4, care: 0.2 },
  PULSE: { explore: 0.4, connect: 1, create: 0.3, move: 0.9, build: 0.2, care: 0.5 },
  HAVEN: { explore: 0.2, connect: 0.8, create: 0.3, move: 0.2, build: 0.4, care: 1 }
} as const;
export type FormArchetype = keyof typeof formArchetypes;

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const round = (n: number) => Number(n.toFixed(2));

export function newTraitVector(): TraitVector {
  return { explore: 0, connect: 0, create: 0, move: 0, build: 0, care: 0 };
}

export function evidenceMultiplier(level: EvidenceLevel): number {
  switch (level) {
    case 'friend': return 1.1;
    case 'media': return 1.15;
    case 'system': return 1.05;
    default: return 1;
  }
}

export function signalDelta(classified: ClassifiedSignal, multiplier = 1): TraitVector {
  const delta = newTraitVector();
  for (const key of traitKeys) {
    delta[key] = round((classified.weights[key] / 100) * 8 * classified.confidence * multiplier);
  }
  return delta;
}

export function applySignal(current: TraitVector, classified: ClassifiedSignal, multiplier = 1): TraitVector {
  const delta = signalDelta(classified, multiplier);
  const next = { ...current };
  for (const key of traitKeys) next[key] = clamp(round(next[key] + delta[key]));
  return next;
}

export function traitDifference(previous: TraitVector, next: TraitVector): TraitVector {
  const delta = newTraitVector();
  for (const key of traitKeys) delta[key] = round(next[key] - previous[key]);
  return delta;
}

export function awakeningProgress(traits: TraitVector): number {
  const total = traitKeys.reduce((sum, key) => sum + traits[key], 0);
  return Math.min(100, Math.round((total / 120) * 100));
}

export function resolveForm(traits: TraitVector): FormArchetype | null {
  if (awakeningProgress(traits) < 100) return null;
  let winner: FormArchetype = 'VECTOR';
  let best = -Infinity;
  for (const [name, target] of Object.entries(formArchetypes) as [FormArchetype, Record<TraitKey, number>][]) {
    const score = traitKeys.reduce((sum, key) => sum + (traits[key] / 100) * target[key], 0);
    if (score > best) { best = score; winner = name; }
  }
  return winner;
}

export * from './presence.js';
export * from './near-transport.js';
