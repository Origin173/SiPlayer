import type { z } from 'zod';
import { ErrorEnvelopeSchema, SuccessEnvelopeSchema, type ApiErrorCode } from '@siplayer/contracts';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly status: number;

  constructor(
    message: string,
    options: {
      code: ApiErrorCode;
      retryable: boolean;
      status: number;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => Promise<string | null>;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getToken = options.getToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    schema?: z.ZodType<T>,
  ): Promise<{ data: T; requestId: string }> {
    const token = this.getToken ? await this.getToken() : null;
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const method = (options.method ?? 'GET').toUpperCase();
    const maxAttempts = method === 'GET' ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await this.requestOnce(path, options, headers, schema);
      } catch (error) {
        if (!this.shouldRetry(error, method, attempt, options.signal)) throw error;
      }
    }

    throw new ApiError('音乐服务暂时不可用', {
      code: 'UPSTREAM_UNAVAILABLE',
      retryable: true,
      status: 0,
    });
  }

  private async requestOnce<T>(
    path: string,
    options: RequestInit,
    headers: Headers,
    schema?: z.ZodType<T>,
  ): Promise<{ data: T; requestId: string }> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const externalSignal = options.signal;
    const abortFromExternalSignal = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) throw new DOMException('The request was aborted.', 'AbortError');
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } catch (error) {
        if (externalSignal?.aborted) throw error;
        if (timedOut) {
          throw new ApiError('请求超时，请稍后重试', {
            code: 'UPSTREAM_TIMEOUT',
            retryable: true,
            status: 0,
          });
        }
        throw new ApiError('网络连接不稳定', {
          code: 'UPSTREAM_UNAVAILABLE',
          retryable: true,
          status: 0,
        });
      }

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorPayload = ErrorEnvelopeSchema.safeParse(payload);
        if (errorPayload.success) {
          throw new ApiError(errorPayload.data.error.message, {
            code: errorPayload.data.error.code,
            retryable: errorPayload.data.error.retryable,
            status: response.status,
            requestId: errorPayload.data.requestId,
          });
        }
        throw new ApiError('音乐服务暂时不可用', {
          code: response.status === 401 ? 'AUTH_REQUIRED' : 'UPSTREAM_UNAVAILABLE',
          retryable: response.status >= 500,
          status: response.status,
        });
      }

      const envelope = SuccessEnvelopeSchema.safeParse(payload);
      if (!envelope.success) {
        throw new ApiError('服务响应格式异常', {
          code: 'INTERNAL_ERROR',
          retryable: false,
          status: response.status,
        });
      }

      const data = schema ? schema.parse(envelope.data.data) : (envelope.data.data as T);
      return { data, requestId: envelope.data.requestId };
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    }
  }

  private shouldRetry(error: unknown, method: string, attempt: number, externalSignal?: AbortSignal): boolean {
    if (method !== 'GET' || attempt > 0 || externalSignal?.aborted) return false;
    if (!(error instanceof ApiError) || !error.retryable) return false;
    return error.status === 0 || error.status >= 500;
  }
}
