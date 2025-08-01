import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useContextsList, useCreateContext, useUpdateContext } from './useContexts';
import { useTasksList, usePrefetchTasks } from './useTasks';
import type { A2AClient } from '../../client/a2a-client';
import type { TaskHistory } from '../../types';
import { queryKeys } from './query-keys';

interface UseChatHistoryOptions {
  client: A2AClient | null;
  currentContextId?: string | null;
  onContextChange?: (contextId: string) => void;
  includeArchived?: boolean;
}

/**
 * High-level hook that combines contexts and tasks management
 * with optimistic updates and caching
 */
export function useChatHistoryQuery({
  client,
  currentContextId,
  onContextChange,
  includeArchived = false,
}: UseChatHistoryOptions) {
  const queryClient = useQueryClient();
  const prefetchTasks = usePrefetchTasks(client);

  // Fetch contexts list
  const {
    data: contexts = [],
    isLoading: isLoadingContexts,
    error: contextsError,
    refetch: refetchContexts,
  } = useContextsList({
    client,
    params: { includeLastTask: true, limit: 50, includeArchived },
  });

  // Fetch tasks for current context
  const {
    data: currentTasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasksList({
    contextId: currentContextId,
    client,
    enabled: !!currentContextId && contexts.some((ctx) => ctx.id === currentContextId),
  });

  // Create context mutation
  const createContextMutation = useCreateContext({
    client,
    onSuccess: (newContext) => {
      console.log('[useChatHistory] Context created:', newContext.id);
      onContextChange?.(newContext.id);
      // Prefetch empty tasks for the new context
      queryClient.setQueryData(queryKeys.tasksList(newContext.id), []);
    },
  });

  // Update context mutation
  const updateContextMutation = useUpdateContext({
    client,
    onSuccess: (updatedContext) => {
      console.log('[useChatHistory] Context updated:', updatedContext.id);
    },
  });

  // Computed values
  const activeContexts = useMemo(() => contexts.filter((ctx) => !ctx.isArchived), [contexts]);

  const archivedContexts = useMemo(() => contexts.filter((ctx) => ctx.isArchived), [contexts]);

  const currentContext = useMemo(
    () => contexts.find((ctx) => ctx.id === currentContextId),
    [contexts, currentContextId]
  );

  // Prefetch tasks when hovering over contexts (for better UX)
  const handleContextHover = (contextId: string) => {
    prefetchTasks(contextId);
  };

  // Create a new context
  const createContext = async (message?: any, metadata?: any) => {
    return createContextMutation.mutateAsync({ message, metadata });
  };

  // Update a context
  const updateContext = async (
    contextId: string,
    updates: { name?: string; isArchived?: boolean }
  ) => {
    return updateContextMutation.mutateAsync({
      Id: contextId,
      Name: updates.name,
      IsArchived: updates.isArchived,
    });
  };

  // Archive a context (convenience method)
  const archiveContext = async (contextId: string) => {
    return updateContext(contextId, { isArchived: true });
  };

  // Rename a context (convenience method)
  const renameContext = async (contextId: string, name: string) => {
    return updateContext(contextId, { name });
  };

  // Switch to a different context
  const switchContext = async (contextId: string) => {
    console.log('[useChatHistory] Switching to context:', contextId);
    onContextChange?.(contextId);

    // Prefetch tasks if not already cached
    const cachedTasks = queryClient.getQueryData(queryKeys.tasksList(contextId));
    if (!cachedTasks) {
      prefetchTasks(contextId);
    }
  };

  // Refresh all data
  const refresh = async () => {
    await Promise.all([refetchContexts(), currentContextId ? refetchTasks() : Promise.resolve()]);
  };

  return {
    // Data
    contexts,
    activeContexts,
    archivedContexts,
    currentContext,
    currentTasks,

    // Loading states
    isLoading: isLoadingContexts || isLoadingTasks,
    isLoadingContexts,
    isLoadingTasks,

    // Errors
    error: contextsError || tasksError,
    contextsError,
    tasksError,

    // Mutations
    createContext,
    updateContext,
    archiveContext,
    renameContext,
    switchContext,

    // Actions
    refresh,
    handleContextHover,

    // Mutation states
    isCreatingContext: createContextMutation.isPending,
    isUpdatingContext: updateContextMutation.isPending,
  };
}

/**
 * Hook to convert task history messages to chat UI messages
 */
export function useTasksToMessages(tasks: TaskHistory[]) {
  return useMemo(() => {
    const messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }> = [];

    // Check if tasks is a valid array
    if (!tasks || !Array.isArray(tasks)) {
      return messages;
    }

    // Reverse tasks order (API returns newest first, we want oldest first)
    const reversedTasks = [...tasks].reverse();

    reversedTasks.forEach((task, taskIndex) => {
      // Ensure task and task.history exist
      if (!task || !task.history || !Array.isArray(task.history)) {
        return;
      }

      // Reverse history within each task (API returns newest first)
      const reversedHistory = [...task.history].reverse();

      reversedHistory.forEach((historyMsg, index) => {
        if (!historyMsg || !historyMsg.parts || !Array.isArray(historyMsg.parts)) {
          return;
        }

        const textPart = historyMsg.parts.find((part) => part && part.kind === 'Text' && part.text);

        if (textPart && textPart.text) {
          messages.push({
            id: `${task.id}-${index}`,
            role: historyMsg.role === 'User' ? 'user' : 'assistant',
            content: textPart.text,
            // Create timestamps based on order to maintain chronological sequence
            timestamp: new Date(
              Date.now() -
                (reversedTasks.length - taskIndex) * 1000 -
                (reversedHistory.length - index) * 100
            ),
          });
        }
      });
    });

    return messages;
  }, [tasks]);
}
