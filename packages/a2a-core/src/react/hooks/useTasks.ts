import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskHistory } from '../../types';
import type { A2AClient } from '../../client/a2a-client';
import { queryKeys } from './query-keys';

interface UseTasksOptions {
  contextId: string | null | undefined;
  client: A2AClient | null;
  enabled?: boolean;
}

/**
 * Hook to fetch tasks for a specific context with caching
 */
export function useTasksList({ contextId, client, enabled = true }: UseTasksOptions) {
  return useQuery({
    queryKey: queryKeys.tasksList(contextId!),
    queryFn: async () => {
      if (!client) throw new Error('A2A client not initialized');
      if (!contextId) throw new Error('Context ID is required');

      try {
        return await client.history.listTasks(contextId);
      } catch (error: any) {
        // Handle context not found gracefully
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Context not found') || errorMessage.includes('Invalid params')) {
          console.log('[useTasks] Context not found on server:', contextId);
          return [];
        }
        throw error;
      }
    },
    enabled: enabled && !!client && !!contextId,
    // Keep task data fresh more frequently than contexts
    staleTime: 30 * 1000, // 30 seconds
    // But cache for same duration
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Don't retry for non-existent contexts
    retry: (failureCount, error: any) => {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Context not found') || errorMessage.includes('Invalid params')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to prefetch tasks for a context
 */
export function usePrefetchTasks(client: A2AClient | null) {
  const queryClient = useQueryClient();

  return (contextId: string) => {
    if (!client || !contextId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.tasksList(contextId),
      queryFn: async () => {
        try {
          return await client.history.listTasks(contextId);
        } catch (error: any) {
          const errorMessage = error?.message || '';
          if (
            errorMessage.includes('Context not found') ||
            errorMessage.includes('Invalid params')
          ) {
            return [];
          }
          throw error;
        }
      },
    });
  };
}

/**
 * Hook to invalidate tasks cache for a specific context
 */
export function useInvalidateTasks() {
  const queryClient = useQueryClient();

  return (contextId?: string) => {
    if (contextId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasksList(contextId) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    }
  };
}

/**
 * Hook to get tasks from cache without fetching
 */
export function useCachedTasks(contextId: string | null | undefined) {
  const queryClient = useQueryClient();

  if (!contextId) return undefined;

  return queryClient.getQueryData<TaskHistory[]>(queryKeys.tasksList(contextId));
}
