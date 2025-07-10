import { useCallback, useEffect, useState, useRef } from 'react';
import { useA2A } from 'a2a-browser-sdk/react';
import { AgentDiscovery } from 'a2a-browser-sdk';
import type { AgentCard, AuthConfig } from 'a2a-browser-sdk';
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
  onUpdateMessage: _onUpdateMessage,
}: UseA2ANativeProps) {
  const [initialized, setInitialized] = useState(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  
  const {
    isConnected,
    isLoading,
    messages,
    agentCard: connectedAgentCard,
    connect,
    disconnect,
    sendMessage: sdkSendMessage,
    clearMessages
  } = useA2A({
    auth,
    persistSession: true,
    sessionKey: 'a2a-chat-session'
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

    // Process only new assistant messages that haven't been processed yet
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    
    assistantMessages.forEach(sdkMessage => {
      // Skip if we've already processed this message
      if (processedMessageIds.current.has(sdkMessage.id)) {
        return;
      }
      
      // Mark as processed
      processedMessageIds.current.add(sdkMessage.id);
      
      // Send to chat
      const internalMessage = createMessage(sdkMessage.content, 'assistant');
      internalMessage.metadata = {
        ...internalMessage.metadata,
        sdkMessageId: sdkMessage.id,
        timestamp: sdkMessage.timestamp
      };
      onMessage?.(internalMessage);
    });
  }, [messages, onMessage]);

  // Clear processed messages when disconnecting
  useEffect(() => {
    if (!isConnected) {
      processedMessageIds.current.clear();
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
                protocolVersion: "0.2.9", // Add missing protocol version
                ...rawData,
                // Ensure capabilities object has all required fields
                capabilities: {
                  streaming: false,
                  pushNotifications: false,
                  stateTransitionHistory: false,
                  extensions: [],
                  ...rawData.capabilities
                }
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
  }, [clearMessages]);

  return {
    sendMessage,
    isConnected,
    isTyping: isLoading,
    supportsSSE: true, // SDK handles streaming internally
    agentName: connectedAgentCard?.name || 'Agent',
    currentTaskId: undefined, // SDK handles task management internally
    currentContextId: undefined, // SDK handles context management internally
    isStreamActive: isLoading,
    // SDK methods
    disconnect,
    clearMessages: clearSession,
  };
}