import { useCallback, useEffect, useState, useRef } from 'react';
import { useA2A } from '../use-a2a';
import { AgentDiscovery } from '../../discovery/agent-discovery';
import type { AgentCard } from '../../types';
import type { AuthConfig, AuthRequiredHandler } from '../../client/types';
import type { Message } from '../types';
import { createMessage } from '../utils/messageUtils';
import { useChatStore } from '../store/chatStore';

interface UseChatWidgetProps {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  onAuthRequired?: AuthRequiredHandler;
  sessionKey?: string;
}

export function useChatWidget({
  agentCard,
  auth,
  onMessage,
  onConnectionChange,
  onAuthRequired,
  sessionKey,
}: UseChatWidgetProps) {
  const [initialized, setInitialized] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const messageIdMap = useRef<Map<string, string>>(new Map());
  const sentMessageContents = useRef<Set<string>>(new Set());

  const {
    addMessage,
    updateMessage,
    setConnected,
    setTyping,
    clearMessages: clearLocalMessages,
  } = useChatStore();

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
    auth
      ? {
          auth,
          persistSession: true,
          sessionKey: sessionKey || 'a2a-chat-session',
          onAuthRequired,
        }
      : {
          persistSession: true,
          sessionKey: sessionKey || 'a2a-chat-session',
          onAuthRequired,
        }
  );

  // Handle connection state changes
  useEffect(() => {
    setConnected(isConnected);
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange, setConnected]);

  // Handle typing changes
  useEffect(() => {
    setTyping(isLoading);
  }, [isLoading, setTyping]);

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
    if (!agentCard || initialized || isConnected) return;

    const connectToAgent = async () => {
      try {
        if (typeof agentCard === 'string') {
          const discovery = new AgentDiscovery();
          let resolvedAgentCard: AgentCard;

          if (agentCard.includes('/.well-known/agent.json') || agentCard.endsWith('.json')) {
            try {
              resolvedAgentCard = await discovery.fromDirect(agentCard);
            } catch (error) {
              // Fallback: fetch manually
              const response = await fetch(agentCard);
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
        setInitialized(true);
      } catch (error) {
        console.error('Failed to connect to agent:', error);
      }
    };

    connectToAgent();
  }, [agentCard, auth, initialized, isConnected, connect]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
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
        updateMessage(message.id, { status: 'error' });
        throw error;
      }
    },
    [isConnected, sdkSendMessage, addMessage, updateMessage]
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
    } catch (error) {
      console.error('Failed to send authentication completed:', error);
    }
  }, [sendAuthenticationCompleted]);

  return {
    sendMessage,
    isConnected,
    isTyping: isLoading,
    agentName: connectedAgentCard?.name || 'Agent',
    agentDescription: connectedAgentCard?.description,
    contextId,
    disconnect,
    clearSession,
    sendAuthenticationCompleted,
    handleAuthCompleted,
  };
}
