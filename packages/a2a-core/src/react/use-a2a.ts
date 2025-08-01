import { useState, useCallback, useRef, useEffect } from 'react';
import { A2AClient } from '../client/a2a-client';
import { A2AClientWithAutoHistory } from '../client/a2a-client-with-auto-history';
import { A2AClientQuery } from '../client/a2a-client-query';
import type { AgentCard, Part as A2APart } from '../types';
import type { AuthConfig, AuthRequiredHandler, UnauthorizedHandler } from '../client/types';
// Storage keys are no longer needed for server-side history

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    taskId?: string;
    artifacts?: any[];
  };
  authEvent?: {
    authParts: any[];
    status: 'pending' | 'completed' | 'failed';
  };
}

export interface UseA2AOptions {
  auth?: AuthConfig;
  agentUrl?: string;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  apiKey?: string;
  contextId?: string; // Initial context ID to use
  useReactQuery?: boolean; // Use React Query-compatible client
}

export interface UseA2AReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  agentCard: AgentCard | undefined;
  error: Error | undefined;
  contextId: string | undefined;
  authState: {
    isRequired: boolean;
    authEvent?: any;
  };
  client: A2AClient | undefined;

  // Actions
  connect: (agentCard: AgentCard) => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  sendAuthenticationCompleted: () => Promise<void>;
}

