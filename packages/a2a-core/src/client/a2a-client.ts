import { HttpClient } from './http-client';
import { MessageSchema, MessageSendRequestSchema, TaskSchema } from '../types/schemas';
import type {
  AgentCard,
  AgentCapabilities,
  Task,
  MessageSendRequest,
  TaskState,
  Artifact,
  Message,
} from '../types';
import type { AuthConfig, HttpClientOptions, AuthRequiredHandler, AuthRequiredPart } from './types';
import { SSEClient } from '../streaming/sse-client';
import type { SSEMessage } from '../streaming/types';

// JSON-RPC types
interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string;
  contextId?: string;
}

// Extended Task type with contextId for internal use
interface TaskWithContext extends Task {
  contextId?: string;
}

// A2A protocol message part types
interface A2AMessagePart {
  kind: 'text' | 'data' | 'file';
  text?: string;
  data?: unknown;
  mimeType?: string;
  filename?: string;
}

// A2A protocol status message
interface A2AStatusMessage {
  parts: A2AMessagePart[];
  role?: string;
}

// A2A protocol response result
interface A2AResult {
  kind?: string;
  id?: string;
  state?: TaskState;
  createdAt?: string;
  updatedAt?: string;
  messages?: unknown[];
  artifacts?: unknown[];
  contextId?: string;
  taskId?: string;
  status?: {
    message?: A2AStatusMessage;
    state?: TaskState | 'submitted';
    timestamp?: string;
  };
  artifact?: {
    parts?: A2AMessagePart[];
    id?: string;
    type?: string;
    title?: string;
    content?: string;
    append?: boolean;
    metadata?: Record<string, unknown>;
  };
  final?: boolean;
  lastChunk?: boolean;
}

/**
 * Configuration options for creating an A2A client
 */
export interface A2AClientConfig {
  /** The agent card describing the A2A agent's capabilities and endpoints */
  agentCard: AgentCard;
  /** Optional authentication configuration */
  auth?: AuthConfig;
  /** Optional HTTP client configuration for advanced use cases */
  httpOptions?: HttpClientOptions;
  /** Optional handler for authentication required events during streaming */
  onAuthRequired?: AuthRequiredHandler;
}

/**
 * Options for waiting for task completion
 */
export interface WaitForCompletionOptions {
  /** Polling interval in milliseconds (default: 1000) */
  pollingInterval?: number;
  /** Maximum time to wait in milliseconds (default: 300000 - 5 minutes) */
  timeout?: number;
}

/**
 * Client for interacting with A2A (Agent-to-Agent) protocol agents.
 * Provides methods for sending messages, managing tasks, and handling streaming responses.
 *
 * @example
 * ```typescript
 * const client = new A2AClient({
 *   agentCard: myAgentCard,
 *   auth: { type: 'bearer', token: 'my-token' },
 *   onAuthRequired: async (event) => {
 *     // Handle authentication requirements
 *   }
 * });
 *
 * // Send a message and stream the response
 * for await (const task of client.message.stream({ message: { role: 'user', content: [{ type: 'text', content: 'Hello' }] } })) {
 *   // Task update available here
 * }
 * ```
 */
export class A2AClient {
  private readonly agentCard: AgentCard;
  private readonly httpClient: HttpClient;
  private readonly auth: AuthConfig;
  private readonly onAuthRequired?: AuthRequiredHandler;

  constructor(config: A2AClientConfig) {
    this.agentCard = config.agentCard;
    this.auth = config.auth || { type: 'none' };
    this.onAuthRequired = config.onAuthRequired;

    // Initialize HTTP client with service endpoint from agent card
    this.httpClient = new HttpClient(this.agentCard.url, this.auth, config.httpOptions);
  }

