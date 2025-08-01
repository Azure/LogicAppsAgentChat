import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Context, ListContextsParams, UpdateContextParams } from '../../types';
import type { A2AClient } from '../../client/a2a-client';
import { queryKeys } from './query-keys';

interface UseContextsOptions {
  client: A2AClient | null;
  params?: ListContextsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch contexts list with caching and automatic refetching
 */
export function useContextsList({ client, params, enabled = true }: UseContextsOptions) {
  return useQuery({
    queryKey: queryKeys.contextsList(params),
    queryFn: async () => {
      if (!client) throw new Error('A2A client not initialized');
      return client.history.listContexts(params);
    },
    enabled: enabled && !!client,
  });
}

interface UseCreateContextOptions {
  client: A2AClient | null;
  onSuccess?: (context: Context) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new context with optimistic updates
 */
export function useCreateContext({ client, onSuccess, onError }: UseCreateContextOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, metadata }: { message?: any; metadata?: any }) => {
      if (!client) throw new Error('A2A client not initialized');
      return client.history.createContext(message, metadata);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contexts() });

      // Snapshot the previous value
      const previousContexts = queryClient.getQueryData<Context[]>(queryKeys.contextsList());

      // Optimistically update to the new value
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const optimisticContext: Context = {
        id: `temp_${Date.now()}`,
        name: `Chat ${dateStr} ${timeStr}`,
        isArchived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      queryClient.setQueryData<Context[]>(queryKeys.contextsList(), (old = []) => [
        optimisticContext,
        ...old,
      ]);

      // Return a context with a rollback function
      return { previousContexts, optimisticContext };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousContexts) {
        queryClient.setQueryData(queryKeys.contextsList(), context.previousContexts);
      }
      onError?.(err as Error);
    },
    onSuccess: (data, _variables, context) => {
      // Replace the optimistic context with the real one
      queryClient.setQueryData<Context[]>(queryKeys.contextsList(), (old = []) => {
        // Remove the optimistic context and add the real one
        const filtered = old.filter((ctx) => ctx.id !== context?.optimisticContext.id);
        return [data, ...filtered];
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts() });
      onSuccess?.(data);
    },
  });
}

interface UseUpdateContextOptions {
  client: A2AClient | null;
  onSuccess?: (context: Context) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to update a context with optimistic updates
 */
export function useUpdateContext({ client, onSuccess, onError }: UseUpdateContextOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateContextParams) => {
      if (!client) throw new Error('A2A client not initialized');
      return client.history.updateContext(params);
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contexts() });

      // Snapshot the previous value
      const previousContexts = queryClient.getQueryData<Context[]>(queryKeys.contextsList());

      // Optimistically update the context
      queryClient.setQueryData<Context[]>(queryKeys.contextsList(), (old = []) =>
        old.map((ctx) =>
          ctx.id === params.Id
            ? {
                ...ctx,
                ...(params.Name !== undefined && { name: params.Name }),
                ...(params.IsArchived !== undefined && { isArchived: params.IsArchived }),
              }
            : ctx
        )
      );

      // Also update any specific context detail query
      const previousContext = queryClient.getQueryData<Context>(queryKeys.contextDetail(params.Id));

      if (previousContext) {
        queryClient.setQueryData<Context>(queryKeys.contextDetail(params.Id), {
          ...previousContext,
          ...(params.Name !== undefined && { name: params.Name }),
          ...(params.IsArchived !== undefined && { isArchived: params.IsArchived }),
        });
      }

      return { previousContexts, previousContext };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContexts) {
        queryClient.setQueryData(queryKeys.contextsList(), context.previousContexts);
      }
      if (context?.previousContext) {
        queryClient.setQueryData(queryKeys.contextDetail(variables.Id), context.previousContext);
      }
      onError?.(err as Error);
    },
    onSuccess: (data) => {
      // Update with the server response
      queryClient.setQueryData<Context[]>(queryKeys.contextsList(), (old = []) =>
        old.map((ctx) => (ctx.id === data.id ? data : ctx))
      );

      // Update the specific context
      queryClient.setQueryData(queryKeys.contextDetail(data.id), data);

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts() });
      onSuccess?.(data);
    },
  });
}

/**
 * Hook to get a specific context from the cache
 */
export function useContextDetail(contextId: string | null, client: A2AClient | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.contextDetail(contextId!),
    queryFn: async () => {
      // First try to get from the list cache
      const contexts = queryClient.getQueryData<Context[]>(queryKeys.contextsList());
      const cachedContext = contexts?.find((ctx) => ctx.id === contextId);

      if (cachedContext) {
        return cachedContext;
      }

      // If not in cache, we'd need a specific endpoint to fetch a single context
      // For now, fetch the list and find the context
      if (!client) throw new Error('A2A client not initialized');
      const allContexts = await client.history.listContexts();
      const context = allContexts.find((ctx) => ctx.id === contextId);

      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      return context;
    },
    enabled: !!contextId && !!client,
  });
}

// Helper to prefetch contexts
export function usePrefetchContexts(client: A2AClient | null) {
  const queryClient = useQueryClient();

  return () => {
    if (!client) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.contextsList({ includeLastTask: true, limit: 50 }),
      queryFn: () => client.history.listContexts({ includeLastTask: true, limit: 50 }),
    });
  };
}
