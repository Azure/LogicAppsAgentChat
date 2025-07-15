import pRetry from 'p-retry';
import type {
  AuthConfig,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  HttpClientOptions,
} from './types';

export class HttpClient {
  private readonly baseUrl: string;
  private readonly auth: AuthConfig | undefined;
  private readonly options: Required<HttpClientOptions>;
  private readonly apiKey?: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(
    baseUrl: string,
    auth?: AuthConfig,
    options: HttpClientOptions = {},
    apiKey?: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.auth = auth;
    this.apiKey = apiKey;
    this.options = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async request<T = unknown>(path: string, config: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Default headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    });

    // Add API key header if provided
    if (this.apiKey) {
      headers.set('X-API-Key', this.apiKey);
    }

    // Create request config
    let requestConfig: RequestConfig & { url: string } = {
      ...config,
      url,
      headers: Object.fromEntries(headers.entries()),
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    // Create request options
    const requestOptions: RequestInit = {
      method: requestConfig.method || 'GET',
      headers: new Headers(requestConfig.headers),
    };

    // Only add optional properties if defined
    if (requestConfig.signal !== undefined) {
      requestOptions.signal = requestConfig.signal;
    }
    if (requestConfig.credentials !== undefined) {
      requestOptions.credentials = requestConfig.credentials;
    }
    if (requestConfig.body) {
      requestOptions.body = JSON.stringify(requestConfig.body);
    }

    // Create request with auth
    const request = new Request(requestConfig.url, requestOptions);

    // Apply authentication
    await this.applyAuth(request);

    // Execute request with retry
    const response = await pRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
          const options: RequestInit = {
            method: request.method,
            headers: request.headers,
            signal: controller.signal,
          };

          // Add optional properties if defined
          if (request.credentials !== undefined) {
            options.credentials = request.credentials;
          }

          // Add body and duplex option if needed
          if (request.body) {
            options.body = request.body;
            // Required for streaming bodies in some environments
            (options as any).duplex = 'half';
          }

          const fetchRequest = new Request(request.url, options);

          const res = await fetch(fetchRequest);
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errorBody = await this.parseErrorResponse(res);
            throw new Error(errorBody || `HTTP error! status: ${res.status} ${res.statusText}`);
          }

          return res;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      {
        retries: this.options.retries,
        minTimeout: this.options.retryDelay,
        onFailedAttempt: (error) => {
          console.warn(`Request failed, attempt ${error.attemptNumber}: ${error.message}`);
        },
      }
    );

    // Parse response
    let data = await response.json();

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      data = await interceptor(data);
    }

    return data as T;
  }

  async get<T = unknown>(
    path: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  async delete<T = unknown>(
    path: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  private async applyAuth(request: Request): Promise<void> {
    if (!this.auth || this.auth.type === 'none') {
      return;
    }

    switch (this.auth.type) {
      case 'bearer':
        request.headers.set('Authorization', `Bearer ${this.auth.token}`);
        break;

      case 'oauth2':
        const tokenType = this.auth.tokenType || 'Bearer';
        request.headers.set('Authorization', `${tokenType} ${this.auth.accessToken}`);
        break;

      case 'api-key':
        request.headers.set(this.auth.header, this.auth.key);
        break;

      case 'custom':
        await this.auth.handler(request);
        break;
    }
  }

  private async parseErrorResponse(response: Response): Promise<string | null> {
    try {
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const errorData = await response.json();

        // Try common error message patterns
        if (errorData.error?.message) return errorData.error.message;
        if (errorData.message) return errorData.message;
        if (errorData.error) return errorData.error;

        return JSON.stringify(errorData);
      } else {
        return await response.text();
      }
    } catch {
      return null;
    }
  }
}
