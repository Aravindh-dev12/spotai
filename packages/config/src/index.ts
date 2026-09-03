import { z } from 'zod';

const boolFromEnv = z.preprocess(value => {
  if (typeof value !== 'string') return value;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).default('mysql://form:form@localhost:3306/form'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  AI_PROVIDER: z.string().min(1).default('stub'),
  AI_API_KEY: z.string().optional().default(''),
  MEDIA_BUCKET: z.string().min(1).default('form-local'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('form'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('form-local-secret'),
  S3_FORCE_PATH_STYLE: boolFromEnv.default(true),
  CORS_ORIGINS: z.string().default(''),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().min(64_000).max(10_000_000).default(1_000_000),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info')
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production') {
    if (env.AI_PROVIDER === 'stub') ctx.addIssue({ code: 'custom', path: ['AI_PROVIDER'], message: 'AI_PROVIDER=stub is not allowed in production.' });
    if (!env.AI_API_KEY) ctx.addIssue({ code: 'custom', path: ['AI_API_KEY'], message: 'AI_API_KEY is required in production.' });
    if (!env.CORS_ORIGINS.trim()) ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'CORS_ORIGINS must be explicit in production.' });
    if (env.S3_SECRET_ACCESS_KEY === 'form-local-secret') ctx.addIssue({ code: 'custom', path: ['S3_SECRET_ACCESS_KEY'], message: 'Local S3 secret cannot be used in production.' });
  }
});

export type RuntimeConfig = z.infer<typeof schema>;

let cached: RuntimeConfig | null = null;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  if (source === process.env && cached) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => `${issue.path.join('.') || 'env'}: ${issue.message}`).join('; ');
    throw new Error(`Invalid runtime configuration: ${message}`);
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}

export function corsOrigins(config = loadConfig()): string[] {
  return config.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
}
