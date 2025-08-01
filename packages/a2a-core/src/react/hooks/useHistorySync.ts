import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useTasksList } from './useTasks';
import type { Message } from '../types';
import type { TaskHistoryMessage } from '../../types';
import type { A2AClient } from '../../client/a2a-client';

/**
 * Hook that syncs React Query task data with chat store
 * This ensures that when contexts are loaded from the server,
 * the messages are displayed in the chat UI
 */
export function useHistorySync(contextId?: string, client?: A2AClient | null) {
  const { setMessages, clearMessages } = useChatStore();

  // Try to get client from context if available
  let effectiveClient = client;
  try {
    // Import dynamically to avoid circular dependencies
    const { useA2AClient } = require('../providers/A2AClientProvider');
    const context = useA2AClient();
    if (context?.client) {
      effectiveClient = context.client;
      console.log('[useHistorySync] Using client from context provider');
    }
  } catch (error) {
    // Context not available, use passed client
    console.log('[useHistorySync] Client context not available, using passed client:', !!client);
  }

  // Use React Query to fetch tasks
  const {
    data: tasks,
    isLoading,
    isFetching,
    refetch,
  } = useTasksList({
    contextId: contextId || null,
    client: effectiveClient || null,
    enabled: !!contextId && !!effectiveClient,
  });

  console.log('[useHistorySync] Query state:', {
    contextId,
    tasksLoading: isLoading,
    tasksFetching: isFetching,
    tasksCount: tasks?.length || 0,
    hasClient: !!effectiveClient,
    clientType: effectiveClient?.constructor?.name,
  });

  // Force refetch when context changes
  useEffect(() => {
    if (contextId && effectiveClient) {
      console.log('[useHistorySync] Context changed, refetching tasks for:', contextId);
      refetch();
    }
  }, [contextId, effectiveClient, refetch]);

  // Convert TaskHistoryMessage to Message format
  const convertHistoryMessageToMessage = (historyMsg: TaskHistoryMessage): Message => {
    // Extract text content from parts
    const textParts = historyMsg.parts
      .filter((part) => part.kind === 'Text' && part.text)
      .map((part) => part.text!)
      .join('\n');

    // Extract data parts if any
    const dataParts = historyMsg.parts
      .filter((part) => part.kind === 'Data' && part.data)
      .map((part) => ({
        type: 'structured' as const,
        data: part.data,
      }));

    return {
      id: historyMsg.messageId,
      sender: historyMsg.role === 'Agent' ? 'assistant' : 'user',
      content: textParts,
      timestamp: new Date(), // History messages don't have timestamps
      metadata: {
        taskId: historyMsg.taskId,
        contextId: historyMsg.contextId,
        dataParts: dataParts.length > 0 ? dataParts : undefined,
      },
    };
  };

  // Sync messages when context changes or tasks are loaded
  useEffect(() => {
    // Clear messages immediately when context changes
    if (!contextId) {
      console.log('[useHistorySync] No context ID, clearing messages');
      clearMessages();
      return;
    }

    // Wait for initial load to complete
    if (isLoading) {
      console.log('[useHistorySync] Initial load in progress for context:', contextId);
      return;
    }

    console.log('[useHistorySync] Syncing messages for context:', contextId);
    console.log('[useHistorySync] Tasks from React Query:', tasks);

    if (tasks && tasks.length > 0) {
      // Tasks from the API are already in reverse chronological order (newest first)
      // We need to reverse them to get chronological order (oldest first)
      const sortedTasks = [...tasks].reverse();

      console.log(
        '[useHistorySync] Processing',
        tasks.length,
        'tasks (reversing to chronological order)'
      );

      // Convert all history messages to chat messages, maintaining order
      const allMessages: Message[] = [];

      sortedTasks.forEach((task) => {
        console.log(
          '[useHistorySync] Processing task:',
          task.id,
          'with',
          task.history.length,
          'messages'
        );

        // IMPORTANT: The API returns messages within each task in reverse chronological order (newest first)
        // We need to reverse them to get chronological order (oldest first)
        const chronologicalHistory = [...task.history].reverse();

        chronologicalHistory.forEach((historyMsg) => {
          const message = convertHistoryMessageToMessage(historyMsg);
          allMessages.push(message);
        });
      });

      console.log(
        '[useHistorySync] Setting',
        allMessages.length,
        'messages in chat store (already in order)'
      );
      // Set messages in chat store - no need to sort again as they're already in chronological order
      setMessages(allMessages);
    } else {
      console.log('[useHistorySync] No tasks found for context:', contextId);
      // Clear messages if no tasks found
      clearMessages();
    }
  }, [contextId, tasks, isLoading, setMessages, clearMessages]);
}
