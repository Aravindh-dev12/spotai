import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  lifeSignalSchema,
  newTraitVector,
  applySignal,
  awakeningProgress,
  resolveForm,
  evidenceMultiplier,
  traitDifference,
  TRAIT_RULE_VERSION,
  type TraitVector
} from '@form/domain';
import { createAiGateway } from '@form/ai-gateway';
import { loadConfig } from '@form/config';
import {
  pool,
  createDevUser,
  createSeason,
  getActiveSeason,
  createLifeMode,
  insertLifeSignal,
  listLifeSignals,
  saveClassification,
  listActiveClassifications,
  softDeleteSignal,
  upsertFormState,
  getFormState,
  appendFormHistory,
  getFormHistory,
  createCrew
} from '@form/db';
import { appendDomainEvent, trackEvent } from '@form/db/features';
import { registerMvpRoutes, authenticatedUserId, closeMvpInfrastructure } from './routes/mvp.js';
import { registerNearRoutes } from './routes/near.js';
import { registerTransportRoutes } from './routes/transport.js';
import { registerProductionShell } from './production.js';

const config = loadConfig();
const app = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]']
  },
  bodyLimit: config.apiBodyLimitBytes,
  trustProxy: config.trustProxy
});
const ai = createAiGateway(config.ai);

await registerProductionShell(app, config);

async function recompute(userId: string, seasonId: string, context: {
  changeType: 'signal_added'|'signal_removed'|'recomputed';
  triggerSignalId?: string | null;
  reason: string;
}) {
  const previous = await getFormState(userId, seasonId);
  const previousTraits = previous?.traits ?? newTraitVector();
  const classifications = await listActiveClassifications(userId, seasonId);
  let traits: TraitVector = newTraitVector();
  for (const item of classifications) traits = applySignal(traits, item, evidenceMultiplier(item.evidenceLevel));

  const progress = awakeningProgress(traits);
  const archetype = resolveForm(traits);
  const state = await upsertFormState({
    userId,
    seasonId,
    traits,
    awakeningProgress: progress,
    archetype,
    level: previous?.level ?? 1,
    rulesVersion: TRAIT_RULE_VERSION
  });

  const awakenedNow = !previous?.archetype && Boolean(archetype);
  await appendFormHistory({
    userId,
    seasonId,
    triggerSignalId: context.triggerSignalId ?? null,
    changeType: awakenedNow ? 'awakened' : context.changeType,
    previousTraits,
    deltaTraits: traitDifference(previousTraits, traits),
    resultingTraits: traits,
    awakeningProgress: progress,
    archetype,
    reason: context.reason
  });
  await appendDomainEvent(userId, awakenedNow ? 'form_awakened' : 'trait_vector_changed', 'form', seasonId, {
    rulesVersion: TRAIT_RULE_VERSION,
    triggerSignalId: context.triggerSignalId ?? null,
    awakeningProgress: progress,
    archetype
  });
  return state;
}

app.get('/health', { config: { rateLimit: false } }, async () => {
  await pool.query('SELECT 1');
  return { ok: true, service: 'form-api', database: 'mysql' };
});

app.post('/v1/dev/users', async (request, reply) => {
  if (config.nodeEnv === 'production') return reply.code(404).send({ error: 'not_found' });
  const body = z.object({ handle: z.string().min(2).max(30).optional() }).safeParse(request.body ?? {});
  if (!body.success) return reply.code(400).send({ error: 'invalid_body', details: body.error.flatten() });
  return reply.code(201).send(await createDevUser(body.data.handle));
});

app.get('/v1/seasons/active', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  return { season: await getActiveSeason(userId) };
});

app.post('/v1/seasons', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const parsed = z.object({ label: z.string().min(1).max(40), days: z.number().int().min(7).max(45).default(30) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_season', details: parsed.error.flatten() });
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + parsed.data.days * 86_400_000);
  const season = await createSeason(userId, parsed.data.label, startsAt, endsAt);
  await appendDomainEvent(userId, 'life_mode_started', 'season', String(season.id), { label: season.label });
  await trackEvent(userId, 'season_started', { seasonId: season.id });
  return reply.code(201).send(season);
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
  try {
    const label = await ai.generateLifeModeLabel({ wantsMore: parsed.data.wantsMore, wantsLess: parsed.data.wantsLess, desiredFeeling: parsed.data.desiredFeeling });
    const mode = await createLifeMode({ userId, seasonId: parsed.data.seasonId, label, wantsMore: parsed.data.wantsMore, wantsLess: parsed.data.wantsLess, desiredFeeling: parsed.data.desiredFeeling });
    await appendDomainEvent(userId, 'life_mode_started', 'life_mode', mode.id, { seasonId: mode.seasonId, label: mode.label });
    await trackEvent(userId, 'life_mode_created', { seasonId: mode.seasonId, label: mode.label });
    return reply.code(201).send(mode);
  } catch (error) {
    if (String(error).includes('season_not_found')) return reply.code(404).send({ error: 'season_not_found' });
    if (String(error).includes('season_inactive')) return reply.code(409).send({ error: 'season_inactive' });
    throw error;
  }
});