  // Agent card and capability methods
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
    const capabilities = this.agentCard.capabilities;
    return !!capabilities[capabilityName];
  }

  // Message operations
  message = {
    send: async (request: MessageSendRequest): Promise<Task> => {
      // Validate request
      const validationResult = MessageSendRequestSchema.safeParse(request);
      if (!validationResult.success) {
        throw new Error(`Invalid message request: ${validationResult.error.message}`);
      }

      // Validate message separately for better error messages
      const messageValidation = MessageSchema.safeParse(request.message);
      if (!messageValidation.success) {
        throw new Error(`Invalid message: ${messageValidation.error.message}`);
      }

      // Transform message to A2A protocol format
      const a2aMessage = {
        kind: 'message',
        messageId: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`,
        role: request.message.role,
        parts: request.message.content.map((part) => {
          if (part.type === 'text') {
            return { kind: 'text', text: part.content };
          } else if (part.type === 'file') {
            return {
              kind: 'file',
              mimeType: part.mimeType,
              data: part.data,
              filename: part.filename,
            };
          } else if (part.type === 'structured') {
            return {
              kind: 'data',
              data: part.data,
            };
          } else {
            // This should never happen due to discriminated union
            throw new Error(`Unknown part type: ${(part as { type: string }).type}`);
          }
        }),
        // Include contextId directly in message if available
        ...(request.context?.['contextId'] ? { contextId: request.context['contextId'] } : {}),
      };

      // Convert to JSON-RPC format for A2A protocol
      const jsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: a2aMessage,
          configuration: request.context || {},
        },
        id: Date.now(),
      };

      // Send request to root path using JSON-RPC
      const jsonRpcResponse = await this.httpClient.post<JsonRpcResponse<Task>>(
        '/',
        jsonRpcRequest
      );

      // Extract result from JSON-RPC response
      if (jsonRpcResponse.error) {
        throw new Error(
          `JSON-RPC error: ${jsonRpcResponse.error.message || JSON.stringify(jsonRpcResponse.error)}`
        );
      }

      const response = jsonRpcResponse.result || jsonRpcResponse;

      // Validate response
      const taskValidation = TaskSchema.safeParse(response);
      if (!taskValidation.success) {
        throw new Error(`Invalid task response: ${taskValidation.error.message}`);
      }

      return taskValidation.data;
    },

    stream: (request: MessageSendRequest): AsyncIterable<Task> => {
      // Validate request
      const validationResult = MessageSendRequestSchema.safeParse(request);
      if (!validationResult.success) {
        throw new Error(`Invalid message request: ${validationResult.error.message}`);
      }

      // Validate message separately for better error messages
      const messageValidation = MessageSchema.safeParse(request.message);
      if (!messageValidation.success) {
        throw new Error(`Invalid message: ${messageValidation.error.message}`);
      }

      // Store reference to client instance for testing
      const clientInstance = this;

      // Create async iterable
      return {
        [Symbol.asyncIterator]: () => {
          let sseClient: SSEClient | null = null;
          const messageQueue: Task[] = [];
          let isComplete = false;
          let errorOccurred: Error | null = null;

          // Accumulator state for the current task
          let currentTask: TaskWithContext | null = null;

          return {
            next: async (): Promise<IteratorResult<Task>> => {
              try {
                // Initialize SSE connection on first call
                if (!sseClient) {
                  // Transform message to A2A protocol format
                  const a2aMessage = {
                    kind: 'message',
                    messageId: crypto.randomUUID
                      ? crypto.randomUUID()
                      : `msg-${Date.now()}-${Math.random()}`,
                    role: request.message.role,
                    parts: request.message.content.map((part) => {
                      if (part.type === 'text') {
                        return { kind: 'text', text: part.content };
                      } else if (part.type === 'file') {
                        return {
                          kind: 'file',
                          mimeType: part.mimeType,
                          data: part.data,
                          filename: part.filename,
                        };
                      } else if (part.type === 'structured') {
                        return {
                          kind: 'data',
                          data: part.data,
                        };
                      } else {
                        // This should never happen due to discriminated union
                        throw new Error(`Unknown part type: ${(part as { type: string }).type}`);
                      }
                    }),
                    // Include contextId directly in message if available
                    ...(request.context?.['contextId']
                      ? { contextId: request.context['contextId'] }
                      : {}),
                  };

                  // Convert to JSON-RPC format for A2A protocol streaming
                  const jsonRpcRequest = {
                    jsonrpc: '2.0',
                    method: 'message/stream',
                    params: {
                      message: a2aMessage,
                      configuration: {
                        acceptedOutputModes: request.context?.['acceptedOutputModes'] || ['text'],
                      },
                    },
                    id: Date.now(),
                  };

                  // Create SSE connection to root path
                  const streamUrl = this.agentCard.url;

                  // Build headers for SSE
                  const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                  };

                  if (this.auth.type === 'bearer') {
                    headers['Authorization'] = `Bearer ${this.auth.token}`;
                  } else if (this.auth.type === 'oauth2') {
                    const tokenType = this.auth.tokenType || 'Bearer';
                    headers['Authorization'] = `${tokenType} ${this.auth.accessToken}`;
                  } else if (this.auth.type === 'api-key') {
                    headers[this.auth.header] = this.auth.key;
                  }

                  sseClient = new SSEClient(streamUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(jsonRpcRequest),
                    withCredentials: this.auth.type !== 'none',
                  });

                  // SSE client is now created and will be used for streaming
                  // Store reference for testing purposes
                  (clientInstance as any).sseClient = sseClient;

                  // Set up persistent message handlers
                  const messageHandler = (message: SSEMessage) => {
                    try {
                      // Parse JSON-RPC response from SSE data
                      const jsonRpcData = message.data as JsonRpcResponse;
                      // SSE message received with JSON-RPC data

                      // Check if it's a JSON-RPC error
                      if (jsonRpcData.error) {
                        errorOccurred = new Error(
                          `JSON-RPC error: ${jsonRpcData.error.message || JSON.stringify(jsonRpcData.error)}`
                        );
                        isComplete = true;
                        if (sseClient) {
                          sseClient.close();
                        }
                        return;
                      }

                      // Extract the result which should be a task or status update
                      const result = (jsonRpcData.result || jsonRpcData) as A2AResult;

                      // Handle different A2A response types
                      // Check if this is a legacy format (direct task data without 'kind' field)
                      if (!result.kind && result.id && result.state) {
                        // Legacy format - handle as a task update
                        if (!currentTask || currentTask.id !== result.id) {
                          // New task or task ID changed - create new task state
                          currentTask = {
                            id: result.id!,
                            state: result.state!,
                            createdAt: result.createdAt || new Date().toISOString(),
                            messages: (result.messages || []) as Message[],
                            artifacts: (result.artifacts || []) as Artifact[],
                            // Include contextId from server response if available
                            ...(result.contextId ? { contextId: result.contextId } : {}),
                            ...(jsonRpcData.contextId ? { contextId: jsonRpcData.contextId } : {}),
                          };
                        } else if (currentTask) {
                          // Update existing task
                          currentTask.state = result.state!;
                          currentTask.updatedAt = result.updatedAt || new Date().toISOString();
                          if (result.messages) {
                            currentTask.messages = result.messages as Message[];
                          }
                          if (result.artifacts) {
                            currentTask.artifacts = result.artifacts as Artifact[];
                          }
                          // Update contextId if provided
                          if (result.contextId) {
                            currentTask.contextId = result.contextId;
                          }
                          if (jsonRpcData.contextId) {
                            currentTask.contextId = jsonRpcData.contextId;
                          }
                        }

                        // Queue the task update
                        if (currentTask) {
                          messageQueue.push({
                            ...currentTask,
                            messages: [...currentTask.messages],
                            artifacts: currentTask.artifacts
                              ? [...currentTask.artifacts]
                              : undefined,
                            // Pass through contextId to the consumer
                            ...(currentTask.contextId ? { contextId: currentTask.contextId } : {}),
                          } as Task);
                        }

                        // Check if completed
                        if (result.state === 'completed' || result.state === 'failed') {
                          isComplete = true;
                          if (sseClient) {
                            sseClient.close();
                          }
                        }
                      } else if (result.kind === 'task') {
                        // Initial task response - create the base task
                        currentTask = {
                          id: result.id!,
                          state: result.status?.state === 'submitted' ? 'pending' : 'running',
                          createdAt: result.status?.timestamp || new Date().toISOString(),
                          messages: [],
                          artifacts: [],
                          // Include contextId from server response if available
                          ...(result.contextId ? { contextId: result.contextId } : {}),
                          ...(jsonRpcData.contextId ? { contextId: jsonRpcData.contextId } : {}),
                        };
                        // Queue the initial task with a clean copy
                        if (currentTask) {
                          messageQueue.push({
                            id: currentTask.id,
                            state: currentTask.state,
                            createdAt: currentTask.createdAt,
                            messages: [],
                            artifacts: [],
                            // Pass through contextId to the consumer
                            ...(currentTask.contextId ? { contextId: currentTask.contextId } : {}),
                          } as Task);
                        }
                      } else if (result.kind === 'status-update') {
                        // Status update - accumulate messages
                        if (!currentTask) {
                          // Create task if we don't have one yet
                          currentTask = {
                            id: result.taskId || result.id || `task-${Date.now()}`,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            // Include contextId from server response if available
                            ...(result.contextId ? { contextId: result.contextId } : {}),
                            ...(jsonRpcData.contextId ? { contextId: jsonRpcData.contextId } : {}),
                          };
                        }

                        // Update task state
                        if (currentTask) {
                          currentTask.state =
                            result.status?.state === 'completed'
                              ? 'completed'
                              : result.status?.state === 'failed'
                                ? 'failed'
                                : 'running';
                          currentTask.updatedAt =
                            result.status?.timestamp || new Date().toISOString();

                          // Update contextId if provided
                          if (result.contextId) {
                            currentTask.contextId = result.contextId;
                          }
                          if (jsonRpcData.contextId) {
                            currentTask.contextId = jsonRpcData.contextId;
                          }

                          // Add new message if present
                          const statusMessage = result.status?.message;
                          if (statusMessage && statusMessage.parts) {
                            // Convert A2A message format to our format
                            const content = statusMessage.parts
                              .filter((p) => p.kind === 'text')
                              .map((p) => ({ type: 'text' as const, content: p.text || '' }));

                            if (content.length > 0) {
                              currentTask.messages.push({
                                role: statusMessage.role === 'agent' ? 'assistant' : 'user',
                                content,
                              } as Message);
                            }
                          }

                          // Queue a snapshot of the current task state
                          messageQueue.push({
                            ...currentTask,
                            messages: [...currentTask.messages],
                            artifacts: currentTask.artifacts
                              ? [...currentTask.artifacts]
                              : undefined,
                            // Pass through contextId to the consumer
                            ...(currentTask.contextId ? { contextId: currentTask.contextId } : {}),
                          } as Task);
                        }

                        // Check if this is the final update
                        if (result.final) {
                          isComplete = true;
                          if (sseClient) {
                            sseClient.close();
                          }
                        }
                      } else if (result.kind === 'artifact-update') {
                        // Handle streaming artifact updates with append logic
                        if (!currentTask) {
                          // Create task if we don't have one yet
                          currentTask = {
                            id: result.taskId || `task-${Date.now()}`,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            // Include contextId from server response if available
                            ...(result.contextId ? { contextId: result.contextId } : {}),
                            ...(jsonRpcData.contextId ? { contextId: jsonRpcData.contextId } : {}),
                          };
                        }

                        // Handle streaming text content from artifacts
                        if (result.artifact && result.artifact.parts) {
                          const textParts = result.artifact.parts
                            .filter((part) => part.kind === 'text')
                            .map((part) => part.text || '')
                            .join('');

                          if (!result.artifact?.append) {
                            // Start new message - this is the first chunk
                            const newMessage = {
                              role: 'assistant' as const,
                              content: [{ type: 'text' as const, content: textParts }],
                            };
                            currentTask.messages = [
                              ...(currentTask.messages || []),
                              newMessage as Message,
                            ];
                          } else {
                            // Append to existing message - this is a continuation
                            if (currentTask.messages && currentTask.messages.length > 0) {
                              const lastMessageIndex = currentTask.messages.length - 1;
                              const lastMessage = currentTask.messages[lastMessageIndex];

                              if (
                                lastMessage &&
                                lastMessage.role === 'assistant' &&
                                lastMessage.content &&
                                lastMessage.content.length > 0
                              ) {
                                // Append to the last text content part
                                const lastContentIndex = lastMessage.content.length - 1;
                                const lastContent = lastMessage.content[lastContentIndex];

                                if (lastContent && lastContent.type === 'text') {
                                  // Create new message array with updated content
                                  const updatedMessages = [...currentTask.messages];
                                  updatedMessages[lastMessageIndex] = {
                                    ...lastMessage,
                                    content: [
                                      ...lastMessage.content.slice(0, lastContentIndex),
                                      { type: 'text', content: lastContent.content + textParts },
                                    ],
                                  };
                                  currentTask.messages = updatedMessages;
                                }
                              }
                            }
                          }

                          // Queue a task update with the current message state
                          messageQueue.push({
                            ...currentTask,
                            messages: [...(currentTask.messages || [])],
                            artifacts: currentTask.artifacts ? [...currentTask.artifacts] : [],
                            // Pass through contextId to the consumer
                            ...(currentTask.contextId ? { contextId: currentTask.contextId } : {}),
                          });
                        } else if (result.artifact) {
                          // Handle complete artifacts (not streaming parts)
                          const artifact: Artifact = {
                            id: result.artifact.id || `artifact-${Date.now()}`,
                            type: result.artifact.type || 'unknown',
                            title: result.artifact.title || 'Untitled',
                            content: result.artifact.content || '',
                            ...(result.artifact.metadata
                              ? { metadata: result.artifact.metadata }
                              : {}),
                          };

                          // Check if this artifact already exists (avoid duplicates)
                          const existingArtifactIndex = currentTask.artifacts?.findIndex(
                            (a) => a.id === artifact.id
                          );

                          if (existingArtifactIndex === -1 || existingArtifactIndex === undefined) {
                            // Add new artifact
                            currentTask.artifacts = [...(currentTask.artifacts || []), artifact];
                          } else {
                            // Update existing artifact
                            const updatedArtifacts = [...(currentTask.artifacts || [])];
                            updatedArtifacts[existingArtifactIndex] = artifact;
                            currentTask.artifacts = updatedArtifacts;
                          }

                          // Note: Don't queue a task update for artifact-only updates
                          // Artifacts will be included in the next status-update
                        }

                        // Check if this is the final artifact chunk
                        if (result.lastChunk) {
                          // Mark task as completed or continue based on final flag
                          currentTask.state = 'completed';
                        }
                      } else if (result.kind === 'auth-required') {
                        // Handle authentication required status
                        // Auth required event received

                        if (!currentTask) {
                          currentTask = {
                            id: result.taskId || result.id || `task-${Date.now()}`,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            ...(result.contextId ? { contextId: result.contextId } : {}),
                          };
                        }

                        // Extract auth data from the message parts
                        const authMessage = result.status?.message;
                        if (authMessage && authMessage.parts) {
                          const authParts: AuthRequiredPart[] = [];

                          // Collect all auth parts
                          for (const part of authMessage.parts) {
                            if (part.kind === 'data') {
                              const authData = part.data as {
                                messageType?: string;
                                consentLink?: { link: string };
                                status?: string;
                                serviceName?: string;
                                serviceIcon?: string;
                                description?: string;
                              };
                              if (
                                authData?.messageType === 'InTaskAuthRequired' &&
                                authData?.consentLink
                              ) {
                                authParts.push({
                                  consentLink: authData.consentLink.link,
                                  status: authData.status || 'Unauthenticated',
                                  serviceName: authData.serviceName || 'External Service',
                                  serviceIcon: authData.serviceIcon,
                                  description: authData.description,
                                });
                              }
                            }
                          }

                          // If we have auth parts, trigger the handler
                          if (authParts.length > 0 && clientInstance.onAuthRequired) {
                            const authEvent = {
                              taskId: result.taskId || currentTask?.id || '',
                              contextId: result.contextId || currentTask?.contextId || '',
                              authParts,
                              messageType: 'InTaskAuthRequired',
                            };

                            // Call the auth handler
                            Promise.resolve(clientInstance.onAuthRequired(authEvent))
                              .then(() => {
                                // Auth handler completed successfully
                              })
                              .catch((error) => {
                                // Auth handler failed
                                errorOccurred = new Error(
                                  `Authentication failed: ${error.message}`
                                );
                                isComplete = true;
                                if (sseClient) {
                                  sseClient.close();
                                }
                              });
                          }
                        }

                        // Don't complete the stream yet - wait for auth completion
                        // The stream will continue after authentication
                      } else {
                        // Unknown format, try to construct a basic task
                        if (!currentTask) {
                          currentTask = {
                            id: result.id || `task-${Date.now()}`,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                          };
                        }
                        // Queue a snapshot
                        messageQueue.push({ ...currentTask });
                      }

                      // Check if this is the final message
                      if (
                        result.final ||
                        result.status?.state === 'completed' ||
                        result.status?.state === 'failed'
                      ) {
                        isComplete = true;
                        if (sseClient) {
                          sseClient.close();
                        }
                      }
                    } catch (error) {
                      errorOccurred = error as Error;
                      isComplete = true;
                      if (sseClient) {
                        sseClient.close();
                      }
                    }
                  };

                  const errorHandler = (error: Error) => {
                    errorOccurred = error;
                    isComplete = true;
                    if (sseClient) {
                      sseClient.close();
                    }
                  };

                  sseClient!.onMessage(messageHandler);
                  sseClient!.onError(errorHandler);
                }

                // Check if there's an error
                if (errorOccurred) {
                  throw errorOccurred;
                }

                // Return queued messages or wait for new ones
                if (messageQueue.length > 0) {
                  const task = messageQueue.shift()!;
                  return { value: task, done: false };
                } else if (isComplete) {
                  return { done: true, value: undefined };
                } else {
                  // Wait for new messages
                  return new Promise((resolve, reject) => {
                    const checkQueue = setInterval(() => {
                      if (errorOccurred) {
                        clearInterval(checkQueue);
                        reject(errorOccurred);
                      } else if (messageQueue.length > 0) {
                        clearInterval(checkQueue);
                        const task = messageQueue.shift()!;
                        resolve({ value: task, done: false });
                      } else if (isComplete) {
                        clearInterval(checkQueue);
                        resolve({ done: true, value: undefined });
                      }
                    }, 100);
                  });
                }
              } catch (error) {
                if (sseClient) {
                  sseClient.close();
                }
                throw error;
              }
            },
            return: async (): Promise<IteratorResult<Task>> => {
              if (sseClient) {
                sseClient.close();
              }
              return { done: true, value: undefined } as IteratorResult<Task>;
            },
            throw: async (error?: Error): Promise<IteratorResult<Task>> => {
              if (sseClient) {
                sseClient.close();
              }
              throw error || new Error('Stream terminated');
            },
          };
        },
      };
    },
  };

  // Send authentication completed message as a regular user message with data part
  sendAuthenticationCompleted = async (contextId: string): Promise<void> => {
    // Sending authentication completed message

    // Create the auth completed message exactly as expected by the server
    // The contextId must be in the message itself, and we need a "data" part
    const messageRequest: MessageSendRequest = {
      message: {
        role: 'user',
        content: [
          {
            type: 'structured',
            schema: {},
            data: {
              messageType: 'AuthenticationCompleted',
            },
          },
        ],
      },
      context: {
        contextId,
        acceptedOutputModes: ['text'],
      },
    };

    // Send it using the existing message.stream method
    try {
      let responseReceived = false;

      for await (const task of this.message.stream(messageRequest)) {
        // Auth completed response received
        responseReceived = true;

        // We can break after receiving acknowledgment that the message was received
        // The server will continue processing and resume the original task
        if (task.id) {
          // Authentication completed message acknowledged
          break;
        }
      }

      if (!responseReceived) {
        throw new Error('No response received for authentication completed message');
      }

      // Authentication completed message sent successfully
    } catch (error) {
      // Failed to send authentication completed
      throw new Error(
        `Failed to send authentication completed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Task operations
  task = {
    get: async (taskId: string): Promise<Task> => {
      const response = await this.httpClient.get<Task>(`/tasks/${taskId}`);

      // Validate response
      const validation = TaskSchema.safeParse(response);
      if (!validation.success) {
        throw new Error(`Invalid task response: ${validation.error.message}`);
      }

      return validation.data;
    },

    cancel: async (taskId: string, reason?: string): Promise<void> => {
      await this.httpClient.post(`/tasks/${taskId}/cancel`, { reason });
    },

    waitForCompletion: async (
      taskId: string,
      options: WaitForCompletionOptions = {}
    ): Promise<Task> => {
      const { pollingInterval = 1000, timeout = 30000 } = options;

      const startTime = Date.now();

      while (true) {
        const task = await this.task.get(taskId);

        // Check if task is in a terminal state
        const terminalStates: TaskState[] = ['completed', 'failed', 'cancelled'];
        if (terminalStates.includes(task.state)) {
          return task;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error('Timeout waiting for task completion');
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      }
    },
  };
}
