import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '@form/config';
import { transportStateReportSchema } from '@form/domain';
import { getNearTransportState, listActiveNearSessions, reportNearTransportState } from '@form/db/transport';
import { appendDomainEvent, trackEvent } from '@form/db/features';
import { authenticatedUserId } from './mvp.js';
import { registerSignalingRoutes } from './signaling.js';
import { registerIceRoutes } from './ice.js';

const paramsSchema = z.object({ id: z.string().uuid() });

function sendTransportError(error: unknown, reply: FastifyReply) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('near_session_not_found')) return reply.code(404).send({ error: 'near_session_not_found' });
  throw error;
}

export async function registerTransportRoutes(app: FastifyInstance) {
  const config = loadConfig();
  await registerSignalingRoutes(app, config);
  await registerIceRoutes(app, config);

  app.get('/v1/near-sessions/active', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return { sessions: await listActiveNearSessions(userId) };
  });

  app.get('/v1/near-sessions/:id/transport', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_near_session' });
    try {
      return await getNearTransportState(userId, params.data.id);
    } catch (error) {
      return sendTransportError(error, reply);
    }
  });

  app.post('/v1/near-sessions/:id/transport', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_near_session' });
    const parsed = transportStateReportSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_transport_state', details: parsed.error.flatten() });

    try {
      const result = await reportNearTransportState({
        userId,
        sessionId: params.data.id,
        state: parsed.data.state,
        observedAt: parsed.data.observedAt
      });

      if (result.changed) {
        const status = result.session.status;
        const event = status === 'connecting'
          ? 'near.connecting'
          : status === 'connected'
            ? 'near.connected'
            : status === 'failed'
              ? 'near.failed'
              : status === 'ended'
                ? 'near.ended'
                : null;
        if (event) {
          await appendDomainEvent(userId, event, 'near_session', params.data.id, {
            connectionId: result.session.connectionId,
            level: result.session.level,
            previousStatus: result.previousStatus
          });
          await trackEvent(userId, event.replace('.', '_'), {
            sessionId: params.data.id,
            connectionId: result.session.connectionId,
            level: result.session.level
          });
        }
      }

      return result;
    } catch (error) {
      return sendTransportError(error, reply);
    }
  });
}