app.get('/v1/life-signals', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!query.success) return reply.code(400).send({ error: 'season_id_required' });
  try { return { signals: await listLifeSignals(userId, query.data.seasonId) }; }
  catch (error) {
    if (String(error).includes('season_not_found')) return reply.code(404).send({ error: 'season_not_found' });
    throw error;
  }
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
  const signal = lifeSignalSchema.parse({ id: randomUUID(), userId, seasonId: body.data.seasonId, description: body.data.description, evidenceLevel: body.data.evidenceLevel, mediaIds: body.data.mediaIds, occurredAt: body.data.occurredAt ?? new Date().toISOString(), visibility: body.data.visibility });
  try {
    await insertLifeSignal(signal);
    const classification = await ai.classifyLifeSignal(signal);
    await saveClassification(classification);
    await appendDomainEvent(userId, 'life_signal_recorded', 'life_signal', signal.id, { seasonId: signal.seasonId, evidenceLevel: signal.evidenceLevel });
    const form = await recompute(userId, signal.seasonId, { changeType: 'signal_added', triggerSignalId: signal.id, reason: classification.rationale });
    await trackEvent(userId, 'life_signal_recorded', { seasonId: signal.seasonId, awakeningProgress: form.awakeningProgress });
    return reply.code(201).send({ signal, classification, form });
  } catch (error) {
    if (String(error).includes('season_not_found')) return reply.code(404).send({ error: 'season_not_found' });
    if (String(error).includes('season_inactive')) return reply.code(409).send({ error: 'season_inactive' });
    throw error;
  }
});

app.delete('/v1/life-signals/:id', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!params.success || !query.success) return reply.code(400).send({ error: 'invalid_request' });
  const deleted = await softDeleteSignal(userId, params.data.id);
  if (!deleted) return reply.code(404).send({ error: 'signal_not_found' });
  await appendDomainEvent(userId, 'life_signal_removed', 'life_signal', params.data.id, { seasonId: query.data.seasonId });
  return { deleted: true, form: await recompute(userId, query.data.seasonId, { changeType: 'signal_removed', triggerSignalId: params.data.id, reason: 'User removed this moment from their Form.' }) };
});

app.get('/v1/form', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!query.success) return reply.code(400).send({ error: 'season_id_required' });
  try {
    const state = await getFormState(userId, query.data.seasonId) ?? await recompute(userId, query.data.seasonId, { changeType: 'recomputed', reason: 'Initial Form state created from current evidence.' });
    const reasons = await listActiveClassifications(userId, query.data.seasonId);
    return { ...state, reasons: reasons.map(({ signalId, weights, confidence, rationale, evidenceLevel }) => ({ signalId, weights, confidence, rationale, evidenceLevel })) };
  } catch (error) {
    if (String(error).includes('season_not_found')) return reply.code(404).send({ error: 'season_not_found' });
    throw error;
  }
});

app.get('/v1/form/history', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const query = z.object({ seasonId: z.string().uuid() }).safeParse(request.query);
  if (!query.success) return reply.code(400).send({ error: 'season_id_required' });
  try { return { history: await getFormHistory(userId, query.data.seasonId) }; }
  catch (error) {
    if (String(error).includes('season_not_found')) return reply.code(404).send({ error: 'season_not_found' });
    throw error;
  }
});

app.post('/v1/crews', async (request, reply) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return reply.code(401).send({ error: 'user_required' });
  const parsed = z.object({ name: z.string().min(1).max(50).optional() }).safeParse(request.body ?? {});
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_crew' });
  const crew = await createCrew(userId, parsed.data.name);
  await appendDomainEvent(userId, 'crew_created', 'crew', crew.id, { name: crew.name });
  await trackEvent(userId, 'crew_created', { crewId: crew.id });
  return reply.code(201).send(crew);
});

app.post('/v1/life-signals/preview', async (request, reply) => {
  if (config.nodeEnv === 'production') return reply.code(404).send({ error: 'not_found' });
  const parsed = lifeSignalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_signal', details: parsed.error.flatten() });
  const classification = await ai.classifyLifeSignal(parsed.data);
  const traits = applySignal(newTraitVector(), classification, evidenceMultiplier(parsed.data.evidenceLevel));
  return { classification, preview: { traits, awakeningProgress: awakeningProgress(traits), archetype: resolveForm(traits), rulesVersion: TRAIT_RULE_VERSION } };
});

await registerMvpRoutes(app);
await registerNearRoutes(app);
await registerTransportRoutes(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error({ error, requestId: request.id }, 'request failed');
  if (reply.sent) return;
  if (String(error).includes('origin_not_allowed')) return reply.code(403).send({ error: 'origin_not_allowed' });
  return reply.code(500).send({ error: 'internal_error', requestId: request.id });
});

app.addHook('onClose', async () => {
  await closeMvpInfrastructure();
  await pool.end();
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'graceful shutdown started');
  const forceExit = setTimeout(() => process.exit(1), 15_000);
  forceExit.unref();
  try {
    await app.close();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    app.log.error({ error }, 'graceful shutdown failed');
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.apiPort, host: '0.0.0.0' });
