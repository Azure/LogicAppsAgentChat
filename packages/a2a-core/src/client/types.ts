export type AuthConfig = 
  | { type: 'bearer'; token: string }
  | { type: 'oauth2'; accessToken: string; tokenType?: string }
  | { type: 'api-key'; key: string; header: string }
  | { type: 'custom'; handler: (request: Request) => Promise<Request> | Request }
  | { type: 'none' };

export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface RequestInterceptor {
  (config: RequestConfig & { url: string }): RequestConfig & { url: string } | Promise<RequestConfig & { url: string }>;
}

export interface ResponseInterceptor {
  (response: unknown): unknown | Promise<unknown>;
}

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}