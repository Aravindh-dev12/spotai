import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  connectionPermissionsPatchSchema,
  connectionRequestSchema,
  connectionResponseSchema,
  nearInviteRequestSchema,
  nearInviteResponseSchema,
  presenceUpdateSchema
} from '@form/domain';
import {
  createConnectionRequest,
  createNearInvite,
  getConnection,
  getNearSession,
  listConnections,
  listPendingNearInvites,
  respondToConnection,
  respondToNearInvite,
  setDeclaredPresence,
  updateConnectionPermissions
} from '@form/db/presence';
import { appendDomainEvent, trackEvent } from '@form/db/features';
import { authenticatedUserId } from './mvp.js';

const idParamsSchema = z.object({ id: z.string().uuid() });

function sendNearError(error: unknown, reply: FastifyReply) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('connection_self_forbidden')) return reply.code(400).send({ error: 'connection_self_forbidden' });
  if (message.includes('connection_user_not_found')) return reply.code(404).send({ error: 'connection_user_not_found' });
  if (message.includes('connection_not_found')) return reply.code(404).send({ error: 'connection_not_found' });
  if (message.includes('connection_blocked')) return reply.code(403).send({ error: 'connection_blocked' });
  if (message.includes('connection_response_forbidden')) return reply.code(403).send({ error: 'connection_response_forbidden' });
  if (message.includes('connection_not_active')) return reply.code(409).send({ error: 'connection_not_active' });
  if (message.includes('presence_permission_denied')) return reply.code(403).send({ error: 'presence_permission_denied' });
  if (message.includes('presence_transition_invalid')) return reply.code(409).send({ error: 'presence_transition_invalid' });
  if (message.includes('presence_representation_invalid')) return reply.code(400).send({ error: 'presence_representation_invalid' });
  if (message.includes('near_permission_denied')) return reply.code(403).send({ error: 'near_permission_denied' });
  if (message.includes('near_invite_not_found')) return reply.code(404).send({ error: 'near_invite_not_found' });
  if (message.includes('near_invite_expired')) return reply.code(410).send({ error: 'near_invite_expired' });
  if (message.includes('near_invite_resolved')) return reply.code(409).send({ error: 'near_invite_resolved' });
  if (message.includes('near_session_not_found')) return reply.code(404).send({ error: 'near_session_not_found' });
  throw error;
}

export async function registerNearRoutes(app: FastifyInstance) {
  app.post('/v1/connections', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = connectionRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_connection_request', details: parsed.error.flatten() });
    try {
      const connection = await createConnectionRequest(userId, parsed.data.otherUserId);
      if (connection.created) {
        await appendDomainEvent(userId, 'connection.requested', 'connection', connection.id, {
          otherUserId: parsed.data.otherUserId,
          clientRequestId: parsed.data.clientRequestId
        });
        await trackEvent(userId, 'connection_requested', { connectionId: connection.id });
      }
      return reply.code(connection.created ? 201 : 200).send(connection);
    } catch (error) {
      return sendNearError(error, reply);
    }
  });

  app.get('/v1/connections', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return { connections: await listConnections(userId) };
  });

  app.get('/v1/connections/:id', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_connection' });
    try { return await getConnection(userId, params.data.id); }
    catch (error) { return sendNearError(error, reply); }
  });

  app.post('/v1/connections/:id/respond', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_connection' });
    const parsed = connectionResponseSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_connection_response' });
    try {
      const result = await respondToConnection(userId, params.data.id, parsed.data.action);
      if (!result.alreadyResolved) {
        await appendDomainEvent(userId, result.accepted ? 'connection.accepted' : 'connection.declined', 'connection', params.data.id, {});
        await trackEvent(userId, result.accepted ? 'connection_accepted' : 'connection_declined', { connectionId: params.data.id });
      }
      return result;
    } catch (error) { return sendNearError(error, reply); }
  });

  app.patch('/v1/connections/:id/permissions', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_connection' });
    const parsed = connectionPermissionsPatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_connection_permissions', details: parsed.error.flatten() });
    try {
      const permissions = await updateConnectionPermissions(userId, params.data.id, parsed.data);
      await appendDomainEvent(userId, 'connection.permission_changed', 'connection', params.data.id, { changed: Object.keys(parsed.data) });
      return { connectionId: params.data.id, permissions };
    } catch (error) { return sendNearError(error, reply); }
  });

  app.put('/v1/connections/:id/presence', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_connection' });
    const parsed = presenceUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_presence', details: parsed.error.flatten() });
    const state = parsed.data.state;
    if (state === 'near' || state === 'together') return reply.code(409).send({ error: 'mutual_near_required' });
    try {
      const presence = await setDeclaredPresence({
        userId,
        connectionId: params.data.id,
        state,
        representation: parsed.data.representation,
        ttlSeconds: parsed.data.ttlSeconds
      });
      await appendDomainEvent(userId, presence.state === 'away' ? 'presence.ended' : 'presence.updated', 'connection', params.data.id, {
        state: presence.state,
        representation: presence.representation,
        expiresAt: presence.expiresAt
      });
      return presence;
    } catch (error) { return sendNearError(error, reply); }
  });

  app.post('/v1/connections/:id/near-invites', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_connection' });
    const parsed = nearInviteRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_near_invite', details: parsed.error.flatten() });
    try {
      const invite = await createNearInvite({ userId, connectionId: params.data.id, ...parsed.data });
      if (!invite.reused) {
        await appendDomainEvent(userId, 'near.invited', 'connection', params.data.id, { inviteId: invite.id, level: invite.level });
        await trackEvent(userId, 'near_invited', { connectionId: params.data.id, level: invite.level });
      }
      return reply.code(invite.reused ? 200 : 201).send(invite);
    } catch (error) { return sendNearError(error, reply); }
  });

  app.get('/v1/near-invites/pending', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return { invites: await listPendingNearInvites(userId) };
  });

  app.post('/v1/near-invites/:id/respond', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_near_invite' });
    const parsed = nearInviteResponseSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_near_response' });
    try {
      const result = await respondToNearInvite(userId, params.data.id, parsed.data.action);
      await appendDomainEvent(userId, result.accepted ? 'near.accepted' : 'near.declined', 'connection', result.connectionId, {
        inviteId: params.data.id,
        sessionId: result.session?.id ?? null,
        level: result.session?.level ?? null
      });
      await trackEvent(userId, result.accepted ? 'near_accepted' : 'near_declined', { connectionId: result.connectionId });
      return result;
    } catch (error) { return sendNearError(error, reply); }
  });

  app.get('/v1/near-sessions/:id', async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_near_session' });
    try { return await getNearSession(userId, params.data.id); }
    catch (error) { return sendNearError(error, reply); }
  });
}
