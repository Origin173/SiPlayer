import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().min(1).default('127.0.0.1'),
  API_VERSION: z.string().min(1).default('0.1.0'),
  NETEASE_API_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  SESSION_ENCRYPTION_KEY: z.string().min(16).default('dev-only-session-encryption-key'),
  ALLOWED_ORIGINS: z.string().default('*'),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60 * 1000),
  SESSION_STORE_PATH: z.string().min(1).optional(),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  RESPONSE_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(30_000),
  RESPONSE_CACHE_MAX_ENTRIES: z.coerce.number().int().nonnegative().default(256),
});

export type GatewayConfig = z.infer<typeof envSchema>;

export function defaultSessionStorePath(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32'
    ? 'D:\\tmp\\siplayer\\gateway-sessions.json'
    : join(tmpdir(), 'siplayer', 'gateway-sessions.json');
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const hasExplicitSessionPath = typeof source.SESSION_STORE_PATH === 'string' && source.SESSION_STORE_PATH.trim().length > 0;
  const config = envSchema.parse(source);
  const sessionStorePath = config.SESSION_STORE_PATH ?? (config.NODE_ENV === 'test' ? undefined : defaultSessionStorePath());
  if (
    config.NODE_ENV === 'production'
    && (config.SESSION_ENCRYPTION_KEY === 'dev-only-session-encryption-key' || config.ALLOWED_ORIGINS === '*' || !hasExplicitSessionPath)
  ) {
    throw new Error('Production requires a non-default SESSION_ENCRYPTION_KEY, explicit ALLOWED_ORIGINS, and SESSION_STORE_PATH.');
  }
  return {
    ...config,
    SESSION_STORE_PATH: sessionStorePath,
  };
}
