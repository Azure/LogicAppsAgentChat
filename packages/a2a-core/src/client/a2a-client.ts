import { HttpClient } from './http-client';
import {
  MessageSchema,
  MessageSendRequestSchema,
  TaskSchema,
  isJsonRpcError,
  isJsonRpcResult,
} from '../types/schemas';
import type { AgentCard, AgentCapabilities, Task, MessageSendRequest, TaskState } from '../types';
import type {
  AuthConfig,
  HttpClientOptions,
  AuthRequiredHandler,
  AuthRequiredPart,
  UnauthorizedHandler,
} from './types';
import { SSEClient } from '../streaming/sse-client';
import type { SSEMessage } from '../streaming/types';
import { JsonRpcErrorResponse } from '../types/errors';

// Type extension for Task with contextId
// contextId is stored in metadata but we add it at the top level for convenience
type TaskWithContext = Task & { contextId?: string };

// Type extension for A2AClient with SSE client (used for testing)
type A2AClientWithSSE = A2AClient & { sseClient?: SSEClient };

// Helper type for A2A response data - represents the various shapes we receive
// This is a runtime-validated structure, so we use explicit typing after checking
type A2AResponseData = Record<string, unknown>;

// Helper functions for type-safe contextId access
function getContextId(task: Task | TaskWithContext): string | undefined {
  // Check if contextId is at top level (runtime addition)
  if ('contextId' in task && typeof task.contextId === 'string') {
    return task.contextId;
  }
  // Check metadata
  if (task.metadata?.contextId && typeof task.metadata.contextId === 'string') {
    return task.metadata.contextId;
  }
  return undefined;
}

function setContextId(task: Task, contextId: string): asserts task is TaskWithContext {
  // Add contextId at top level for convenience
  (task as TaskWithContext).contextId = contextId;
  // Also add to metadata for persistence
  if (!task.metadata) {
    task.metadata = {};
  }
  task.metadata.contextId = contextId;
}

export interface A2AClientConfig {
  agentCard: AgentCard;
  auth?: AuthConfig;
  httpOptions?: HttpClientOptions;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  onTokenRefreshRequired?: () => void | Promise<void>;
  apiKey?: string;
  oboUserToken?: string;
}

export interface WaitForCompletionOptions {
  pollingInterval?: number;
  timeout?: number;
}

export class A2AClient {
  private readonly agentCard: AgentCard;
  private readonly httpClient: HttpClient;
  private readonly auth: AuthConfig;
  private readonly onAuthRequired?: AuthRequiredHandler;
  private readonly onUnauthorized?: UnauthorizedHandler;
  private readonly onTokenRefreshRequired?: () => void | Promise<void>;
  private readonly apiKey?: string;
  private readonly oboUserToken?: string;

  constructor(config: A2AClientConfig) {
    this.agentCard = config.agentCard;
    this.auth = config.auth || { type: 'none' };
    this.onAuthRequired = config.onAuthRequired;
    this.onUnauthorized = config.onUnauthorized;
    this.onTokenRefreshRequired = config.onTokenRefreshRequired;
    this.apiKey = config.apiKey;
    this.oboUserToken = config.oboUserToken;

    // Initialize HTTP client with service endpoint from agent card
    this.httpClient = new HttpClient(
      this.agentCard.url,
      this.auth,
      {
        ...config.httpOptions,
        onTokenRefreshRequired: this.onTokenRefreshRequired,
      },
      this.apiKey,
      this.onUnauthorized,
      this.oboUserToken
    );
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
    const value = capabilities[capabilityName];

    // Extensions is an array, other capabilities are booleans
    if (capabilityName === 'extensions') {
      return Array.isArray(value) && value.length > 0;
    }

    return typeof value === 'boolean' ? value : false;
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
            // TypeScript now knows this is the structured variant
            return {
              kind: 'data',
              data: part.data,
            };
          } else {
            // Exhaustive check - should never reach here
            const _exhaustive: never = part;
            throw new Error(`Unknown part type: ${(_exhaustive as { type: string }).type}`);
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
      // HttpClient now automatically validates JSON-RPC responses and throws JsonRpcErrorResponse on error
      const response = await this.httpClient.post<any>('/', jsonRpcRequest);

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
      // Store handler reference directly to avoid scope issues
      const authHandler = this.onAuthRequired;

      // Create async iterable
      return {
        [Symbol.asyncIterator]: () => {
          let sseClient: SSEClient | null = null;
          const messageQueue: Task[] = [];
          let isComplete = false;
          let errorOccurred: Error | null = null;

          // Accumulator state for the current task
          let currentTask: Task | null = null;

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
                        // TypeScript now knows this is the structured variant
                        return {
                          kind: 'data',
                          data: part.data,
                        };
                      } else {
                        // Exhaustive check - should never reach here
                        const _exhaustive: never = part;
                        throw new Error(
                          `Unknown part type: ${(_exhaustive as { type: string }).type}`
                        );
                      }
                    }),
                    // Include contextId directly in message if available
                    ...(request.context?.['contextId']
                      ? { contextId: request.context['contextId'] }
                      : {}),
                    // Include taskId directly in message if available
                    ...(request.context?.['taskId'] ? { taskId: request.context['taskId'] } : {}),
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

