import { NeteaseProviderError } from './errors';

export interface NeteaseApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  getCookie?: () => Promise<string | undefined>;
}

type QueryValue = string | number | boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class NeteaseApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly getCookie?: () => Promise<string | undefined>;

  constructor(options: NeteaseApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.getCookie = options.getCookie;
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
      if (!response.ok) {
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service is temporarily unavailable.', true, response.status);
      }
      if (isRecord(payload) && typeof payload.code === 'number' && !acceptedCodes.includes(payload.code)) {
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Music service rejected the request.', true, response.status);
      }

      try {
        return parse(payload);
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
    }
  }
}
