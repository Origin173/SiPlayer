import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().min(1).default('127.0.0.1'),
  API_VERSION: z.string().min(1).default('0.1.0'),
  NETEASE_API_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  SESSION_ENCRYPTION_KEY: z.string().min(16).default('dev-only-session-encryption-key'),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60 * 1000),
});

export type GatewayConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return envSchema.parse(source);
}
