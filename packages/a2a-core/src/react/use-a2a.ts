import { useState, useCallback, useRef } from 'react';
import { A2AClient } from '../client/a2a-client';
import type { AgentCard, Part as A2APart } from '../types';
import type { AuthConfig, AuthRequiredHandler } from '../client/types';

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
  persistSession?: boolean;
  sessionKey?: string;
  onAuthRequired?: AuthRequiredHandler;
  apiKey?: string;
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
  const contextIdRef = useRef<string | undefined>(undefined);
  const authMessageIdRef = useRef<string | undefined>(undefined);

  const connect = useCallback(
    async (card: AgentCard) => {
      try {
        setError(undefined);

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

          setMessages((prev) => {
            const newMessages = [...prev, authMessage];

            // Persist messages
            if (options.persistSession && options.sessionKey) {
              localStorage.setItem(
                `a2a-messages-${options.sessionKey}`,
                JSON.stringify(newMessages)
              );
            }

            return newMessages;
          });

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

        clientRef.current = new A2AClient(clientConfig);

        setAgentCard(card);
        setIsConnected(true);

        // Load session if persistence is enabled
        if (options.persistSession && options.sessionKey) {
          const savedMessages = localStorage.getItem(`a2a-messages-${options.sessionKey}`);
          const savedContextId = localStorage.getItem(`a2a-context-${options.sessionKey}`);

          if (savedMessages) {
            try {
              const parsedMessages = JSON.parse(savedMessages);
              setMessages(parsedMessages);

              // Find any pending auth messages and update the ref
              const pendingAuthMessage = parsedMessages.find(
                (msg: ChatMessage) => msg.authEvent && msg.authEvent.status === 'pending'
              );
              if (pendingAuthMessage) {
                authMessageIdRef.current = pendingAuthMessage.id;
              }
            } catch (e) {
              console.error('Failed to load saved messages:', e);
            }
          }

          if (savedContextId) {
            try {
              contextIdRef.current = savedContextId;
            } catch (e) {
              console.error('Failed to load saved context ID:', e);
            }
          }
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [options.auth, options.persistSession, options.sessionKey]
  );

  const disconnect = useCallback(() => {
    clientRef.current = undefined;
    contextIdRef.current = undefined; // Clear context ID on disconnect
    setIsConnected(false);
    setAgentCard(undefined);
    setMessages([]);
    setError(undefined);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
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

      console.log('DEBUG: Adding user message:', {
        id: userMessageId,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      });

      setMessages((prev) => {
        const newMessages = [...prev, userMessage];

        console.log('DEBUG: Messages after adding user message:', {
          total: newMessages.length,
          lastMessage: newMessages[newMessages.length - 1],
        });

        // Persist messages immediately when user message is added
        if (options.persistSession && options.sessionKey) {
          localStorage.setItem(`a2a-messages-${options.sessionKey}`, JSON.stringify(newMessages));
        }

        return newMessages;
      });

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

              // Persist context ID immediately when captured
              if (options.persistSession && options.sessionKey) {
                localStorage.setItem(`a2a-context-${options.sessionKey}`, contextIdRef.current);
              }
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

                console.log('DEBUG: Processing message update:', {
                  messageId,
                  role: message.role,
                  taskId: task.id,
                  taskState: task.state,
                  isStreaming,
                  contentLength: textContent.length,
                  contentPreview:
                    textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''),
                });

                setMessages((prev) => {
                  // Skip if this is a user message that we already have
                  if (message.role === 'user') {
                    const isDuplicate = prev.some(
                      (msg) => msg.role === 'user' && msg.content === textContent
                    );
                    if (isDuplicate) {
                      console.log('DEBUG: Skipping duplicate user message:', textContent);
                      return prev; // Return unchanged messages
                    }
                  }
                  // Check if this specific message already exists
                  const existingIndex = prev.findIndex((msg) => msg.id === messageId);

                  if (existingIndex !== -1) {
                    // Message already exists - always update it during streaming to show real-time updates
                    const existingMessage = prev[existingIndex];

                    if (existingMessage) {
                      console.log('DEBUG: Updating existing message:', {
                        messageId,
                        oldContentLength: existingMessage.content.length,
                        newContentLength: textContent.length,
                        contentChanged: existingMessage.content !== textContent,
                      });

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

                      // Persist messages when content is updated
                      if (options.persistSession && options.sessionKey) {
                        localStorage.setItem(
                          `a2a-messages-${options.sessionKey}`,
                          JSON.stringify(updatedMessages)
                        );
                      }

                      return updatedMessages;
                    }

                    return prev;
                  } else {
                    // Create new message for first chunk
                    console.log('DEBUG: Creating new message:', {
                      messageId,
                      contentLength: textContent.length,
                      contentPreview: textContent.substring(0, 50) + '...',
                    });

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

                    const newMessages = [...prev, chatMessage];

                    // Persist messages when assistant message is added
                    if (options.persistSession && options.sessionKey) {
                      localStorage.setItem(
                        `a2a-messages-${options.sessionKey}`,
                        JSON.stringify(newMessages)
                      );
                    }

                    return newMessages;
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

                        setMessages((prev) => {
                          const newMessages = [...prev, artifactMessage];

                          // Persist messages when artifact message is added
                          if (options.persistSession && options.sessionKey) {
                            localStorage.setItem(
                              `a2a-messages-${options.sessionKey}`,
                              JSON.stringify(newMessages)
                            );
                          }

                          return newMessages;
                        });
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

                    setMessages((prev) => {
                      const newMessages = [...prev, artifactMessage];

                      // Persist messages when artifact message is added
                      if (options.persistSession && options.sessionKey) {
                        localStorage.setItem(
                          `a2a-messages-${options.sessionKey}`,
                          JSON.stringify(newMessages)
                        );
                      }

                      return newMessages;
                    });
                  }
                }
              }
            }
          }

          // Update streaming state when complete
          if (task.state === 'completed' || task.state === 'failed') {
            setMessages((prev) => {
              const newMessages = prev.map((msg) =>
                msg.metadata?.taskId === task.id ? { ...msg, isStreaming: false } : msg
              );

              // Persist messages when streaming state updates
              if (options.persistSession && options.sessionKey) {
                localStorage.setItem(
                  `a2a-messages-${options.sessionKey}`,
                  JSON.stringify(newMessages)
                );
              }

              return newMessages;
            });
          }
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options.persistSession, options.sessionKey]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    contextIdRef.current = undefined; // Clear context ID for new session

    if (options.persistSession && options.sessionKey) {
      localStorage.removeItem(`a2a-messages-${options.sessionKey}`);
      localStorage.removeItem(`a2a-context-${options.sessionKey}`);
    }
  }, [options.persistSession, options.sessionKey]);

  const sendAuthenticationCompleted = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('Client not connected');
    }

    if (!contextIdRef.current) {
      throw new Error('No context ID available for authentication');
    }

    try {
      await clientRef.current.sendAuthenticationCompleted(contextIdRef.current);

      // Update the auth message to completed status
      if (authMessageIdRef.current) {
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) => {
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

          // Persist messages
          if (options.persistSession && options.sessionKey) {
            localStorage.setItem(
              `a2a-messages-${options.sessionKey}`,
              JSON.stringify(updatedMessages)
            );
          }

          return updatedMessages;
        });
      }

      // Clear auth state
      setAuthState({
        isRequired: false,
      });
    } catch (error) {
      setError(error as Error);

      // Update the auth message to failed status
      if (authMessageIdRef.current) {
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) => {
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

          // Persist messages
          if (options.persistSession && options.sessionKey) {
            localStorage.setItem(
              `a2a-messages-${options.sessionKey}`,
              JSON.stringify(updatedMessages)
            );
          }

          return updatedMessages;
        });
      }

      throw error;
    }
  }, [options.persistSession, options.sessionKey]);

  return {
    isConnected,
    isLoading,
    messages,
    agentCard,
    error,
    contextId: contextIdRef.current,
    authState,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    sendAuthenticationCompleted,
  };
}
