import { useState, useCallback, useRef } from 'react';
import { A2AClient } from '../../client/a2a-client';
import type { AgentCard, Part as A2APart } from '../../types';
import type { AuthConfig, AuthRequiredHandler, UnauthorizedHandler } from '../../client/types';
import { useHistoryStore } from '../store/historyStore';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../types';

export interface UseA2AWithHistoryOptions {
  auth?: AuthConfig;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  apiKey?: string;
}

export interface UseA2AWithHistoryReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  agentCard: AgentCard | undefined;
  error: Error | undefined;
  contextId: string | undefined;

  // Actions
  connect: (agentCard: AgentCard) => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string, contextId?: string) => Promise<void>;
  sendAuthenticationCompleted: () => Promise<void>;
}

export function useA2AWithHistory(options: UseA2AWithHistoryOptions = {}): UseA2AWithHistoryReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agentCard, setAgentCard] = useState<AgentCard>();
  const [error, setError] = useState<Error>();

  const clientRef = useRef<A2AClient>();
  const authTaskIdRef = useRef<string | undefined>(undefined);

  // Get current context from history store
  const { currentContextId } = useHistoryStore();
  const { addMessage, updateMessage, setTyping } = useChatStore();

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
          onAuthRequired: options.onAuthRequired,
          onUnauthorized: options.onUnauthorized,
        };

        if (options.auth) {
          clientConfig.auth = options.auth;
        }

        if (options.apiKey) {
          clientConfig.apiKey = options.apiKey;
        }

        const client = new A2AClient(clientConfig);
        clientRef.current = client;

        setAgentCard(card);
        setIsConnected(true);

        // Load contexts from server
        if (client) {
          await useHistoryStore.getState().fetchContexts(client, true);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [options.auth, options.onAuthRequired, options.onUnauthorized, options.apiKey]
  );

  const disconnect = useCallback(() => {
    clientRef.current = undefined;
    setIsConnected(false);
    setAgentCard(undefined);
    setError(undefined);
  }, []);

  const sendMessage = useCallback(
    async (content: string, explicitContextId?: string) => {
      if (!clientRef.current) {
        throw new Error('Not connected to agent');
      }

      const contextId = explicitContextId || currentContextId;

      setIsLoading(true);
      setTyping(true, contextId || undefined);
      setError(undefined);

      // Create user message
      const userMessage: Message = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'user',
        content: content,
        timestamp: new Date(),
        status: 'sending',
      };

      addMessage(userMessage);

      try {
        // Create message request with context ID
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
          // Include context ID if available
          context: contextId ? { contextId } : undefined,
        };

        // Stream response
        const stream = clientRef.current.message.stream(messageRequest);

        let assistantMessageId: string | null = null;
        let capturedContextId: string | null = null;

        for await (const task of stream) {
          // Capture context ID from the server response
          if (!capturedContextId) {
            const serverContextId = (task as any).contextId || task.metadata?.['contextId'];
            if (serverContextId) {
              capturedContextId = serverContextId;

              // If this is a new context, update the store
              if (!contextId && capturedContextId) {
                useHistoryStore.getState().setCurrentContext(capturedContextId);
              }
            }
          }

          // Process messages from the task
          if (task.messages && task.messages.length > 0) {
            for (const message of task.messages) {
              if (!message || message.role !== 'assistant') continue;

              const textContent = message.content
                .filter((part: A2APart) => part.type === 'text')
                .map((part: A2APart) => (part.type === 'text' ? part.content : ''))
                .join('');

              if (textContent) {
                if (!assistantMessageId) {
                  // Create new assistant message
                  assistantMessageId = `assistant-${task.id}-${Date.now()}`;
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    sender: 'assistant',
                    content: textContent,
                    timestamp: new Date(),
                    status: task.state === 'completed' ? 'sent' : 'sending',
                    metadata: {
                      taskId: task.id,
                      isStreaming: task.state !== 'completed',
                    },
                  };
                  addMessage(assistantMessage);
                } else {
                  // Update existing message
                  updateMessage(assistantMessageId, {
                    content: textContent,
                    status: task.state === 'completed' ? 'sent' : 'sending',
                    metadata: {
                      taskId: task.id,
                      isStreaming: task.state !== 'completed',
                    },
                  });
                }
              }
            }
          }
        }

        // Mark user message as sent
        updateMessage(userMessage.id, { status: 'sent' });

        // Refresh contexts to get the latest state
        if (clientRef.current) {
          await useHistoryStore.getState().fetchContexts(clientRef.current, true);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        updateMessage(userMessage.id, { status: 'error' });
        throw error;
      } finally {
        setIsLoading(false);
        setTyping(false, contextId || undefined);
      }
    },
    [currentContextId, addMessage, updateMessage, setTyping]
  );

  const sendAuthenticationCompleted = useCallback(async () => {
    if (!clientRef.current || !currentContextId || !authTaskIdRef.current) {
      throw new Error('Missing required information for authentication completion');
    }

    try {
      const stream = await clientRef.current.sendAuthenticationCompleted(
        currentContextId,
        authTaskIdRef.current
      );

      // Process the response stream
      for await (const task of stream) {
        // Handle the authentication completed response
        console.log('Auth completed response:', task);
      }
    } catch (error) {
      console.error('Error sending authentication completed:', error);
      throw error;
    }
  }, [currentContextId]);

  return {
    isConnected,
    isLoading,
    agentCard,
    error,
    contextId: currentContextId || undefined,
    connect,
    disconnect,
    sendMessage,
    sendAuthenticationCompleted,
  };
}
