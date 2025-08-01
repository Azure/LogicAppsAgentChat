import { useCallback, useEffect, useState, useMemo } from 'react';
import { useA2A } from '../use-a2a';
import type { AgentCard } from '../../types';
import type {
  AuthConfig,
  AuthRequiredHandler,
  UnauthorizedHandler,
  AuthRequiredEvent,
} from '../../client/types';
import type { Message, Attachment } from '../types';
import { createMessage } from '../utils/messageUtils';
import { useChatStore } from '../store/chatStore';
import { useHistorySync } from './useHistorySync';

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
  contextId?: string;
}

/**
 * Chat widget hook with improved React patterns
 */
export function useChatWidget({
  agentCard,
  auth,
  onMessage,
  onConnectionChange,
  onAuthRequired,
  onUnauthorized,
  sessionKey = 'a2a-chat-session',
  agentUrl,
  apiKey,
  contextId: propsContextId,
}: UseChatWidgetProps) {
  // Use state for tracking processed messages instead of refs
  const [processedMessageIds] = useState(() => new Set<string>());
  const [messageIdMap] = useState(() => new Map<string, string>());
  const [sentMessageContents] = useState(() => new Set<string>());

  const {
    addMessage,
    updateMessage,
    setConnected,
    setTyping,
    setAuthRequired,
    clearMessages: clearLocalMessages,
    currentContextId,
    setCurrentContextId,
    getAuthRequiredForContext,
  } = useChatStore();

  // Memoize agent URL derivation
  const derivedAgentUrl = useMemo(
    () => agentUrl || (typeof agentCard === 'string' ? agentCard : agentCard?.url),
    [agentUrl, agentCard]
  );

  // Memoize auth required handler to avoid recreating on every render
  const handleAuthRequired = useCallback(
    (event: AuthRequiredEvent) => {
      setAuthRequired(event, propsContextId);
      return onAuthRequired?.(event);
    },
    [setAuthRequired, propsContextId, onAuthRequired]
  );

  // Memoize A2A config to avoid unnecessary reconnections
  const a2aConfig = useMemo(
    () => ({
      auth,
      agentUrl: derivedAgentUrl,
      onAuthRequired: handleAuthRequired,
      onUnauthorized,
      apiKey,
      contextId: propsContextId,
      useReactQuery: true,
    }),
    [auth, sessionKey, derivedAgentUrl, handleAuthRequired, onUnauthorized, apiKey, propsContextId]
  );

  const {
    isConnected,
    isLoading,
    messages,
    agentCard: connectedAgentCard,
    contextId,
    client,
    connect,
    disconnect,
    sendMessage: sdkSendMessage,
    clearMessages: _clearMessages,
    sendAuthenticationCompleted,
  } = useA2A(a2aConfig);

  // Use the contextId from the A2A client if available
  const effectiveContextId = contextId || propsContextId;

  // Sync history store with chat store
  useHistorySync(effectiveContextId, client);

  // Handle context changes
  useEffect(() => {
    if (propsContextId && propsContextId !== currentContextId) {
      setCurrentContextId(propsContextId);
      // Clear state when switching contexts
      clearLocalMessages();
      processedMessageIds.clear();
      messageIdMap.clear();
      sentMessageContents.clear();
    }
  }, [
    propsContextId,
    currentContextId,
    setCurrentContextId,
    clearLocalMessages,
    processedMessageIds,
    messageIdMap,
    sentMessageContents,
  ]);

  // Handle connection state changes
  useEffect(() => {
    setConnected(isConnected);
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange, setConnected]);

  // Handle typing state
  useEffect(() => {
    setTyping(isLoading, contextId);
  }, [isLoading, setTyping, contextId]);

  // Process incoming messages
  const processMessage = useCallback(
    (sdkMessage: any) => {
      const existingInternalId = messageIdMap.get(sdkMessage.id);

      // Handle streaming updates
      if (existingInternalId && sdkMessage.isStreaming) {
        updateMessage(existingInternalId, {
          content: sdkMessage.content,
          metadata: {
            ...sdkMessage.metadata,
            isStreaming: sdkMessage.isStreaming,
          },
        });
        return;
      }

      // Handle already processed messages
      if (processedMessageIds.has(sdkMessage.id)) {
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

      // Mark as processed
      processedMessageIds.add(sdkMessage.id);

      // Determine if message should be added to UI
      const shouldAddToUI = (() => {
        if (sdkMessage.role === 'assistant' || sdkMessage.role === 'system') {
          return true;
        }
        if (sdkMessage.role === 'user') {
          const isFromUI = sentMessageContents.has(sdkMessage.content);
          if (isFromUI) {
            sentMessageContents.delete(sdkMessage.content);
          }
          return !isFromUI;
        }
        return false;
      })();

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
          isStreaming: sdkMessage.isStreaming || false,
          contextId: sdkMessage.contextId || contextId,
          timestamp: sdkMessage.timestamp || new Date().toISOString(),
        };

        messageIdMap.set(sdkMessage.id, internalMessage.id);
        addMessage(internalMessage);
        onMessage?.(internalMessage);
      }
    },
    [
      messageIdMap,
      processedMessageIds,
      sentMessageContents,
      updateMessage,
      addMessage,
      onMessage,
      contextId,
    ]
  );

  // Handle incoming messages
  useEffect(() => {
    messages.forEach(processMessage);
  }, [messages, processMessage]);

  // Initialize connection
  const initialize = useCallback(async () => {
    if (typeof agentCard === 'string') {
      // For string URLs, we need to fetch the agent card first
      // For now, we'll skip connection for string URLs
      console.warn(
        'String agent URLs are not supported directly. Please provide an AgentCard object.'
      );
    } else if (agentCard) {
      await connect(agentCard);
    }
  }, [agentCard, connect]);

  // Connect on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Memoize send message function
  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) {
        return;
      }

      // Track sent message content
      sentMessageContents.add(content);

      // Create and add user message immediately
      const userMessage = createMessage(content, 'user', attachments);
      userMessage.metadata = {
        ...userMessage.metadata,
        contextId: effectiveContextId,
      };

      addMessage(userMessage);
      onMessage?.(userMessage);

      // Send through SDK
      await sdkSendMessage(content);
    },
    [sentMessageContents, effectiveContextId, addMessage, onMessage, sdkSendMessage]
  );

  // Get auth required state
  const authRequired = getAuthRequiredForContext(effectiveContextId);

  // Return memoized result
  return useMemo(
    () => ({
      // State
      messages: useChatStore.getState().messages,
      isConnected,
      isTyping: isLoading,
      agentCard: connectedAgentCard,
      contextId: effectiveContextId,
      authRequired,
      agentName: connectedAgentCard?.name || 'Agent',
      agentDescription: connectedAgentCard?.description || '',

      // Actions
      sendMessage,
      clearMessages: clearLocalMessages,
      connect: initialize,
      disconnect,
      sendAuthenticationCompleted,
      handleAuthCompleted: async () => {
        if (authRequired && effectiveContextId) {
          await sendAuthenticationCompleted();
        }
      },
      handleAuthCanceled: () => {
        // Clear auth state when canceled
        setAuthRequired(null, effectiveContextId);
      },

      // Utilities
      getTypingIndicator: () => isLoading,
      getConnectionStatus: () => isConnected,
    }),
    [
      isConnected,
      isLoading,
      connectedAgentCard,
      effectiveContextId,
      authRequired,
      sendMessage,
      clearLocalMessages,
      initialize,
      disconnect,
      sendAuthenticationCompleted,
      setAuthRequired,
    ]
  );
}
