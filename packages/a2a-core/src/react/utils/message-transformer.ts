/**
 * Transforms storage messages to UI messages
 */
import type { Message as StorageMessage } from '../../api/history-types';
import type { Message as UIMessage } from '../types';

/**
 * Transform a storage message to UI message format
 */
export const transformStorageMessageToUI = (storageMessage: StorageMessage): UIMessage => {
  // Extract text content from storage message parts
  const textContent = storageMessage.content
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n');

  return {
    id: storageMessage.id,
    content: textContent,
    timestamp: storageMessage.timestamp,
    sender: storageMessage.role === 'assistant' ? 'assistant' : 'user',
    // Preserve contextId in metadata for session continuity
    metadata: storageMessage.contextId ? { contextId: storageMessage.contextId } : undefined,
  };
};

/**
 * Transform array of storage messages to UI messages
 */
export const transformStorageMessagesToUI = (storageMessages: StorageMessage[]): UIMessage[] => {
  return storageMessages.map(transformStorageMessageToUI);
};

/**
 * Transform UI message to storage message format
 */
export const transformUIMessageToStorage = (
  uiMessage: UIMessage,
  contextId: string
): StorageMessage => {
  return {
    id: uiMessage.id,
    role: uiMessage.sender === 'assistant' ? 'assistant' : 'user',
    content: [
      {
        type: 'text',
        text: uiMessage.content,
      },
    ],
    timestamp: uiMessage.timestamp,
    contextId,
  };
};
