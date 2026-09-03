import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import type { AppConfig } from '@form/config';
import { redactedConfigSummary } from '@form/config';
import { pool } from '@form/db';

function requestKey(authorization: string | undefined, ip: string) {
  if (!authorization?.startsWith('Bearer ')) return `ip:${ip}`;
  const digest = createHash('sha256').update(authorization.slice(7)).digest('hex').slice(0, 32);
  return `session:${digest}`;
}

export async function registerProductionShell(app: FastifyInstance, config: AppConfig) {
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true
  });
  await redis.connect();

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  await app.register(cors, {
    credentials: false,
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin) || config.nodeEnv !== 'production') {
        callback(null, true);
        return;
      }
      callback(new Error('origin_not_allowed'), false);
    }
  });

  await app.register(rateLimit, {
    global: true,
    redis,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: request => requestKey(request.headers.authorization, request.ip),
    errorResponseBuilder: (_request, context) => ({
      error: 'rate_limited',
      retryAfterMs: context.after
    })
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/v1/auth') || request.url === '/v1/me') {
      reply.header('cache-control', 'no-store');
      reply.header('pragma', 'no-cache');
    }
    return payload;
  });

  app.get('/health/live', { config: { rateLimit: false } }, async () => ({
    ok: true,
    service: 'form-api'
  }));

  app.get('/health/ready', { config: { rateLimit: false } }, async (_request, reply) => {
    try {
      await Promise.all([pool.query('SELECT 1'), redis.ping()]);
      return { ok: true, database: 'mysql', cache: 'redis' };
    } catch (error) {
      app.log.error({ error }, 'readiness check failed');
      return reply.code(503).send({ ok: false, error: 'not_ready' });
    }
  });

  app.addHook('onClose', async () => {
    if (redis.status !== 'end') await redis.quit();
  });

  app.log.info({ runtime: redactedConfigSummary(config) }, 'production shell configured');
}
