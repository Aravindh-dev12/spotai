import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createUserAndSession,
  getUser,
  resolveSession,
  revokeSession,
  createCrewInvite,
  joinCrewWithInvite,
  listUserCrews,
  listCrewMembers,
  createMediaAsset,
  markMediaReady,
  approveMediaConsent,
  mediaConsentSatisfied,
  getMediaAsset,
  createRevealJob,
  getRevealJob,
  getSeasonRecap,
  trackEvent
} from '@form/db/features';
import { getFormState } from '@form/db';
import { createSignedUpload, createSignedDownload } from '@form/media';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const jobs = new Queue('form-jobs', { connection: redis });

export async function authenticatedUserId(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return resolveSession(authorization.slice(7));
  if (process.env.NODE_ENV !== 'production') {
    const legacy = request.headers['x-user-id'];
    return typeof legacy === 'string' && z.string().uuid().safeParse(legacy).success ? legacy : null;
  }
  return null;
}

function isAdult(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return false;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const month = now.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 18;
}

export async function registerMvpRoutes(app: FastifyInstance) {
  app.post('/v1/auth/guest', async (request, reply) => {
    const parsed = z.object({ handle: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_.]+$/).optional(), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_signup', details: parsed.error.flatten() });
    if (!isAdult(parsed.data.birthDate)) return reply.code(403).send({ error: 'adult_only' });
    try {
      const session = await createUserAndSession(parsed.data);
      await trackEvent(session.user.id, 'account_created', { method: 'guest' });
      return reply.code(201).send(session);
    } catch (error) {
      if (String(error).includes('Duplicate')) return reply.code(409).send({ error: 'handle_taken' });
      throw error;
    }
  });

  app.get('/v1/me', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return getUser(userId);
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.code(401).send({ error: 'unauthorized' });
    await revokeSession(auth.slice(7));
    return { ok: true };
  });

  app.get('/v1/crews', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return { crews: await listUserCrews(userId) };
  });

  app.get('/v1/crews/:id/members', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_crew' });
    try { return { members: await listCrewMembers(userId, parsed.data.id) }; }
    catch (error) {
      if (String(error).includes('crew_forbidden')) return reply.code(403).send({ error: 'crew_forbidden' });
      throw error;
    }
  });

  app.post('/v1/crews/:id/invites', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_crew' });
    try {
      const invite = await createCrewInvite(userId, parsed.data.id);
      return reply.code(201).send({ ...invite, deepLink: `spotai://join?token=${encodeURIComponent(invite.token)}` });
    } catch (error) {
      if (String(error).includes('crew_forbidden')) return reply.code(403).send({ error: 'crew_forbidden' });
      if (String(error).includes('crew_full')) return reply.code(409).send({ error: 'crew_full' });
      throw error;
    }
  });

  app.post('/v1/crews/join', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ token: z.string().min(20).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_invite' });
    try {
      const joined = await joinCrewWithInvite(userId, parsed.data.token);
      await trackEvent(userId, 'crew_joined', { crewId: joined.crewId });
      return joined;
    } catch (error) {
      if (String(error).includes('invite_invalid')) return reply.code(410).send({ error: 'invite_expired_or_used' });
      if (String(error).includes('crew_full')) return reply.code(409).send({ error: 'crew_full' });
      throw error;
    }
  });

  app.post('/v1/media/upload-intents', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({
      contentType: z.enum(['image/jpeg','image/png','image/webp','video/mp4']),
      purpose: z.enum(['life_signal','form_reveal','memory','crew']),
      participantUserIds: z.array(z.string().uuid()).max(4).default([])
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_media_intent', details: parsed.error.flatten() });
    const extension = parsed.data.contentType === 'image/jpeg' ? 'jpg' : parsed.data.contentType.split('/')[1];
    const objectKey = `users/${userId}/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${extension}`;
    const media = await createMediaAsset({
      ownerUserId: userId,
      objectKey,
      mediaType: parsed.data.contentType,
      purpose: parsed.data.purpose,
      consentScope: { purpose: parsed.data.purpose, participantUserIds: parsed.data.participantUserIds, ownerApproved: true }
    });
    const signed = await createSignedUpload({ objectKey, contentType: parsed.data.contentType });
    return reply.code(201).send({ media, ...signed });
  });

  app.post('/v1/media/:id/complete', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ byteSize: z.number().int().positive().max(250_000_000).optional() }).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_media' });
    try { return await markMediaReady(userId, params.data.id, body.data.byteSize); }
    catch (error) {
      if (String(error).includes('media_not_found')) return reply.code(404).send({ error: 'media_not_found' });
      throw error;
    }
  });

  app.post('/v1/media/:id/consent', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_media' });
    try { return await approveMediaConsent(userId, params.data.id); }
    catch (error) {
      if (String(error).includes('consent_not_found')) return reply.code(404).send({ error: 'consent_not_found' });
      throw error;
    }
  });

  app.get('/v1/media/:id/view', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_media' });
    const media = await getMediaAsset(userId, params.data.id);
    if (!media || media.status !== 'ready') return reply.code(404).send({ error: 'media_not_ready' });
    return { url: await createSignedDownload(String(media.objectKey)) };
  });

  app.post('/v1/reveals', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ seasonId: z.string().uuid(), sourceMediaId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_reveal' });
    const media = await getMediaAsset(userId, parsed.data.sourceMediaId);
    if (!media || media.status !== 'ready') return reply.code(409).send({ error: 'source_media_not_ready' });
    if (!(await mediaConsentSatisfied(parsed.data.sourceMediaId))) return reply.code(409).send({ error: 'participant_consent_required' });
    const form = await getFormState(userId, parsed.data.seasonId);
    if (!form?.archetype) return reply.code(409).send({ error: 'form_not_awakened' });
    const reveal = await createRevealJob({ userId, seasonId: parsed.data.seasonId, sourceMediaId: parsed.data.sourceMediaId, archetype: form.archetype });
    await jobs.add('form-reveal', { revealId: reveal.id, userId, seasonId: parsed.data.seasonId, sourceMediaId: parsed.data.sourceMediaId, archetype: reveal.archetype }, { attempts: 3, backoff: { type: 'exponential', delay: 1500 }, removeOnComplete: 1000, removeOnFail: 1000 });
    await trackEvent(userId, 'form_reveal_requested', { seasonId: parsed.data.seasonId, archetype: reveal.archetype });
    return reply.code(202).send(reveal);
  });

  app.get('/v1/reveals/:id', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_reveal' });
    const reveal = await getRevealJob(userId, parsed.data.id);
    if (!reveal) return reply.code(404).send({ error: 'reveal_not_found' });
    return reveal;
  });

  app.get('/v1/seasons/:id/recap', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_season' });
    return getSeasonRecap(userId, parsed.data.id);
  });
}

export async function closeMvpInfrastructure() {
  await jobs.close();
  if (redis.status !== 'end') await redis.quit();
}
