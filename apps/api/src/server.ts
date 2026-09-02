import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  lifeSignalSchema,
  newTraitVector,
  applySignal,
  awakeningProgress,
  resolveForm,
  type TraitVector
} from '@form/domain';
import { StubAiGateway } from '@form/ai-gateway';
import {
  pool,
  createDevUser,
  createSeason,
  createLifeMode,
  insertLifeSignal,
  saveClassification,
  listActiveClassifications,
  softDeleteSignal,
  upsertFormState,
  getFormState,
  createCrew
} from '@form/db';
import { registerMvpRoutes, authenticatedUserId } from './routes/mvp.js';

const app = Fastify({ logger: true, bodyLimit: 1_000_000 });
const ai = new StubAiGateway();

async function recompute(userId: string, seasonId: string) {
  const classifications = await listActiveClassifications(userId, seasonId);
  let traits: TraitVector = newTraitVector();
  for (const item of classifications) traits = applySignal(traits, item);
  const state = {
    userId,
    seasonId,
    traits,
    awakeningProgress: awakeningProgress(traits),
    archetype: resolveForm(traits),
    level: 1
  };
  return upsertFormState(state);
}

app.get('/health', async () => {
  await pool.query('SELECT 1');
  return { ok: true, service: 'form-api', database: 'mysql' };
});

app.post('/v1/dev/users', async (request, reply) => {
  if (process.env.NODE_ENV === 'production') return reply.code(404).send({ error: 'not_found' });
  const body = z.object({ handle: z.string().min(2).max(30).optional() }).safeParse(request.body ?? {});
  if (!body.success) return reply.code(400).send({ error: 'invalid_body', details: body.error.flatten() });
  return reply.code(201).send(await createDevUser(body.data.handle));
});

app.post('/v1/seasons', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const parsed = z.object({ label: z.string().min(1).max(40), days: z.number().int().min(7).max(45).default(30) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_season', details: parsed.error.flatten() });
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + parsed.data.days * 86_400_000);
  return reply.code(201).send(await createSeason(userId, parsed.data.label, startsAt, endsAt));
});

app.post('/v1/life-modes', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const parsed = z.object({
    seasonId: z.string().uuid(),
    wantsMore: z.array(z.string().min(1).max(60)).min(1).max(5),
    wantsLess: z.array(z.string().min(1).max(60)).max(5).default([]),
    desiredFeeling: z.string().max(40).optional()
  }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_life_mode', details: parsed.error.flatten() });
  const label = await ai.generateLifeModeLabel({ wantsMore: parsed.data.wantsMore, wantsLess: parsed.data.wantsLess, desiredFeeling: parsed.data.desiredFeeling });
  const mode = await createLifeMode({
    userId,
    seasonId: parsed.data.seasonId,
    label,
    wantsMore: parsed.data.wantsMore,
    wantsLess: parsed.data.wantsLess,
    desiredFeeling: parsed.data.desiredFeeling
  });
  return reply.code(201).send(mode);
});

app.post('/v1/life-signals', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const body = z.object({
    seasonId: z.string().uuid(),
    description: z.string().min(1).max(500),
    evidenceLevel: z.enum(['self','friend','media','system']).default('self'),
    mediaIds: z.array(z.string().uuid()).default([]),
    occurredAt: z.string().datetime().optional(),
    visibility: z.enum(['private','crew']).default('private')
  }).safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: 'invalid_signal', details: body.error.flatten() });
  const signal = lifeSignalSchema.parse({
    id: randomUUID(),
    userId,
    seasonId: body.data.seasonId,
    description: body.data.description,
    evidenceLevel: body.data.evidenceLevel,
    mediaIds: body.data.mediaIds,
    occurredAt: body.data.occurredAt ?? new Date().toISOString(),
    visibility: body.data.visibility
  });
  await insertLifeSignal(signal);
  const classification = await ai.classifyLifeSignal(signal);
  await saveClassification(classification);
  const form = await recompute(userId, signal.seasonId);
  return reply.code(201).send({ signal, classification, form });
});

app.delete('/v1/life-signals/:id', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!params.success || !query.success) return reply.code(400).send({ error: 'invalid_request' });
  const deleted = await softDeleteSignal(userId, params.data.id);
  if (!deleted) return reply.code(404).send({ error: 'signal_not_found' });
  return { deleted: true, form: await recompute(userId, query.data.seasonId) };
});

app.get('/v1/form', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!query.success) return reply.code(400).send({ error: 'season_id_required' });
  const state = await getFormState(userId, query.data.seasonId) ?? await recompute(userId, query.data.seasonId);
  const reasons = await listActiveClassifications(userId, query.data.seasonId);
  return { ...state, reasons: reasons.map(({ signalId, weights, confidence, rationale }) => ({ signalId, weights, confidence, rationale })) };
});

app.post('/v1/crews', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const parsed = z.object({ name: z.string().min(1).max(50).optional() }).safeParse(request.body ?? {});
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_crew' });
  return reply.code(201).send(await createCrew(userId, parsed.data.name));
});

app.post('/v1/life-signals/preview', async (request, reply) => {
  const parsed = lifeSignalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_signal', details: parsed.error.flatten() });
  const classification = await ai.classifyLifeSignal(parsed.data);
  const traits = applySignal(newTraitVector(), classification);
  return { classification, preview: { traits, awakeningProgress: awakeningProgress(traits), archetype: resolveForm(traits) } };
});

await registerMvpRoutes(app);

const port = Number(process.env.API_PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
