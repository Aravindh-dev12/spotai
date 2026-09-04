import type { FastifyInstance } from 'fastify';
import { createHmac } from 'node:crypto';
import type { AppConfig } from '@form/config';
import { authenticatedUserId } from './mvp.js';

export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

export function createIceServerConfig(userId: string, config: AppConfig, now = Date.now()) {
  const iceServers: IceServerConfig[] = [];
  if (config.rtc.stunUrls.length) iceServers.push({ urls: config.rtc.stunUrls });

  let expiresAt: string | null = null;
  if (config.rtc.turnUrls.length && config.rtc.turnSharedSecret) {
    const expiresEpoch = Math.floor(now / 1000) + config.rtc.iceTtlSeconds;
    const username = `${expiresEpoch}:${userId}`;
    const credential = createHmac('sha1', config.rtc.turnSharedSecret).update(username).digest('base64');
    iceServers.push({ urls: config.rtc.turnUrls, username, credential });
    expiresAt = new Date(expiresEpoch * 1000).toISOString();
  }

  return { iceServers, expiresAt };
}

export async function registerIceRoutes(app: FastifyInstance, config: AppConfig) {
  app.get('/v1/realtime/ice', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = await authenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const result = createIceServerConfig(userId, config);
    if (!result.iceServers.length) return reply.code(503).send({ error: 'rtc_not_configured' });
    reply.header('cache-control', 'private, no-store');
    return result;
  });
}