export function useA2A(options: UseA2AOptions = {}): UseA2AReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentCard, setAgentCard] = useState<AgentCard>();
  const [error, setError] = useState<Error>();
  const [authState, setAuthState] = useState<{ isRequired: boolean; authEvent?: any }>({
    isRequired: false,
  });

  const clientRef = useRef<A2AClient>();
  const contextIdRef = useRef<string | undefined>(options.contextId);
  const authMessageIdRef = useRef<string | undefined>(undefined);
  const authTaskIdRef = useRef<string | undefined>(undefined);
  const currentAgentUrlRef = useRef<string | undefined>(undefined);

  // Update contextIdRef when options.contextId changes
  useEffect(() => {
    if (options.contextId && options.contextId !== contextIdRef.current) {
      console.log('[useA2A] Updating contextId from options:', options.contextId);
      contextIdRef.current = options.contextId;
      // Clear messages when switching contexts
      setMessages([]);
    }
  }, [options.contextId]);

  // Remove storage key helpers - no longer needed for server-side history

  const connect = useCallback(
    async (card: AgentCard) => {
      try {
        setError(undefined);

        // Get agent URL from card
        const agentUrl = typeof card === 'string' ? card : card.url;
        currentAgentUrlRef.current = options.agentUrl || agentUrl;

        // Create A2A client
        const clientConfig: any = {
          agentCard: card,
          httpOptions: {
            retries: 2,
            timeout: 30000,
          },
        };

        if (options.auth) {
          clientConfig.auth = options.auth;
        }

        if (options.apiKey) {
          clientConfig.apiKey = options.apiKey;
        }

        // Create a custom auth handler that adds auth messages to the UI
        const authHandler: AuthRequiredHandler = async (event) => {
          // Store the task ID for when we send the authentication completed message
          authTaskIdRef.current = event.taskId;

          // Add authentication message to the UI
          const authMessageId = `auth-${event.taskId}-${Date.now()}`;
          authMessageIdRef.current = authMessageId;

          const authMessage: ChatMessage = {
            id: authMessageId,
            role: 'system',
            content: 'Authentication required',
            timestamp: new Date(),
            isStreaming: false,
            authEvent: {
              authParts: event.authParts,
              status: 'pending',
            },
            metadata: {
              taskId: event.taskId,
            },
          };

          setMessages((prev) => [...prev, authMessage]);

          setAuthState({
            isRequired: true,
            authEvent: event,
          });

          // Call the original handler if provided
          if (options.onAuthRequired) {
            return options.onAuthRequired(event);
          }
        };

        clientConfig.onAuthRequired = authHandler;

        // Pass the onUnauthorized handler if provided
        if (options.onUnauthorized) {
          clientConfig.onUnauthorized = options.onUnauthorized;
        }

        // Use React Query-compatible client if requested, otherwise use auto-history
        if (options.useReactQuery) {
          clientRef.current = new A2AClientQuery(clientConfig);
        } else {
          clientRef.current = new A2AClientWithAutoHistory(clientConfig);
        }

        setAgentCard(card);
        setIsConnected(true);

        // Server-side history will be loaded automatically by A2AClientWithAutoHistory
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [options.auth, options.apiKey, options.onAuthRequired, options.onUnauthorized]
  );

  const disconnect = useCallback(() => {
    clientRef.current = undefined;
    contextIdRef.current = undefined; // Clear context ID on disconnect
    setIsConnected(false);
    setAgentCard(undefined);
    setMessages([]);
    setError(undefined);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!clientRef.current) {
      throw new Error('Not connected to agent');
    }

    setIsLoading(true);
    setError(undefined);

    // Add user message with unique ID
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Create message request with context ID if available
      const messageRequest = {
        message: {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              content: content,
            },
          ],
        },
        // Include context ID if we have one (for continuation of conversation)
        context: contextIdRef.current ? { contextId: contextIdRef.current } : undefined,
      };

      // Stream response
      const stream = clientRef.current.message.stream(messageRequest);

      // Track which messages we've added
      const addedMessageIds = new Set<string>();

      for await (const task of stream) {
        // Note: Task received from stream

        // Capture context ID from the server response - check both locations
        if (!contextIdRef.current) {
          const serverContextId = (task as any).contextId || task.metadata?.['contextId'];
          if (serverContextId) {
            contextIdRef.current = serverContextId as string;
            // Context ID is now managed server-side, no local storage needed
          }
        }

        // Process messages from the task
        if (task.messages && task.messages.length > 0) {
          // Process all messages but check for duplicates
          for (let i = 0; i < task.messages.length; i++) {
            const message = task.messages[i];
            if (!message) continue; // Skip if message is undefined

            const contentParts = message.content || [];

            const textContent = contentParts
              .filter((part: A2APart) => part.type === 'text')
              .map((part: A2APart) => (part.type === 'text' ? part.content : ''))
              .join('');

            if (textContent) {
              // Each message should be its own separate UI message
              const messageId = `${message.role}-${task.id}-${i}`;
              const isStreaming = task.state === 'running' || task.state === 'pending';

              setMessages((prev) => {
                // Skip if this is a user message that we already have
                if (message.role === 'user') {
                  const isDuplicate = prev.some(
                    (msg) => msg.role === 'user' && msg.content === textContent
                  );
                  if (isDuplicate) {
                    return prev; // Return unchanged messages
                  }
                }
                // Check if this specific message already exists
                const existingIndex = prev.findIndex((msg) => msg.id === messageId);

                if (existingIndex !== -1) {
                  // Message already exists - always update it during streaming to show real-time updates
                  const existingMessage = prev[existingIndex];

                  if (existingMessage) {
                    // Always update content to ensure real-time streaming display
                    const updatedMessages = [...prev];
                    updatedMessages[existingIndex] = {
                      id: existingMessage.id,
                      role: existingMessage.role,
                      content: textContent, // Updated with latest accumulated content
                      timestamp: new Date(),
                      isStreaming,
                      metadata: existingMessage.metadata || {
                        taskId: task.id,
                      },
                    };

                    return updatedMessages;
                  }

                  return prev;
                } else {
                  // Create new message for first chunk

                  const chatMessage: ChatMessage = {
                    id: messageId,
                    role: message.role === 'assistant' ? 'assistant' : 'user',
                    content: textContent,
                    timestamp: new Date(),
                    isStreaming,
                    metadata: {
                      taskId: task.id,
                    },
                  };

                  return [...prev, chatMessage];
                }
              });
            }
          }

          // Handle artifacts
          if (task.artifacts && task.artifacts.length > 0) {
            const artifactMessageKey = `artifacts-${task.artifacts.length}`;

            if (!addedMessageIds.has(artifactMessageKey)) {
              addedMessageIds.add(artifactMessageKey);

              for (const artifact of task.artifacts) {
                // Handle artifacts based on their structure - they may come in different formats
                const artifactAny = artifact as any;
                if (artifactAny.parts && artifactAny.parts.length > 0) {
                  for (const part of artifactAny.parts) {
                    if (part.kind === 'text' && part.text) {
                      const artifactMessage: ChatMessage = {
                        id: `artifact-${Date.now()}-${artifactAny.artifactId || artifactAny.id}`,
                        role: 'assistant',
                        content: `📄 ${artifactAny.name || artifactAny.artifactId || artifactAny.title}:\n\`\`\`${artifactAny.name?.split('.').pop() || ''}\n${part.text}\n\`\`\``,
                        timestamp: new Date(),
                        isStreaming: false,
                        metadata: {
                          taskId: task.id,
                          artifacts: [artifact],
                        },
                      };

                      setMessages((prev) => [...prev, artifactMessage]);
                    }
                  }
                } else if (artifactAny.content) {
                  // Handle older format with direct content
                  const artifactMessage: ChatMessage = {
                    id: `artifact-${Date.now()}-${artifactAny.id}`,
                    role: 'assistant',
                    content: `📄 ${artifactAny.title || artifactAny.id}:\n\`\`\`\n${artifactAny.content}\n\`\`\``,
                    timestamp: new Date(),
                    isStreaming: false,
                    metadata: {
                      taskId: task.id,
                      artifacts: [artifact],
                    },
                  };

                  setMessages((prev) => [...prev, artifactMessage]);
                }
              }
            }
          }
        }

        // Update streaming state when complete
        if (task.state === 'completed' || task.state === 'failed') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.metadata?.taskId === task.id ? { ...msg, isStreaming: false } : msg
            )
          );
        }
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    contextIdRef.current = undefined; // Clear context ID for new session
    // Server manages history, no local storage to clear
  }, []);

  const sendAuthenticationCompleted = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('Client not connected');
    }

    if (!contextIdRef.current) {
      throw new Error('No context ID available for authentication');
    }

    if (!authTaskIdRef.current) {
      throw new Error('No task ID available for authentication');
    }

    try {
      // Get the stream iterator from sendAuthenticationCompleted with both contextId and taskId
      const stream = await clientRef.current.sendAuthenticationCompleted(
        contextIdRef.current,
        authTaskIdRef.current
      );

      // Update the auth message to completed status immediately
      if (authMessageIdRef.current) {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id === authMessageIdRef.current && msg.authEvent) {
              return {
                ...msg,
                authEvent: {
                  ...msg.authEvent,
                  status: 'completed' as const,
                },
              };
            }
            return msg;
          });
        });
      }

      // Process the stream response just like a regular message
      for await (const task of stream) {
        // Capture context ID from the server response if we don't have it
        if (!contextIdRef.current) {
          const serverContextId = (task as any).contextId || task.metadata?.['contextId'];
          if (serverContextId) {
            contextIdRef.current = serverContextId as string;
            // Context ID is now managed server-side, no local storage needed
          }
        }

        // Process messages from the task
        if (task.messages && task.messages.length > 0) {
          for (let i = 0; i < task.messages.length; i++) {
            const message = task.messages[i];
            if (!message) continue;

            const contentParts = message.content || [];
            const textContent = contentParts
              .filter((part: A2APart) => part.type === 'text')
              .map((part: A2APart) => (part.type === 'text' ? part.content : ''))
              .join('');

            if (textContent) {
              const messageId = `${message.role}-${task.id}-${i}`;
              const isStreaming = task.state === 'running' || task.state === 'pending';

              setMessages((prev) => {
                // Skip duplicate user messages
                if (message.role === 'user') {
                  const isDuplicate = prev.some(
                    (msg) => msg.role === 'user' && msg.content === textContent
                  );
                  if (isDuplicate) {
                    return prev;
                  }
                }

                // Check if message already exists
                const existingIndex = prev.findIndex((msg) => msg.id === messageId);

                if (existingIndex !== -1) {
                  // Update existing message
                  const updatedMessages = [...prev];
                  updatedMessages[existingIndex] = {
                    ...prev[existingIndex],
                    content: textContent,
                    isStreaming,
                  };
                  return updatedMessages;
                } else {
                  // Create new message
                  const chatMessage: ChatMessage = {
                    id: messageId,
                    role: message.role === 'assistant' ? 'assistant' : 'user',
                    content: textContent,
                    timestamp: new Date(),
                    isStreaming,
                    metadata: {
                      taskId: task.id,
                    },
                  };

                  return [...prev, chatMessage];
                }
              });
            }
          }
        }

        // Update loading state
        setIsLoading(task.state === 'running');
      }

      // Ensure loading state is cleared after stream completes
      setIsLoading(false);

      // Clear auth state and task ID reference
      setAuthState({
        isRequired: false,
      });
      authTaskIdRef.current = undefined;
    } catch (error) {
      setError(error as Error);

      // Update the auth message to failed status
      if (authMessageIdRef.current) {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id === authMessageIdRef.current && msg.authEvent) {
              return {
                ...msg,
                authEvent: {
                  ...msg.authEvent,
                  status: 'failed' as const,
                },
              };
            }
            return msg;
          });
        });
      }

      throw error;
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  }, []);

  return {
    isConnected,
    isLoading,
    messages,
    agentCard,
    error,
    contextId: contextIdRef.current,
    authState,
    client: clientRef.current,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    sendAuthenticationCompleted,
  };
}
