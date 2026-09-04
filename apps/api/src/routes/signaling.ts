import type { FastifyInstance, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { z } from 'zod';
import type { AppConfig } from '@form/config';
import { signalingMessageSchema } from '@form/domain';
import { getNearSession } from '@form/db/presence';
import { authenticatedUserId } from './mvp.js';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ after: z.string().max(64).optional() });
const SIGNAL_TTL_SECONDS = 600;
const MAX_STREAM_LENGTH = 256;

function sendSignalingError(error: unknown, reply: FastifyReply) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('near_session_not_found')) return reply.code(404).send({ error: 'near_session_not_found' });
  if (message.includes('near_session_closed')) return reply.code(409).send({ error: 'near_session_closed' });
  throw error;
}

export async function registerSignalingRoutes(app: FastifyInstance, config: AppConfig) {
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true
  });
  await redis.connect();

  app.addHook('onClose', async () => {
    if (redis.status !== 'end') await redis.quit();
  });

  app.post('/v1/near-sessions/:id/signals', { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_near_session' });
    const parsed = signalingMessageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_signal', details: parsed.error.flatten() });

    try {
      const session = await getNearSession(userId, params.data.id);
      if (session.status === 'ended' || session.status === 'failed') throw new Error('near_session_closed');

      const streamKey = `near:signals:${params.data.id}`;
      const dedupeKey = `near:signal:dedupe:${params.data.id}:${userId}:${parsed.data.clientMessageId}`;
      const first = await redis.set(dedupeKey, '1', 'EX', SIGNAL_TTL_SECONDS, 'NX');
      if (!first) return reply.code(200).send({ accepted: true, duplicate: true });

      const streamId = await redis.xadd(
        streamKey,
        'MAXLEN', '~', MAX_STREAM_LENGTH,
        '*',
        'senderUserId', userId,
        'clientMessageId', parsed.data.clientMessageId,
        'type', parsed.data.type,
        'payload', parsed.data.payload
      );
      await redis.expire(streamKey, SIGNAL_TTL_SECONDS);
      return reply.code(202).send({ accepted: true, duplicate: false, cursor: streamId });
    } catch (error) {
      return sendSignalingError(error, reply);
    }
  });

  app.get('/v1/near-sessions/:id/signals', { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: 'invalid_signal_cursor' });

    try {
      const session = await getNearSession(userId, params.data.id);
      if (session.status === 'ended' || session.status === 'failed') return { messages: [], cursor: query.data.after ?? '0-0', closed: true };

      const streamKey = `near:signals:${params.data.id}`;
      const after = query.data.after ?? '0-0';
      const min = after === '0-0' ? '-' : `(${after}`;
      const entries = await redis.xrange(streamKey, min, '+', 'COUNT', 100);
      const messages = entries.flatMap(([id, fields]) => {
        const record: Record<string, string> = {};
        for (let index = 0; index < fields.length; index += 2) record[fields[index]!] = fields[index + 1]!;
        if (record.senderUserId === userId) return [];
        return [{
          cursor: id,
          senderUserId: record.senderUserId,
          clientMessageId: record.clientMessageId,
          type: record.type,
          payload: record.payload
        }];
      });
      const cursor = entries.at(-1)?.[0] ?? after;
      return { messages, cursor, closed: false };
    } catch (error) {
      return sendSignalingError(error, reply);
    }
  });
}
