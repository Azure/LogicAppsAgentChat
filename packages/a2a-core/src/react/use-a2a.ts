import { useState, useCallback, useRef } from 'react';
import { A2AClient, A2AClientConfig } from '../client/a2a-client';
import type { AgentCard, Part as A2APart, Artifact, Task } from '../types';
import type { AuthConfig, AuthRequiredHandler } from '../client/types';

// Extended Task type with contextId for internal use
interface TaskWithContext extends Task {
  contextId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    taskId?: string;
    artifacts?: Artifact[];
  };
}

export interface UseA2AOptions {
  auth?: AuthConfig;
  persistSession?: boolean;
  sessionKey?: string;
  onAuthRequired?: AuthRequiredHandler;
}

export interface UseA2AReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  agentCard: AgentCard | undefined;
  error: Error | undefined;
  contextId: string | undefined;

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

  const clientRef = useRef<A2AClient>();
  const contextIdRef = useRef<string | undefined>(undefined);

  const connect = useCallback(
    async (card: AgentCard) => {
      try {
        setError(undefined);

        // Create A2A client
        const clientConfig: A2AClientConfig = {
          agentCard: card,
          httpOptions: {
            retries: 2,
            timeout: 30000,
          },
        };

        if (options.auth) {
          clientConfig.auth = options.auth;
        }

        if (options.onAuthRequired) {
          clientConfig.onAuthRequired = options.onAuthRequired;
        }

        clientRef.current = new A2AClient(clientConfig);

        setAgentCard(card);
        setIsConnected(true);

        // Load session if persistence is enabled
        if (options.persistSession && options.sessionKey) {
          const savedMessages = localStorage.getItem(`a2a-messages-${options.sessionKey}`);
          const savedContextId = localStorage.getItem(`a2a-context-${options.sessionKey}`);

          if (savedMessages) {
            try {
              setMessages(JSON.parse(savedMessages));
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

      // Adding user message

      setMessages((prev) => {
        const newMessages = [...prev, userMessage];

        // Messages updated after adding user message

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
            const serverContextId =
              (task as TaskWithContext).contextId || task.metadata?.['contextId'];
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

                // Processing message update

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
                      // Updating existing message

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
                  // Handle artifacts - check if it has content
                  if (artifact.content) {
                    const artifactMessage: ChatMessage = {
                      id: `artifact-${Date.now()}-${artifact.id}`,
                      role: 'assistant',
                      content: `📄 ${artifact.title || artifact.id}:\n\`\`\`${artifact.type || ''}\n${artifact.content}\n\`\`\``,
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
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  return {
    isConnected,
    isLoading,
    messages,
    agentCard,
    error,
    contextId: contextIdRef.current,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    sendAuthenticationCompleted,
  };
}
