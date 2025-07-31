import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Message } from '@microsoft/a2achat-core/react';
import { SessionStorageAPI, Context, Task } from '../api/sessionStorage';

export interface ServerSession {
  id: string;
  contextId: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}

export interface SessionMetadata {
  id: string;
  contextId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
  isArchived?: boolean;
}

// Convert server messages to SDK format
function convertServerMessage(serverMessage: Task['history'][0]): Message {
  const content = serverMessage.parts
    .filter((part) => part.kind === 'Text')
    .map((part) => part.text)
    .join('\n');

  return {
    id: serverMessage.messageId,
    content,
    role: serverMessage.role.toLowerCase() as 'user' | 'assistant',
    timestamp: new Date().toISOString(), // Server doesn't provide timestamp in history
  };
}

// Convert Context to SessionMetadata
function contextToSessionMetadata(context: Context, lastMessage?: string): SessionMetadata {
  return {
    id: context.id,
    contextId: context.id,
    name: context.name || `Chat ${context.id.slice(0, 8)}`,
    createdAt: Date.now(), // Server doesn't provide timestamps
    updatedAt: Date.now(),
    lastMessage,
    isArchived: context.isArchived,
  };
}

// Convert Context and Tasks to ServerSession
function contextAndTasksToSession(context: Context, tasks: Task[]): ServerSession {
  const messages: Message[] = [];

  // Flatten all messages from all tasks
  tasks.forEach((task) => {
    task.history.forEach((historyMessage) => {
      messages.push(convertServerMessage(historyMessage));
    });
  });

  return {
    id: context.id,
    contextId: context.id,
    name: context.name || `Chat ${context.id.slice(0, 8)}`,
    messages,
    createdAt: Date.now(), // Server doesn't provide timestamps
    updatedAt: Date.now(),
    isArchived: context.isArchived,
  };
}

export function useServerSessions(agentUrl: string) {
  const queryClient = useQueryClient();
  const api = useMemo(() => (agentUrl ? new SessionStorageAPI(agentUrl) : null), [agentUrl]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Query for all contexts (sessions)
  const {
    data: contexts = [],
    isLoading: isLoadingContexts,
    refetch: refetchContexts,
  } = useQuery({
    queryKey: ['contexts', agentUrl],
    queryFn: () => (api ? api.listContexts({ includeLastTask: false }) : Promise.resolve([])),
    staleTime: 30000, // 30 seconds
    enabled: !!api,
  });

  // Query for tasks of active session
  const { data: activeTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', agentUrl, activeSessionId],
    queryFn: () => (activeSessionId && api ? api.listTasks(activeSessionId) : Promise.resolve([])),
    enabled: !!activeSessionId && !!api,
    staleTime: 10000, // 10 seconds
  });

  // Mutation for updating context with optimistic updates
  const updateContextMutation = useMutation({
    mutationFn: (params: { contextId: string; name?: string; isArchived?: boolean }) =>
      api ? api.updateContext(params) : Promise.reject(new Error('API not initialized')),
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['contexts', agentUrl] });

      // Snapshot the previous value
      const previousContexts = queryClient.getQueryData<Context[]>(['contexts', agentUrl]);

      // Optimistically update the cache
      queryClient.setQueryData(['contexts', agentUrl], (old: Context[] = []) =>
        old.map((ctx) =>
          ctx.id === params.contextId ? { ...ctx, ...params, id: params.contextId } : ctx
        )
      );

      // Return a context containing the snapshot
      return { previousContexts };
    },
    onError: (err, params, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousContexts) {
        queryClient.setQueryData(['contexts', agentUrl], context.previousContexts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['contexts', agentUrl] });
    },
  });

  // Convert contexts to session metadata
  const sessions = useMemo((): SessionMetadata[] => {
    return contexts
      .filter((ctx) => !ctx.isArchived) // Filter out archived by default
      .map((ctx) => contextToSessionMetadata(ctx))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [contexts]);

  // Get active session
  const activeSession = useMemo((): ServerSession | null => {
    if (!activeSessionId) return null;

    const context = contexts.find((ctx) => ctx.id === activeSessionId);
    if (!context) return null;

    return contextAndTasksToSession(context, activeTasks);
  }, [activeSessionId, contexts, activeTasks]);

  // Switch to a different session
  const switchSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      // Prefetch tasks for the new session
      if (api) {
        await queryClient.prefetchQuery({
          queryKey: ['tasks', agentUrl, sessionId],
          queryFn: () => api.listTasks(sessionId),
        });
      }
    },
    [agentUrl, api, queryClient]
  );

  // Create a new session
  const createNewSession = useCallback(async (name?: string) => {
    // Since the server doesn't have a create endpoint, we'll need to:
    // 1. Start a new conversation which will create a context
    // 2. Optionally rename it
    // For now, we'll just create a placeholder and let the first message create the actual context
    const tempId = `temp_${Date.now()}`;
    const newSession: ServerSession = {
      id: tempId,
      contextId: tempId,
      name: name || `New Chat ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveSessionId(tempId);
    return newSession;
  }, []);

  // Update session messages (this happens when new messages are sent/received)
  const updateSessionMessages = useCallback(
    async (messages: Message[], contextId?: string) => {
      if (!activeSessionId) return;

      // If we have a real contextId now (from server response), update our active session
      if (contextId && activeSessionId.startsWith('temp_')) {
        setActiveSessionId(contextId);
        // Refetch contexts to include the new one
        await refetchContexts();
      }

      // Since messages are stored on the server, we don't need to update them locally
      // Just invalidate the queries to refetch if needed
      queryClient.invalidateQueries({
        queryKey: ['tasks', agentUrl, contextId || activeSessionId],
      });

      // Also invalidate contexts in case the last message preview needs updating
      queryClient.invalidateQueries({ queryKey: ['contexts', agentUrl] });
    },
    [activeSessionId, agentUrl, queryClient, refetchContexts]
  );

  // Rename a session
  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      await updateContextMutation.mutateAsync({
        contextId: sessionId,
        name: newName,
      });
    },
    [updateContextMutation]
  );

  // Delete (archive) a session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      await updateContextMutation.mutateAsync({
        contextId: sessionId,
        isArchived: true,
      });

      // If we deleted the active session, switch to another one
      if (sessionId === activeSessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          await switchSession(remainingSessions[0].id);
        } else {
          await createNewSession();
        }
      }
    },
    [updateContextMutation, activeSessionId, sessions, switchSession, createNewSession]
  );

  // Initialize: set active session on first load
  const isLoading = isLoadingContexts || (activeSessionId && isLoadingTasks);

  // Auto-select first session if none selected
  if (!isLoading && !activeSessionId && sessions.length > 0 && api) {
    setActiveSessionId(sessions[0].id);
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    updateSessionMessages,
    renameSession,
    deleteSession,
    refreshSessions: refetchContexts,
    isLoading,
  };
}
