/**
 * A2A Chat History API Client
 *
 * Provides functions to interact with server-side chat history APIs.
 * All methods use JSON-RPC 2.0 protocol over HTTP POST.
 *
 * IMPORTANT API Corrections from live testing:
 * - Method name is "context/update" (singular), NOT "contexts/update"
 * - All enum values are lowercase: "user", "agent", "text", etc.
 * - Name field is optional in contexts
 *
 * See: docs/api-testing-findings.md for detailed API behavior
 */

import {
  ServerContext,
  ServerTask,
  ListContextsParams,
  ListTasksParams,
  UpdateContextParams,
  ListContextsResponseSchema,
  ListTasksResponseSchema,
  UpdateContextResponseSchema,
} from './history-types';

/**
 * Configuration for history API calls
 */
export type HistoryApiConfig = {
  agentUrl: string; // Full agent URL (e.g., https://example.com/api/agents/AgentName)
  getAuthToken?: () => Promise<string> | string; // Function to get auth token
  timeout?: number; // Request timeout in ms (default: 30000)
};

/**
 * JSON-RPC 2.0 request structure
 */
type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

/**
 * Base API client for making JSON-RPC calls
 */
class HistoryApiClient {
  private config: HistoryApiConfig;
  private requestIdCounter = 0;

  constructor(config: HistoryApiConfig) {
    this.config = config;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `history-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Make a JSON-RPC call to the agent
   */
  private async makeRequest<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method,
      params,
    };

    console.log('[HistoryApiClient] Making request:', {
      url: this.config.agentUrl,
      method,
      params,
      requestId: request.id,
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization if token provider is configured and returns a non-empty token
    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        console.log('[HistoryApiClient] Auth token present, using Bearer auth');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('[HistoryApiClient] Token empty, relying on cookie authentication');
      }
    } else {
      console.log('[HistoryApiClient] No auth token provider, relying on cookie authentication');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? 30000);

    try {
      console.log('[HistoryApiClient] Sending fetch request...');
      const response = await fetch(this.config.agentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
        credentials: 'include', // Include cookies for cookie-based authentication
      });

      clearTimeout(timeoutId);

      console.log('[HistoryApiClient] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[HistoryApiClient] Response data:', JSON.stringify(data, null, 2));

      // Check for JSON-RPC error
      if (data.error) {
        throw new Error(`JSON-RPC error ${data.error.code}: ${data.error.message}`);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout ?? 30000}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error occurred during API request');
    }
  }

  /**
   * List all contexts (chat sessions) for the authenticated user
   *
   * @param params - Optional filter and pagination parameters
   * @returns Array of contexts
   */
  async listContexts(params?: ListContextsParams): Promise<ServerContext[]> {
    const response = await this.makeRequest('contexts/list', params);

    try {
      const validated = ListContextsResponseSchema.parse(response);
      return validated.result;
    } catch (error) {
      console.error('[HistoryApiClient] Schema validation failed for contexts/list');
      console.error('[HistoryApiClient] Validation error:', error);
      if (error instanceof Error && 'issues' in error) {
        console.error(
          '[HistoryApiClient] Zod issues:',
          JSON.stringify((error as any).issues, null, 2)
        );
      }
      throw error;
    }
  }

  /**
   * List all tasks (message exchanges) within a context
   *
   * @param contextId - The context ID to fetch tasks for
   * @returns Array of tasks with full message history
   */
  async listTasks(contextId: string): Promise<ServerTask[]> {
    const params: ListTasksParams = {
      Id: contextId, // Note: capital 'I' as per API spec
    };

    const response = await this.makeRequest('tasks/list', params);
    const validated = ListTasksResponseSchema.parse(response);
    return validated.result;
  }

  /**
   * Update context metadata (name, archive status, etc.)
   *
   * IMPORTANT: The method name is "context/update" (singular), not "contexts/update"
   *
   * @param params - Update parameters (id, name, isArchived)
   * @returns Updated context
   */
  async updateContext(params: UpdateContextParams): Promise<ServerContext> {
    // CRITICAL: Method name is singular "context/update", not "contexts/update"
    const response = await this.makeRequest('context/update', params);
    const validated = UpdateContextResponseSchema.parse(response);
    return validated.result;
  }
}

// ============================================================================
// Exported Factory Function
// ============================================================================

/**
 * Create a history API client instance
 *
 * @param config - API configuration
 * @returns History API client instance
 *
 * @example
 * ```typescript
 * const historyApi = createHistoryApi({
 *   agentUrl: 'https://example.com/api/agents/MyAgent',
 *   getAuthToken: () => getToken(),
 * });
 *
 * const contexts = await historyApi.listContexts({
 *   includeLastTask: true,
 *   includeArchived: false,
 * });
 * ```
 */
export const createHistoryApi = (config: HistoryApiConfig): HistoryApiClient => {
  return new HistoryApiClient(config);
};

/**
 * Type export for the API client
 */
export type HistoryApi = HistoryApiClient;
