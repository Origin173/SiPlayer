import { NeteaseProviderError } from './errors';

export interface NeteaseApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  getCookie?: () => Promise<string | undefined>;
  onRequestComplete?: (metric: UpstreamRequestMetric) => void;
}

export interface UpstreamRequestMetric {
  path: string;
  statusCode?: number;
  durationMs: number;
  outcome: 'success' | 'error';
}

type QueryValue = string | number | boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthExpiredResponse(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const code = payload.code;
  if (code === 301 || code === 401) return true;
  const message = [payload.message, payload.msg].filter((value): value is string => typeof value === 'string').join(' ').toLowerCase();
  return message.includes('登录') || message.includes('login') || message.includes('unauthorized');
}

export class NeteaseApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly getCookie?: () => Promise<string | undefined>;
  private readonly onRequestComplete?: (metric: UpstreamRequestMetric) => void;

  constructor(options: NeteaseApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.getCookie = options.getCookie;
    this.onRequestComplete = options.onRequestComplete;
  }

  async get<T>(
    path: string,
    query: Record<string, QueryValue>,
    parse: (payload: unknown) => T,
    cookieOverride?: string,
    acceptedCodes: number[] = [200],
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    let statusCode: number | undefined;
    let outcome: UpstreamRequestMetric['outcome'] = 'error';
    try {
      const cookie = cookieOverride ?? (this.getCookie ? await this.getCookie() : undefined);
      const response = await this.fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        signal: controller.signal,
      });

      const payload: unknown = await response.json().catch(() => null);
      statusCode = response.status;
      if (!response.ok) {
        if (response.status === 429) {
          throw new NeteaseProviderError('RATE_LIMITED', 'Music service rate limit exceeded.', true, response.status);
        }
        if (cookieOverride && (response.status === 401 || response.status === 403)) {
          throw new NeteaseProviderError('AUTH_EXPIRED', 'The upstream login session has expired.', false, response.status);
        }
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service is temporarily unavailable.', true, response.status);
      }
      if (isRecord(payload) && typeof payload.code === 'number' && !acceptedCodes.includes(payload.code)) {
        if (cookieOverride && isAuthExpiredResponse(payload)) {
          throw new NeteaseProviderError('AUTH_EXPIRED', 'The upstream login session has expired.', false, response.status);
        }
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service rejected the request.', true, response.status);
      }

      try {
        const result = parse(payload);
        outcome = 'success';
        return result;
      } catch {
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service returned an unsupported response.', true, response.status);
      }
    } catch (error) {
      if (error instanceof NeteaseProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NeteaseProviderError('UPSTREAM_TIMEOUT', 'Music service took too long to respond.', true);
      }
      throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service is temporarily unavailable.', true);
    } finally {
      clearTimeout(timeout);
      try {
        this.onRequestComplete?.({
          path,
          statusCode,
          durationMs: Math.max(0, Date.now() - startedAt),
          outcome,
        });
      } catch {
        // Observability must never change the provider result.
      }
    }
  }
}
