import { useEffect, useCallback } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useChatStore } from '../store/chatStore';
import type { A2AClient } from '../../client/a2a-client';
import type { Message } from '../types';
import type { TaskHistoryMessage } from '../../types';

export function useChatHistory(client: A2AClient | null) {
  const {
    contexts,
    currentContextId,
    isLoadingContexts,
    isLoadingTasks,
    fetchContexts,
    fetchTasksForContext,
    updateContext,
    getCurrentContext,
    getTasksForContext,
    getActiveContexts,
    getArchivedContexts,
    setCurrentContext,
    isContextUpdating,
  } = useHistoryStore();

  const { setMessages, clearMessages } = useChatStore();

  // Convert TaskHistoryMessage to Message format
  const convertHistoryMessageToMessage = (historyMsg: TaskHistoryMessage): Message => {
    // Extract text content from parts
    const textParts = historyMsg.parts
      .filter((part) => part.kind === 'Text' && part.text)
      .map((part) => ({
        type: 'text' as const,
        content: part.text!,
      }));

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
      content: textParts.map((p) => p.content).join('\n'),
      timestamp: new Date(), // History messages don't have timestamps
      metadata: {
        taskId: historyMsg.taskId,
        contextId: historyMsg.contextId,
        dataParts: dataParts.length > 0 ? dataParts : undefined,
      },
    };
  };

  // Load contexts on mount
  useEffect(() => {
    if (client) {
      console.log('[useChatHistory] Fetching contexts, current length:', contexts.length);
      fetchContexts(client, true).catch(console.error);
    }
  }, [client, fetchContexts]);

  // Load tasks when context changes
  useEffect(() => {
    if (client && currentContextId) {
      // Clear existing messages when switching contexts
      clearMessages();

      // Check if we already have tasks cached
      const cachedTasks = getTasksForContext(currentContextId);
      if (cachedTasks) {
        // Convert and load messages from cached tasks
        const allMessages: Message[] = [];
        cachedTasks.forEach((task) => {
          task.history.forEach((historyMsg) => {
            allMessages.push(convertHistoryMessageToMessage(historyMsg));
          });
        });
        setMessages(allMessages);
      } else {
        // Fetch tasks from server
        fetchTasksForContext(client, currentContextId)
          .then((tasks) => {
            const allMessages: Message[] = [];
            tasks.forEach((task) => {
              task.history.forEach((historyMsg) => {
                allMessages.push(convertHistoryMessageToMessage(historyMsg));
              });
            });
            setMessages(allMessages);
          })
          .catch(console.error);
      }
    }
  }, [client, currentContextId]);

  // Create a new context
  const createNewContext = useCallback(() => {
    if (!client) return;

    // Generate a new context ID (this would typically come from the server)
    const newContextId = `ctx_${Date.now()}`;
    setCurrentContext(newContextId);
    clearMessages();

    // Note: In a real implementation, you might want to create the context
    // on the server first, but since contexts are created implicitly when
    // sending the first message, we just switch to a new ID
  }, [client, setCurrentContext, clearMessages]);

  // Switch to a different context
  const switchContext = useCallback(
    (contextId: string) => {
      setCurrentContext(contextId);
    },
    [setCurrentContext]
  );

  // Archive a context
  const archiveContext = useCallback(
    async (contextId: string) => {
      if (!client) return;
      await updateContext(client, contextId, { isArchived: true });
    },
    [client, updateContext]
  );

  // Rename a context
  const renameContext = useCallback(
    async (contextId: string, newName: string) => {
      if (!client) return;
      await updateContext(client, contextId, { name: newName });
    },
    [client, updateContext]
  );

  // Get context display name
  const getContextDisplayName = useCallback((context: (typeof contexts)[0]) => {
    if (context.name) return context.name;

    // Try to get a preview from the last task
    if (context.lastTask && context.lastTask.history.length > 0) {
      const firstUserMessage = context.lastTask.history.find((msg) => msg.role === 'User');
      if (firstUserMessage) {
        const textPart = firstUserMessage.parts.find((part) => part.kind === 'Text' && part.text);
        if (textPart && textPart.text) {
          // Return first 50 characters of the message
          return textPart.text.substring(0, 50) + (textPart.text.length > 50 ? '...' : '');
        }
      }
    }

    return 'New conversation';
  }, []);

  return {
    // State
    contexts,
    currentContextId,
    currentContext: getCurrentContext(),
    activeContexts: getActiveContexts(),
    archivedContexts: getArchivedContexts(),
    isLoadingContexts,
    isLoadingTasks,

    // Actions
    createNewContext,
    switchContext,
    archiveContext,
    renameContext,
    refreshContexts: () => client && fetchContexts(client, true),

    // Helpers
    getContextDisplayName,
    isContextUpdating,
  };
}
