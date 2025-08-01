import { HttpClient } from './http-client';
import { MessageTransformer } from './message-transformer';
import { StreamIterator } from './stream-iterator';
import { AuthHandler } from './auth-handler';
import { MessageSendRequestSchema, TaskSchema } from '../types/schemas';
import type {
  AgentCard,
  Task,
  MessageSendRequest,
  Context,
  TaskHistory,
  ListContextsParams,
  UpdateContextParams,
  AgentCapabilities,
  TaskState,
} from '../types';
import type {
  AuthConfig,
  HttpClientOptions,
  AuthRequiredHandler,
  UnauthorizedHandler,
} from './types';

export interface A2AClientConfig {
  agentCard: AgentCard;
  auth?: AuthConfig;
  httpOptions?: HttpClientOptions;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  apiKey?: string;
}

export interface WaitForCompletionOptions {
  pollingInterval?: number;
  timeout?: number;
}

/**
 * A2A Client - Simplified implementation with cleaner separation of concerns
 */
export class A2AClient {
  private readonly agentCard: AgentCard;
  private readonly httpClient: HttpClient;
  private readonly auth: AuthConfig;
  private readonly onAuthRequired?: AuthRequiredHandler;
  private readonly onUnauthorized?: UnauthorizedHandler;
  private readonly apiKey?: string;

  constructor(config: A2AClientConfig) {
    this.agentCard = config.agentCard;
    this.auth = config.auth || { type: 'none' };
    this.onAuthRequired = config.onAuthRequired;
    this.onUnauthorized = config.onUnauthorized;
    this.apiKey = config.apiKey;

    this.httpClient = new HttpClient(
      this.agentCard.url,
      this.auth,
      config.httpOptions,
      this.apiKey,
      this.onUnauthorized
    );
  }

  // Agent card accessors
  getAgentCard(): AgentCard {
    return this.agentCard;
  }

  getCapabilities(): AgentCapabilities {
    return this.agentCard.capabilities;
  }

  getServiceEndpoint(): string {
    return this.agentCard.url;
  }

  hasCapability(capabilityName: keyof AgentCapabilities): boolean {
    return !!this.agentCard.capabilities[capabilityName];
  }

  // Message operations
  message = {
    /**
     * Send a single message and wait for response
     */
    send: async (request: MessageSendRequest): Promise<Task> => {
      // Validate request
      const validation = MessageSendRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new Error(`Invalid message request: ${validation.error.message}`);
      }

      // Transform to A2A format
      const a2aMessage = MessageTransformer.toA2AMessage(request);

      // Create JSON-RPC request
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('message/send', {
        message: a2aMessage,
        configuration: request.context || {},
      });

      // Send request
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);
      const result = MessageTransformer.extractJsonRpcResult<Task>(response);

      // Validate response
      const taskValidation = TaskSchema.safeParse(result);
      if (!taskValidation.success) {
        throw new Error(`Invalid task response: ${taskValidation.error.message}`);
      }

