import { useCallback } from 'react';
import { useA2ANative } from './useA2ANative';
import { useChatStore } from '../store/chatStore';
import type { Message, Attachment } from '../types';
import type { AgentCard, AuthConfig } from 'a2a-browser-sdk';
import { createMessage } from '../utils/messageUtils';

interface UseChatConnectionProps {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useChatConnection({
  agentCard,
  auth,
  onMessage,
  onConnectionChange,
}: UseChatConnectionProps) {
  const {
    addMessage,
    updateMessage,
    setConnected,
    setTyping,
    clearMessages: clearLocalMessages,
  } = useChatStore();

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: Message) => {
      addMessage(message);
      onMessage?.(message);
    },
    [addMessage, onMessage]
  );

  // Handle connection changes
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setConnected(connected);
      onConnectionChange?.(connected);
    },
    [setConnected, onConnectionChange]
  );

  // Handle typing changes
  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      setTyping(isTyping);
    },
    [setTyping]
  );

  // Initialize A2A connection
  const a2aClient = useA2ANative({
    agentCard,
    auth,
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onTypingChange: handleTypingChange,
    onUpdateMessage: updateMessage,
  });

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      const message = createMessage(content, 'user', attachments);
      addMessage(message);

      try {
        if (!a2aClient.isConnected) {
          throw new Error('Not connected to agent');
        }

        // Send via A2A
        await a2aClient.sendMessage(content, message.id);
        updateMessage(message.id, { status: 'sent' });
      } catch (error) {
        console.error('Error sending message:', error);
        updateMessage(message.id, { status: 'error' });
      }
    },
    [a2aClient, addMessage, updateMessage]
  );

  const clearSession = useCallback(() => {
    // Clear local messages
    clearLocalMessages();
    // Clear SDK messages
    a2aClient.clearMessages();
  }, [clearLocalMessages, a2aClient]);

  return {
    isConnected: a2aClient.isConnected,
    agentName: a2aClient.agentName,
    sendMessage,
    clearSession,
  };
}