                  // Add API key header if provided
                  if (this.apiKey) {
                    headers['X-API-Key'] = this.apiKey;
                  }

                  // Add OBO user token header if provided
                  if (this.oboUserToken) {
                    headers['x-ms-obo-userToken'] = `Key ${this.oboUserToken}`;
                  }

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
                    onUnauthorized: this.onUnauthorized,
                    onTokenRefreshRequired: this.onTokenRefreshRequired,
                  });

                  // Store SSE client for testing - store on the client instance
                  (clientInstance as A2AClientWithSSE).sseClient = sseClient;

                  // Set up persistent message handlers
                  const messageHandler = (message: SSEMessage) => {
                    try {
                      // Parse JSON-RPC response from SSE data (already typed as unknown)
                      const jsonRpcData = message.data;

                      // Check if it's a JSON-RPC error response
                      if (isJsonRpcError(jsonRpcData)) {
                        errorOccurred = new JsonRpcErrorResponse(jsonRpcData);
                        isComplete = true;
                        if (sseClient) {
                          sseClient.close();
                        }
                        return;
                      }

                      // Extract the result which should be a task or status update
                      // Type guard: Check if it's a JSON-RPC result with a result field
                      let resultData: A2AResponseData;
                      let topLevelContextId: string | undefined;

                      if (isJsonRpcResult(jsonRpcData)) {
                        // Standard JSON-RPC 2.0 format
                        resultData = jsonRpcData.result as A2AResponseData;
                        // Extract contextId from top-level JSON-RPC response if present
                        if (
                          typeof jsonRpcData === 'object' &&
                          jsonRpcData !== null &&
                          'contextId' in jsonRpcData &&
                          typeof jsonRpcData.contextId === 'string'
                        ) {
                          topLevelContextId = jsonRpcData.contextId;
                        }
                      } else if (
                        typeof jsonRpcData === 'object' &&
                        jsonRpcData !== null &&
                        'result' in jsonRpcData
                      ) {
                        // Legacy format: has result field but no jsonrpc version
                        const dataWithResult = jsonRpcData as Record<string, unknown>;
                        resultData = dataWithResult.result as A2AResponseData;
                        // Extract contextId from top-level if present
                        if (
                          'contextId' in dataWithResult &&
                          typeof dataWithResult.contextId === 'string'
                        ) {
                          topLevelContextId = dataWithResult.contextId;
                        }
                      } else {
                        // Direct format: the data itself is the result
                        resultData = jsonRpcData as A2AResponseData;
                      }

                      // Handle different A2A response types
                      // Check if this is a legacy format (direct task data without 'kind' field)
                      if (!resultData.kind && resultData.id && resultData.state) {
                        // Legacy format - handle as a task update
                        // Runtime-validated properties - safe to cast
                        const resultId = resultData.id as string;
                        const resultState = resultData.state as TaskState;
                        const resultCreatedAt =
                          (resultData.createdAt as string | undefined) || new Date().toISOString();
                        const resultMessages = (resultData.messages as any[] | undefined) || [];
                        const resultArtifacts = (resultData.artifacts as any[] | undefined) || [];
                        const resultContextId =
                          typeof resultData.contextId === 'string'
                            ? resultData.contextId
                            : undefined;

                        if (!currentTask || currentTask.id !== resultId) {
                          // New task or task ID changed - create new task state
                          currentTask = {
                            id: resultId,
                            state: resultState,
                            createdAt: resultCreatedAt,
                            messages: resultMessages,
                            artifacts: resultArtifacts,
                            // Include contextId from server response if available
                            ...(resultContextId ? { contextId: resultContextId } : {}),
                            ...(topLevelContextId ? { contextId: topLevelContextId } : {}),
                          };
                        } else {
                          // Update existing task
                          currentTask.state = resultState;
                          currentTask.updatedAt =
                            (resultData.updatedAt as string | undefined) ||
                            new Date().toISOString();
                          if (resultMessages.length > 0) {
                            currentTask.messages = resultMessages;
                          }
                          if (resultArtifacts.length > 0) {
                            currentTask.artifacts = resultArtifacts;
                          }
                          // Update contextId if provided
                          if (resultContextId) {
                            setContextId(currentTask, resultContextId);
                          }
                          if (topLevelContextId) {
                            setContextId(currentTask, topLevelContextId);
                          }
                        }

                        // Queue the task update
                        const contextId = getContextId(currentTask);
                        messageQueue.push({
                          ...currentTask,
                          messages: [...currentTask.messages],
                          artifacts: currentTask.artifacts ? [...currentTask.artifacts] : undefined,
                          // Pass through contextId to the consumer
                          ...(contextId ? { contextId } : {}),
                        });

                        // Check if completed
                        if (resultState === 'completed' || resultState === 'failed') {
                          isComplete = true;
                          if (sseClient) {
                            sseClient.close();
                          }
                        }
                      } else if (resultData.kind === 'task') {
                        // Initial task response - create the base task
                        const taskId = resultData.id as string;
                        const taskStatus = resultData.status as
                          | { state?: string; timestamp?: string }
                          | undefined;
                        const taskContextId =
                          typeof resultData.contextId === 'string'
                            ? resultData.contextId
                            : undefined;

                        currentTask = {
                          id: taskId,
                          state: taskStatus?.state === 'submitted' ? 'pending' : 'running',
                          createdAt: taskStatus?.timestamp || new Date().toISOString(),
                          messages: [],
                          artifacts: [],
                          // Include contextId from server response if available
                          ...(taskContextId ? { contextId: taskContextId } : {}),
                          ...(topLevelContextId ? { contextId: topLevelContextId } : {}),
                        };
                        // Queue the initial task with a clean copy
                        messageQueue.push({
                          id: currentTask.id,
                          state: currentTask.state,
                          createdAt: currentTask.createdAt,
                          messages: [],
                          artifacts: [],
                          // Pass through contextId to the consumer
                          ...(getContextId(currentTask)
                            ? { contextId: getContextId(currentTask) }
                            : {}),
                        });
                      } else if (
                        resultData.kind === 'auth-required' ||
                        (resultData.kind === 'status-update' &&
                          (resultData.status as any)?.state === 'auth-required')
                      ) {
                        // Handle authentication required status FIRST before general status updates
                        console.log('[a2a-client] AUTH REQUIRED EVENT DETECTED!', {
                          kind: result.kind,
                          state: result.status?.state,
                          hasMessage: !!result.status?.message,
                          hasParts: !!result.status?.message?.parts,
                          partsLength: result.status?.message?.parts?.length,
                        });

                        if (!currentTask) {
                          currentTask = {
                            id: (resultData.taskId || resultData.id) as string,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            ...(resultData.contextId
                              ? { contextId: resultData.contextId as string }
                              : {}),
                          };
                        }

                        // Extract auth data from the message parts
                        const authMessage = result.status?.message;
                        console.log('[a2a-client] Auth message:', authMessage);

                        if (authMessage && authMessage.parts) {
                          const authParts: AuthRequiredPart[] = [];

                          // Collect all auth parts
                          for (const part of authMessage.parts) {
                            console.log('[a2a-client] Processing part:', {
                              kind: part.kind,
                              hasData: !!part.data,
                            });
                            if (part.kind === 'Data' || part.kind === 'data') {
                              const authData = part.data;
                              console.log('[a2a-client] Auth data:', authData);
                              if (
                                authData?.messageType === 'InTaskAuthRequired' &&
                                authData?.consentLink
                              ) {
                                // Handle new packet structure where consentLink is an object
                                const rawConsentLink = authData.consentLink;
                                console.log('[a2a-client] Raw consentLink:', {
                                  type: typeof rawConsentLink,
                                  value: rawConsentLink,
                                  isString: typeof rawConsentLink === 'string',
                                });

                                // Check if consentLink is a string or object with link property
                                const consentLinkUrl =
                                  typeof rawConsentLink === 'string'
                                    ? rawConsentLink
                                    : rawConsentLink?.link;

                                console.log(
                                  '[a2a-client] Extracted consentLinkUrl:',
                                  consentLinkUrl
                                );

                                // Validate that we have a valid consent link URL
                                if (!consentLinkUrl || typeof consentLinkUrl !== 'string') {
                                  console.error(
                                    '[a2a-client] Invalid consent link - skipping auth part:',
                                    { rawConsentLink, consentLinkUrl }
                                  );
                                  continue;
                                }

                                authParts.push({
                                  consentLink: consentLinkUrl,
                                  status:
                                    typeof rawConsentLink === 'object' && rawConsentLink?.status
                                      ? rawConsentLink.status
                                      : authData.status || 'Unauthenticated',
                                  serviceName:
                                    typeof rawConsentLink === 'object' &&
                                    rawConsentLink?.apiDetails?.apiDisplayName
                                      ? rawConsentLink.apiDetails.apiDisplayName
                                      : authData.serviceName || 'External Service',
                                  serviceIcon:
                                    typeof rawConsentLink === 'object' &&
                                    rawConsentLink?.apiDetails?.apiIconUri
                                      ? rawConsentLink.apiDetails.apiIconUri
                                      : authData.serviceIcon,
                                  description: authData.description,
                                });
                              }
                            }
                          }

                          // If we have auth parts, trigger the handler
                          console.log('[a2a-client] Collected auth parts:', authParts.length);

                          if (authParts.length > 0 && authHandler) {
                            const authEvent = {
                              taskId: (resultData.taskId as string) || currentTask.id,
                              contextId:
                                (resultData.contextId as string) || getContextId(currentTask) || '',
                              authParts,
                              messageType: 'InTaskAuthRequired',
                            };

                            console.log('[a2a-client] Calling authHandler with event:', authEvent);
                            // Call the auth handler
                            Promise.resolve(authHandler(authEvent))
                              .then(() => {
                                console.log('[a2a-client] Auth handler completed successfully');
                                // Auth handler completed successfully
                              })
                              .catch((error) => {
                                console.error('[a2a-client] Auth handler error:', error);
                                errorOccurred = new Error(
                                  `Authentication failed: ${error.message}`
                                );
                                isComplete = true;
                                if (sseClient) {
                                  sseClient.close();
                                }
                              });
                          } else {
                            console.log('[a2a-client] NOT calling authHandler:', {
                              hasAuthParts: authParts.length > 0,
                              hasAuthHandler: !!authHandler,
                            });
                          }
                        } else {
                          console.log('[a2a-client] No authMessage or authMessage.parts');
                        }

                        // Don't complete the stream yet - wait for auth completion
                        // The stream will continue after authentication
                      } else if (resultData.kind === 'status-update') {
                        // Status update - accumulate messages
                        const statusUpdateId = (resultData.taskId || resultData.id) as string;
                        const statusUpdateContextId =
                          typeof resultData.contextId === 'string'
                            ? resultData.contextId
                            : undefined;
                        const statusUpdateStatus = resultData.status as
                          | { state?: string; timestamp?: string; message?: any }
                          | undefined;

                        if (!currentTask) {
                          // Create task if we don't have one yet
                          currentTask = {
                            id: statusUpdateId,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            // Include contextId from server response if available
                            ...(statusUpdateContextId ? { contextId: statusUpdateContextId } : {}),
                            ...(topLevelContextId ? { contextId: topLevelContextId } : {}),
                          };
                        }

                        // Update task state
                        currentTask.state =
                          statusUpdateStatus?.state === 'completed'
                            ? 'completed'
                            : statusUpdateStatus?.state === 'failed'
                              ? 'failed'
                              : 'running';
                        currentTask.updatedAt =
                          statusUpdateStatus?.timestamp || new Date().toISOString();

                        // Update contextId if provided
                        if (statusUpdateContextId) {
                          setContextId(currentTask, statusUpdateContextId);
                        }
                        if (topLevelContextId) {
                          setContextId(currentTask, topLevelContextId);
                        }

                        // Add new message if present
                        const statusMessage = statusUpdateStatus?.message;
                        if (statusMessage && statusMessage.parts) {
                          // Convert A2A message format to our format
                          const content = statusMessage.parts
                            .filter((p: any) => p.kind === 'text')
                            .map((p: any) => ({ type: 'text', content: p.text }));

                          if (content.length > 0) {
                            currentTask.messages.push({
                              role: statusMessage.role === 'agent' ? 'assistant' : 'user',
                              content,
                            });
                          }
                        }

                        // Queue a snapshot of the current task state
                        const contextId = getContextId(currentTask);
                        messageQueue.push({
                          ...currentTask,
                          messages: [...currentTask.messages],
                          artifacts: currentTask.artifacts ? [...currentTask.artifacts] : undefined,
                          // Pass through contextId to the consumer
                          ...(contextId ? { contextId } : {}),
                        });

                        // Check if this is the final update
                        if (resultData.final) {
                          isComplete = true;
                          if (sseClient) {
                            sseClient.close();
                          }
                        }
                      } else if (resultData.kind === 'artifact-update') {
                        // Handle streaming artifact updates with append logic
                        if (!currentTask) {
                          // Create task if we don't have one yet
                          currentTask = {
                            id:
                              (resultData.taskId as string) ||
                              (resultData.id as string) ||
                              `task-${Date.now()}`,
                            state: 'running',
                            createdAt: new Date().toISOString(),
                            messages: [],
                            artifacts: [],
                            // Include contextId from server response if available
                            ...(resultData.contextId
                              ? { contextId: resultData.contextId as string }
                              : {}),
                            ...(topLevelContextId ? { contextId: topLevelContextId } : {}),
                          };
                        }

                        // Handle streaming text content from artifacts
                        const artifactData = resultData.artifact as any;
                        if (artifactData && artifactData.parts) {
                          const textParts = artifactData.parts
                            .filter((part: any) => part.kind === 'Text' || part.kind === 'text')
                            .map((part: any) => part.text || '')
                            .join('');

                          if (!resultData.append) {
                            // Start new message - this is the first chunk
                            const newMessage = {
                              role: 'assistant' as const,
                              content: [{ type: 'text' as const, content: textParts }],
                            };
                            currentTask.messages = [...(currentTask.messages || []), newMessage];
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
                            ...(getContextId(currentTask)
                              ? { contextId: getContextId(currentTask) }
                              : {}),
                          });
                        } else if (artifactData) {
                          // Handle complete artifacts (not streaming parts)
                          const artifact = artifactData;

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
                        if (resultData.lastChunk) {
                          // Mark task as completed or continue based on final flag
                          currentTask.state = 'completed';
                        }
                      } else {
                        // Unknown format, try to construct a basic task
                        if (!currentTask) {
                          currentTask = {
                            id: (resultData.id as string) || `task-${Date.now()}`,
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
                      const resultStatus = resultData.status as { state?: string } | undefined;
                      if (
                        resultData.final ||
                        resultStatus?.state === 'completed' ||
                        resultStatus?.state === 'failed'
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
              // When iterator is done, value is undefined (TypeScript allows this for terminated iterators)
              return { done: true, value: undefined as unknown as Task };
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
  sendAuthenticationCompleted = async (
    contextId: string,
    taskId: string
  ): Promise<AsyncIterable<Task>> => {
    // Create the auth completed message exactly as expected by the server
    // The contextId and taskId must be in the message itself, and we need a "data" part
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
        taskId, // Include the taskId at the context level
        acceptedOutputModes: ['text'],
      },
    };

    // Return the stream iterator so the caller can process all messages
    return this.message.stream(messageRequest);
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