      return taskValidation.data;
    },

    /**
     * Stream messages with real-time updates
     */
    stream: (request: MessageSendRequest): AsyncIterable<Task> => {
      // Validate request
      const validation = MessageSendRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new Error(`Invalid message request: ${validation.error.message}`);
      }

      // Transform to A2A format
      const a2aMessage = MessageTransformer.toA2AMessage(request);

      // Create JSON-RPC request for streaming
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('message/stream', {
        message: a2aMessage,
        configuration: {
          acceptedOutputModes: request.context?.acceptedOutputModes || ['text'],
        },
      });

      // Build headers
      const headers = this.buildStreamHeaders();

      // Create stream iterator
      const iterator = new StreamIterator(
        {
          url: this.agentCard.url,
          headers,
          body: JSON.stringify(jsonRpcRequest),
          withCredentials: this.auth.type !== 'none',
          onUnauthorized: this.onUnauthorized,
          onAuthRequired: this.onAuthRequired,
        },
        this.onAuthRequired
      );

      // Store SSE client reference for testing compatibility
      const clientInstance = this;
      const iteratorInstance = iterator;

      return {
        [Symbol.asyncIterator]: async function* () {
          const iter = iteratorInstance.iterate();

          // Wait a bit for connection to establish, then store SSE client for tests
          setTimeout(() => {
            const sseClient = (iteratorInstance as any).getSseClient();
            if (sseClient) {
              (clientInstance as any).sseClient = sseClient;
            }
          }, 10);

          for await (const task of iter) {
            yield task;
          }
        },
      };
    },
  };

  /**
   * Send authentication completed message
   */
  sendAuthenticationCompleted = async (
    contextId: string,
    taskId: string
  ): Promise<AsyncIterable<Task>> => {
    const messageRequest = AuthHandler.createAuthCompletedMessage(contextId, taskId);
    return this.message.stream(messageRequest);
  };

  // Task operations
  task = {
    /**
     * Get task by ID
     */
    get: async (taskId: string): Promise<Task> => {
      const response = await this.httpClient.get<Task>(`/tasks/${taskId}`);
      const validation = TaskSchema.safeParse(response);
      if (!validation.success) {
        throw new Error(`Invalid task response: ${validation.error.message}`);
      }
      return validation.data;
    },

    /**
     * Cancel a task
     */
    cancel: async (taskId: string, reason?: string): Promise<void> => {
      await this.httpClient.post(`/tasks/${taskId}/cancel`, { reason });
    },

    /**
     * Wait for task completion
     */
    waitForCompletion: async (
      taskId: string,
      options: WaitForCompletionOptions = {}
    ): Promise<Task> => {
      const { pollingInterval = 1000, timeout = 30000 } = options;
      const startTime = Date.now();

      while (true) {
        const task = await this.task.get(taskId);

        const terminalStates: TaskState[] = ['completed', 'failed', 'cancelled'];
        if (terminalStates.includes(task.state)) {
          return task;
        }

        if (Date.now() - startTime > timeout) {
          throw new Error('Timeout waiting for task completion');
        }

        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      }
    },
  };

  // History operations
  history = {
    /**
     * List all contexts
     */
    listContexts: async (params?: ListContextsParams): Promise<Context[]> => {
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('contexts/list', params || {});
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);
      const result = MessageTransformer.extractJsonRpcResult(response);

      return this.transformContextsResponse(result);
    },

    /**
     * List tasks for a context
     */
    listTasks: async (contextId: string): Promise<TaskHistory[]> => {
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('tasks/list', {
        Id: contextId,
      });
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);
      return MessageTransformer.extractJsonRpcResult<TaskHistory[]>(response);
    },

    /**
     * Update context
     */
    updateContext: async (params: UpdateContextParams): Promise<Context> => {
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('contexts/update', params);
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);
      return MessageTransformer.extractJsonRpcResult<Context>(response);
    },

    /**
     * Create new context
     */
    createContext: async (message?: any, metadata?: any): Promise<Context> => {
      const jsonRpcRequest = MessageTransformer.createJsonRpcRequest('contexts/create', {
        message: message || {},
        metadata: metadata || {},
      });
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);
      return MessageTransformer.extractJsonRpcResult<Context>(response);
    },
  };

  /**
   * Build headers for streaming requests
   */
  private buildStreamHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    // Add API key
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Add auth headers
    if (this.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    } else if (this.auth.type === 'oauth2') {
      const tokenType = this.auth.tokenType || 'Bearer';
      headers['Authorization'] = `${tokenType} ${this.auth.accessToken}`;
    } else if (this.auth.type === 'api-key') {
      headers[this.auth.header] = this.auth.key;
    }

    return headers;
  }

  /**
   * Transform contexts response to consistent format
   */
  private transformContextsResponse(result: any): Context[] {
    // Handle different response formats
    let contextArray: any[] = [];

    if (Array.isArray(result)) {
      contextArray = result;
    } else if (result && typeof result === 'object') {
      // Check various property names
      const possibleKeys = ['contexts', 'Contexts', 'items', 'Items'];
      for (const key of possibleKeys) {
        if (Array.isArray(result[key])) {
          contextArray = result[key];
          break;
        }
      }
    }

    // Transform PascalCase to camelCase
    return contextArray.map((ctx) => ({
      id: ctx.id,
      name: ctx.name,
      isArchived: ctx.isArchived ?? false,
      lastTask: ctx.lastTask ? this.transformLastTask(ctx.lastTask) : undefined,
      createdAt: ctx.createdAt,
      updatedAt: ctx.updatedAt,
    }));
  }

  /**
   * Transform last task data
   */
  private transformLastTask(rawTask: any) {
    return {
      id: rawTask.id,
      contextId: rawTask.contextId,
      taskStatus: rawTask.taskStatus,
      history: rawTask.history || [],
      kind: rawTask.kind || 'Task',
    };
  }
}
