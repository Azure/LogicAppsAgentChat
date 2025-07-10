import { useCallback, useEffect, useState, useRef } from 'react';
import { useA2A } from '@microsoft/a2achat-core/react';
import { AgentDiscovery } from '@microsoft/a2achat-core';
import type { AgentCard, AuthConfig } from '@microsoft/a2achat-core';
import type { Message } from '../types';
import { createMessage } from '../utils/messageUtils';

interface UseA2ANativeProps {
  agentCard?: string | AgentCard;
  auth?: AuthConfig;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: Message) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onUpdateMessage?: (id: string, updates: Partial<Message>) => void;
}

export function useA2ANative({
  agentCard,
  auth,
  onConnectionChange,
  onMessage,
  onTypingChange,
  onUpdateMessage,
}: UseA2ANativeProps) {
  const [initialized, setInitialized] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const isRehydrating = useRef<boolean>(true);
  const messageIdMap = useRef<Map<string, string>>(new Map()); // Map SDK message IDs to internal message IDs

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
  } = useA2A({
    auth,
    persistSession: true,
    sessionKey: 'a2a-chat-session',
  });

  // Handle connection state changes
  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  // Handle typing changes
  useEffect(() => {
    onTypingChange?.(isLoading);
  }, [isLoading, onTypingChange]);

  // Handle incoming messages from SDK
  useEffect(() => {
    if (messages.length === 0) return;

    // Process all messages that haven't been processed yet
    messages.forEach((sdkMessage) => {
      // Check if this is a streaming update for an existing message
      const existingInternalId = messageIdMap.current.get(sdkMessage.id);

      if (existingInternalId && sdkMessage.isStreaming) {
        // This is a streaming update - update the existing message
        onUpdateMessage?.(existingInternalId, {
          content: sdkMessage.content,
          metadata: {
            ...sdkMessage.metadata,
            isStreaming: sdkMessage.isStreaming,
          },
        });
        return;
      }

      // Skip if we've already processed this message as a new message
      if (processedMessageIds.current.has(sdkMessage.id)) {
        // Check if content has changed (for final update)
        if (existingInternalId && !sdkMessage.isStreaming) {
          onUpdateMessage?.(existingInternalId, {
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
      processedMessageIds.current.add(sdkMessage.id);

      // During rehydration, process all messages (user + assistant)
      // During normal operation, only process assistant messages (user messages handled by UI)
      const shouldProcessMessage = sdkMessage.role === 'assistant' || isRehydrating.current;

      if (shouldProcessMessage) {
        const internalMessage = createMessage(
          sdkMessage.content,
          sdkMessage.role === 'user' ? 'user' : 'assistant'
        );
        internalMessage.metadata = {
          ...internalMessage.metadata,
          sdkMessageId: sdkMessage.id,
          timestamp: sdkMessage.timestamp,
          isStreaming: sdkMessage.isStreaming,
        };

        // Map SDK message ID to internal message ID
        messageIdMap.current.set(sdkMessage.id, internalMessage.id);

        onMessage?.(internalMessage);
      }
    });

    // After processing initial messages, mark rehydration as complete
    if (isRehydrating.current && messages.length > 0) {
      isRehydrating.current = false;
    }
  }, [messages, onMessage, onUpdateMessage]);

  // Clear processed messages when disconnecting
  useEffect(() => {
    if (!isConnected) {
      processedMessageIds.current.clear();
      messageIdMap.current.clear();
      isRehydrating.current = true; // Reset rehydration flag for next connection
    }
  }, [isConnected]);

  // Auto-connect when agentCard is provided
  useEffect(() => {
    if (!agentCard || initialized || isConnected) return;

    const connectToAgent = async () => {
      try {
        if (typeof agentCard === 'string') {
          const discovery = new AgentDiscovery();
          let resolvedAgentCard: AgentCard;

          if (agentCard.includes('/.well-known/agent.json') || agentCard.endsWith('.json')) {
            // This is a direct URL to an agent card file
            try {
              resolvedAgentCard = await discovery.fromDirect(agentCard);
            } catch (error) {
              // Fallback: fetch manually and add missing required fields
              const response = await fetch(agentCard);
              const rawData = await response.json();

              // Add missing required fields with sensible defaults
              const enhancedAgentCard = {
                protocolVersion: '0.2.9', // Add missing protocol version
                ...rawData,
                // Ensure capabilities object has all required fields
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
            // This is a domain, use well-known URI discovery
            resolvedAgentCard = await discovery.fromWellKnownUri(agentCard);
          }

          await connect(resolvedAgentCard);
        } else {
          // Use provided AgentCard directly
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
    async (content: string, _messageId: string): Promise<void> => {
      if (!isConnected) {
        throw new Error('A2A client not connected');
      }

      try {
        await sdkSendMessage(content);
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    [isConnected, sdkSendMessage]
  );

  const clearSession = useCallback(() => {
    // Clear SDK messages
    clearMessages();
    // Clear processed message IDs
    processedMessageIds.current.clear();
    messageIdMap.current.clear();
  }, [clearMessages]);

  return {
    sendMessage,
    isConnected,
    isTyping: isLoading,
    supportsSSE: true, // SDK handles streaming internally
    agentName: connectedAgentCard?.name || 'Agent',
    currentTaskId: undefined, // SDK handles task management internally
    currentContextId: contextId, // Expose actual context ID from SDK
    isStreamActive: isLoading,
    // SDK methods
    disconnect,
    clearMessages: clearSession,
  };
}
