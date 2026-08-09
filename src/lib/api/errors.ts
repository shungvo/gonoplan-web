/** Mirrors the server envelope in docs/02-api.md §1. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}

/**
 * A failed API call, carrying the server's stable error `code`.
 *
 * UI branches on `code`, never on `message` — messages are prose that gets
 * reworded and translated. `requestId` is surfaced in error states so a user
 * reporting a problem gives us something greppable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[] | undefined;
  readonly requestId: string | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: ApiErrorDetail[]; requestId?: string } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.requestId = options.requestId;
  }

  /** Network failure, DNS, offline, or an aborted request — no HTTP response. */
  static network(cause: unknown): ApiError {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach Gonoplan. Check your connection.',
      cause instanceof Error ? { details: [{ field: 'network', message: cause.message }] } : {},
    );
  }

  get isAuthExpired(): boolean {
    return this.status === 401 && this.code === 'AUTH_TOKEN_EXPIRED';
  }

  /** Retrying these can succeed; retrying a 4xx cannot. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}
