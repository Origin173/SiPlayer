import Constants from 'expo-constants';
import { z } from 'zod';
import type { ApiErrorCode, ErrorEnvelope } from '@siplayer/contracts';

function resolveGatewayUrl(): string {
  const configuredUrl = Constants.expoConfig?.extra?.gatewayUrl;
  return typeof configuredUrl === 'string' && configuredUrl.length > 0
    ? configuredUrl
    : 'http://127.0.0.1:8787';
}

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
  baseUrl?: string;
  getToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => Promise<string | null>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? resolveGatewayUrl()).replace(/\/$/, '');
    this.getToken = options.getToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
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

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });
    } catch {
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
  }
}

const ErrorEnvelopeSchema = z.custom<ErrorEnvelope>((value) => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.requestId === 'string' && 'error' in candidate;
});

const SuccessEnvelopeSchema = z.custom<{ data: unknown; requestId: string }>((value) => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.requestId === 'string' && 'data' in candidate;
});

export const apiClient = new ApiClient();
