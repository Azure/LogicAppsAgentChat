import { useCallback, useEffect, useRef } from 'react';
import { useA2A } from '../use-a2a';
import { AgentDiscovery } from '../../discovery/agent-discovery';
import type { AgentCard } from '../../types';
import type {
  AuthConfig,
  AuthRequiredHandler,
  UnauthorizedHandler,
  AuthRequiredEvent,
} from '../../client/types';
import type { Message } from '../types';
import { createMessage } from '../utils/messageUtils';
import { useChatStore } from '../store/chatStore';
import { isDirectAgentCardUrl } from '../../utils/agentUrlUtils';
import { formatErrorMessage } from '../utils/errorUtils';
import type { StorageConfig } from '../../storage/history-storage';

interface UseChatWidgetProps {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  sessionKey?: string;
  agentUrl?: string;
  apiKey?: string;
  oboUserToken?: string;
  storageConfig?: StorageConfig;
  initialContextId?: string;
  sessionId?: string; // For multi-session mode - reads messages from sessionMessages map
}

export function useChatWidget({
  agentCard,
  auth,
  onMessage,
  onConnectionChange,
  onAuthRequired,
  onUnauthorized,
  sessionKey,
  agentUrl,
  apiKey,
  oboUserToken,
  storageConfig,
  initialContextId,
  sessionId,
}: UseChatWidgetProps) {
  const processedMessageIds = useRef<Set<string>>(new Set());
  const messageIdMap = useRef<Map<string, string>>(new Map());
  const sentMessageContents = useRef<Set<string>>(new Set());
  const contextIdRef = useRef<string | undefined>(undefined);

  const {
    addMessage,
    updateMessage,
    setConnected,
    setTyping,
    setAuthRequired,
    clearMessages: clearLocalMessages,
    startSessionStream,
    stopSessionStream,
    sendMessageToSession,
  } = useChatStore();

  // Get session-specific messages if sessionId is provided (multi-session mode)
  const sessionMessages = useChatStore((state) =>
    sessionId ? state.sessionMessages.get(sessionId) || [] : []
  );

  // Get session-specific typing state for multi-session mode
  const sessionIsTyping = useChatStore((state) =>
    sessionId ? state.typingByContext.get(sessionId) || false : false
  );

  // Get session-specific connection state for multi-session mode
  const sessionIsConnected = useChatStore((state) =>
    sessionId ? state.activeConnections.has(sessionId) : false
  );

  // Pending sessions are treated as "ready" even without connection
  // Connection will be created automatically when first message is sent
  const isPendingSession = sessionId?.startsWith('pending-');
  const effectiveSessionIsConnected = isPendingSession || sessionIsConnected;

  // Get agent URL from props or derive from agentCard
  const derivedAgentUrl = agentUrl || (typeof agentCard === 'string' ? agentCard : agentCard?.url);

  // Only use useA2A in single-session mode (when no sessionId provided)
  const {
    isConnected,
    isLoading,
    messages,
    agentCard: connectedAgentCard,
    contextId,
    connect,
    disconnect,
    sendMessage: sdkSendMessage,
    clearMessages,
    sendAuthenticationCompleted,
  } = useA2A(
    // Only connect if NOT in multi-session mode
    !sessionId && auth
      ? {
          auth,
          persistSession: true,
          sessionKey: sessionKey || 'a2a-chat-session',
          agentUrl: derivedAgentUrl,
          onAuthRequired: (event: AuthRequiredEvent) => {
            setAuthRequired(event, contextIdRef.current);
            return onAuthRequired?.(event);
          },
          onUnauthorized,
          apiKey,
          oboUserToken,
          storageConfig,
          initialContextId,
        }
      : !sessionId
        ? {
            persistSession: true,
            sessionKey: sessionKey || 'a2a-chat-session',
            agentUrl: derivedAgentUrl,
            onAuthRequired: (event: AuthRequiredEvent) => {
              setAuthRequired(event, contextIdRef.current);
              return onAuthRequired?.(event);
            },
            onUnauthorized,
            apiKey,
            oboUserToken,
            storageConfig,
            initialContextId,
          }
        : (undefined as any) // Disable useA2A in multi-session mode
  );

  // Update contextIdRef when contextId changes
  useEffect(() => {
    contextIdRef.current = contextId;
  }, [contextId]);

  // Handle connection state changes
  useEffect(() => {
    setConnected(isConnected);
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange, setConnected]);

  // Handle typing changes
  useEffect(() => {
    setTyping(isLoading, contextId);
  }, [isLoading, setTyping, contextId]);

  // Handle incoming messages from SDK
  useEffect(() => {
    if (messages.length === 0) return;

    messages.forEach((sdkMessage) => {
      const existingInternalId = messageIdMap.current.get(sdkMessage.id);

      if (existingInternalId && sdkMessage.isStreaming) {
        // Streaming update
        updateMessage(existingInternalId, {
          content: sdkMessage.content,
          metadata: {
            ...sdkMessage.metadata,
            isStreaming: sdkMessage.isStreaming,
          },
        });
        return;
      }

      if (processedMessageIds.current.has(sdkMessage.id)) {
        // Final update
        if (existingInternalId && !sdkMessage.isStreaming) {
          updateMessage(existingInternalId, {
            content: sdkMessage.content,
            metadata: {
              ...sdkMessage.metadata,
              isStreaming: false,
            },
          });
        }
        return;
      }

      processedMessageIds.current.add(sdkMessage.id);

      let shouldAddToUI = false;

      if (sdkMessage.role === 'assistant') {
        shouldAddToUI = true;
      } else if (sdkMessage.role === 'user') {
        const isFromUI = sentMessageContents.current.has(sdkMessage.content);
        shouldAddToUI = !isFromUI;
        if (isFromUI) {
          sentMessageContents.current.delete(sdkMessage.content);
        }
      } else if (sdkMessage.role === 'system') {
        // Always add system messages (including auth messages) to UI
        shouldAddToUI = true;
      }

      if (shouldAddToUI) {
        const internalMessage = createMessage(
          sdkMessage.content,
          sdkMessage.role === 'system'
            ? 'system'
            : sdkMessage.role === 'user'
              ? 'user'
              : 'assistant'
        );
        internalMessage.metadata = {
          ...internalMessage.metadata,
          sdkMessageId: sdkMessage.id,
          timestamp: sdkMessage.timestamp,
          isStreaming: sdkMessage.isStreaming,
        };

        // Include authEvent if present
        if (sdkMessage.authEvent) {
          internalMessage.authEvent = sdkMessage.authEvent;
        }

        // Ensure the message has proper timestamp
        if (sdkMessage.timestamp) {
          internalMessage.timestamp = sdkMessage.timestamp;
        }

        messageIdMap.current.set(sdkMessage.id, internalMessage.id);

        addMessage(internalMessage);
        onMessage?.(internalMessage);
      }
    });
  }, [messages, onMessage, addMessage, updateMessage]);

  // Clear processed messages when disconnecting
  useEffect(() => {
    if (!isConnected) {
      processedMessageIds.current.clear();
      messageIdMap.current.clear();
      sentMessageContents.current.clear();
    }
  }, [isConnected]);

  // Clear messages on mount to ensure clean state for new sessions
  useEffect(() => {
    clearLocalMessages();
    processedMessageIds.current.clear();
    messageIdMap.current.clear();
    sentMessageContents.current.clear();
  }, [clearLocalMessages]);

  // Auto-connect when agentCard is provided
  useEffect(() => {
    // Multi-session mode: setup config and optionally start stream
    const isAlreadyConnected =
      sessionId && useChatStore.getState().activeConnections.has(sessionId);
    const isPendingSession = sessionId?.startsWith('pending-');
    const hasConfig = sessionId && useChatStore.getState().sessionConfigs.has(sessionId);

    // Skip if already connected or already has config
    if (!sessionId || !agentCard || isAlreadyConnected || hasConfig) {
      return undefined;
    }

    const setupSession = async () => {
      try {
        let resolvedAgentCard: AgentCard;

        if (typeof agentCard === 'string') {
          const discovery = new AgentDiscovery({ apiKey });

          if (isDirectAgentCardUrl(agentCard)) {
            try {
              resolvedAgentCard = await discovery.fromDirect(agentCard);
            } catch (error) {
              // Fallback: fetch manually
              const headers: HeadersInit = {};
              if (apiKey) {
                headers['X-API-Key'] = apiKey;
              }
              const response = await fetch(agentCard, { headers });
              const rawData = await response.json();

              const enhancedAgentCard = {
                protocolVersion: '0.2.9',
                ...rawData,
                capabilities: {
                  streaming: false,
                  pushNotifications: false,
                  stateTransitionHistory: false,
                  extensions: [],
                  ...rawData.capabilities,
                },
              } as AgentCard;

              resolvedAgentCard = enhancedAgentCard;
            }
          } else {
            resolvedAgentCard = await discovery.fromWellKnownUri(agentCard);
          }
        } else {
          resolvedAgentCard = agentCard;
        }

        const config = {
          agentCard: resolvedAgentCard,
          auth,
          apiKey,
          oboUserToken,
          onAuthRequired,
          onUnauthorized,
        };

        if (isPendingSession) {
          // For pending sessions, just store the config without connecting
          console.log(`[useChatWidget] Storing config for pending session ${sessionId}`);
          useChatStore.setState((state) => {
            const newConfigs = new Map(state.sessionConfigs);
            newConfigs.set(sessionId, config);
            return { sessionConfigs: newConfigs };
          });
        } else {
          // For real sessions, start the stream (which stores config automatically)
          await startSessionStream(sessionId, config);
        }
      } catch (error) {
        console.error('Failed to setup session:', error);
      }
    };

    setupSession();

    // Cleanup: stop stream when unmounting (only for non-pending sessions)
    return () => {
      if (!isPendingSession) {
        stopSessionStream(sessionId);
      }
    };
  }, [sessionId, agentCard]);

  // Single-session mode: use useA2A connection
  useEffect(() => {
    if (!sessionId && agentCard && !isConnected) {
      const connectToAgent = async () => {
        try {
          if (typeof agentCard === 'string') {
            const discovery = new AgentDiscovery({ apiKey });
            let resolvedAgentCard: AgentCard;

            if (isDirectAgentCardUrl(agentCard)) {
              try {
                resolvedAgentCard = await discovery.fromDirect(agentCard);
              } catch (error) {
                // Fallback: fetch manually
                const headers: HeadersInit = {};
                if (apiKey) {
                  headers['X-API-Key'] = apiKey;
                }
                const response = await fetch(agentCard, { headers });
                const rawData = await response.json();

                const enhancedAgentCard = {
                  protocolVersion: '0.2.9',
                  ...rawData,
                  capabilities: {
                    streaming: false,
                    pushNotifications: false,
                    stateTransitionHistory: false,
                    extensions: [],
                    ...rawData.capabilities,
                  },
                } as AgentCard;

                resolvedAgentCard = enhancedAgentCard;
              }
            } else {
              resolvedAgentCard = await discovery.fromWellKnownUri(agentCard);
            }

            await connect(resolvedAgentCard);
          } else {
            await connect(agentCard);
          }
        } catch (error) {
          console.error('Failed to connect to agent:', error);
        }
      };

      connectToAgent();
    }

    return undefined;
  }, [sessionId, agentCard, isConnected, connect]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      // Multi-session mode: use store's sendMessageToSession
      if (sessionId) {
        try {
          await sendMessageToSession(sessionId, content);
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        }
        return;
      }

      // Single-session mode: use useA2A's sdkSendMessage
      if (!isConnected) {
        throw new Error('Not connected to agent');
      }

      const message = createMessage(content, 'user');
      addMessage(message);

      try {
        sentMessageContents.current.add(content);
        await sdkSendMessage(content);
        updateMessage(message.id, { status: 'sent' });
      } catch (error) {
        console.error('Error sending message:', error);

        // Extract error details from JsonRpcErrorResponse or other error types
        const errorDetails = formatErrorMessage(error);

        updateMessage(message.id, {
          status: 'error',
          error: errorDetails,
        });
        throw error;
      }
    },
    [isConnected, sdkSendMessage, addMessage, updateMessage, sessionId, sendMessageToSession]
  );

  const clearSession = useCallback(() => {
    clearMessages();
    clearLocalMessages();
    processedMessageIds.current.clear();
    messageIdMap.current.clear();
    sentMessageContents.current.clear();
  }, [clearMessages, clearLocalMessages]);

  const handleAuthCompleted = useCallback(async () => {
    try {
      await sendAuthenticationCompleted();
      // Clear auth required state when authentication is completed
      setAuthRequired(null, contextIdRef.current);
    } catch (error) {
      console.error('Failed to send authentication completed:', error);
    }
  }, [sendAuthenticationCompleted, setAuthRequired]);

  const handleAuthCanceled = useCallback(() => {
    // Clear auth required state when authentication is canceled
    setAuthRequired(null, contextIdRef.current);
  }, [setAuthRequired]);

  // Return session-specific or single-session state based on mode
  if (sessionId) {
    // Multi-session mode: return store-managed state
    return {
      sendMessage,
      isConnected: effectiveSessionIsConnected, // Use reactive subscription, treating pending sessions as connected
      isTyping: sessionIsTyping,
      messages: sessionMessages,
      agentName: typeof agentCard === 'object' ? agentCard.name : 'Agent',
      agentDescription: typeof agentCard === 'object' ? agentCard.description : undefined,
      contextId: sessionId, // In multi-session mode, contextId is the sessionId
      disconnect: () => stopSessionStream(sessionId),
      clearSession,
      sendAuthenticationCompleted, // May need session-specific version
      handleAuthCompleted,
      handleAuthCanceled,
    };
  }

  // Single-session mode: return useA2A state
  return {
    sendMessage,
    isConnected,
    isTyping: isLoading,
    messages,
    agentName: connectedAgentCard?.name || 'Agent',
    agentDescription: connectedAgentCard?.description,
    contextId,
    disconnect,
    clearSession,
    sendAuthenticationCompleted,
    handleAuthCompleted,
    handleAuthCanceled,
  };
}
