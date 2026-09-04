import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).default('mysql://form:form@localhost:3306/form'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BODY_LIMIT_BYTES: z.coerce.number().int().min(64_000).max(20_000_000).default(1_000_000),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  APP_ORIGINS: z.string().default(''),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(10_000).default(180),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  AI_PROVIDER: z.enum(['stub', 'openai-compatible']).default('stub'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(12_000),
  RTC_STUN_URLS: z.string().default('stun:stun.l.google.com:19302'),
  RTC_TURN_URLS: z.string().default(''),
  RTC_TURN_SHARED_SECRET: z.string().min(16).optional(),
  RTC_ICE_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
  MEDIA_BUCKET: z.string().min(1).default('form-local'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('true')
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && env.AI_PROVIDER === 'stub') {
    ctx.addIssue({ code: 'custom', path: ['AI_PROVIDER'], message: 'Production cannot run with the stub AI provider.' });
  }
  if (env.AI_PROVIDER !== 'stub' && (!env.AI_API_KEY || !env.AI_MODEL)) {
    ctx.addIssue({ code: 'custom', path: ['AI_API_KEY'], message: 'AI_API_KEY and AI_MODEL are required for a real AI provider.' });
  }
  if (env.NODE_ENV === 'production' && env.APP_ORIGINS.trim().length === 0) {
    ctx.addIssue({ code: 'custom', path: ['APP_ORIGINS'], message: 'APP_ORIGINS must be explicitly configured in production.' });
  }
  if (env.NODE_ENV === 'production' && (!env.RTC_TURN_URLS.trim() || !env.RTC_TURN_SHARED_SECRET)) {
    ctx.addIssue({ code: 'custom', path: ['RTC_TURN_URLS'], message: 'Production realtime requires RTC_TURN_URLS and RTC_TURN_SHARED_SECRET.' });
  }
});

function csv(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string;
  redisUrl: string;
  apiPort: number;
  apiBodyLimitBytes: number;
  trustProxy: boolean;
  allowedOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  ai: {
    provider: 'stub' | 'openai-compatible';
    apiKey?: string;
    baseUrl: string;
    model?: string;
    timeoutMs: number;
  };
  rtc: {
    stunUrls: string[];
    turnUrls: string[];
    turnSharedSecret?: string;
    iceTtlSeconds: number;
  };
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map(issue => `${issue.path.join('.') || 'environment'}: ${issue.message}`).join('; ');
    throw new Error(`invalid_environment: ${details}`);
  }
  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    apiPort: env.API_PORT,
    apiBodyLimitBytes: env.API_BODY_LIMIT_BYTES,
    trustProxy: env.TRUST_PROXY === 'true',
    allowedOrigins: csv(env.APP_ORIGINS),
    rateLimitMax: env.RATE_LIMIT_MAX,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    ai: {
      provider: env.AI_PROVIDER,
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_BASE_URL,
      model: env.AI_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS
    },
    rtc: {
      stunUrls: csv(env.RTC_STUN_URLS),
      turnUrls: csv(env.RTC_TURN_URLS),
      turnSharedSecret: env.RTC_TURN_SHARED_SECRET,
      iceTtlSeconds: env.RTC_ICE_TTL_SECONDS
    }
  };
}

export function redactedConfigSummary(config: AppConfig) {
  return {
    nodeEnv: config.nodeEnv,
    apiPort: config.apiPort,
    trustProxy: config.trustProxy,
    allowedOriginCount: config.allowedOrigins.length,
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowMs: config.rateLimitWindowMs,
    aiProvider: config.ai.provider,
    aiBaseUrl: config.ai.baseUrl,
    aiModelConfigured: Boolean(config.ai.model),
    rtcStunServerCount: config.rtc.stunUrls.length,
    rtcTurnServerCount: config.rtc.turnUrls.length,
    rtcTurnSecretConfigured: Boolean(config.rtc.turnSharedSecret)
  };
}
