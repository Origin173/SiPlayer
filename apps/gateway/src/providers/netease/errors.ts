export type NeteaseProviderErrorCode =
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'TRACK_UNAVAILABLE';

export class NeteaseProviderError extends Error {
  readonly code: NeteaseProviderErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: NeteaseProviderErrorCode, message: string, retryable: boolean, status?: number) {
    super(message);
    this.name = 'NeteaseProviderError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}
