import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { A2AClientQuery } from '@microsoft/a2achat-core';
import type { A2AClient } from '@microsoft/a2achat-core';
import {
  useChatHistoryQuery,
  useTasksToMessages,
  A2AQueryProvider,
  usePrefetchTasks,
  useInvalidateTasks,
} from '@microsoft/a2achat-core/react';

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastMessage: string;
  isArchived?: boolean;
  contextId: string;
}

export function useChatSessionsServerQuery(agentUrl: string, apiKey?: string) {
  const [client, setClient] = useState<A2AClient | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  const prefetchTasks = usePrefetchTasks(client);
  const invalidateTasks = useInvalidateTasks();

  // Initialize client
  useEffect(() => {
    async function initClient() {
      try {
        setIsInitializing(true);

        // Fetch agent card
        const url = agentUrl.endsWith('.json') ? agentUrl : `${agentUrl}/.well-known/agent.json`;

        const headers: HeadersInit = {};
        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch agent card: ${response.statusText}`);
        }

        const agentCard = await response.json();

        // Create client without auto-history (React Query will handle it)
        const newClient = new A2AClientQuery({
          agentCard,
          apiKey,
        });

        setClient(newClient);
      } catch (error) {
        console.error('[useChatSessionsServerQuery] Error initializing client:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    initClient();
  }, [agentUrl, apiKey]);

  // Use the React Query powered chat history hook
  const {
    contexts,
    activeContexts,
    archivedContexts,
    currentContext,
    currentTasks,
    isLoading,
    isLoadingContexts,
    isLoadingTasks,
    createContext,
    updateContext,
    archiveContext,
    renameContext,
    switchContext: switchContextBase,
    isCreatingContext,
    isUpdatingContext,
    handleContextHover,
  } = useChatHistoryQuery({
    client,
    currentContextId: activeSessionId,
    onContextChange: setActiveSessionId,
    includeArchived,
  });

  // Convert contexts to sessions format
  const sessions = useMemo<SessionMetadata[]>(() => {
    console.log('[useChatSessionsServerQuery] Converting contexts to sessions:', {
      contextsLength: contexts?.length || 0,
      includeArchived,
      activeContexts: activeContexts?.length || 0,
      archivedContexts: archivedContexts?.length || 0,
      totalContexts: (activeContexts?.length || 0) + (archivedContexts?.length || 0),
    });

    // Check if contexts is a valid array
    if (!contexts || !Array.isArray(contexts)) {
      return [];
    }

    // Contexts are already filtered by the API based on includeArchived parameter
    // Sort by createdAt (oldest first) for proper chronological order
    const sortedContexts = [...contexts].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime; // Oldest first
    });

    return sortedContexts.map((ctx) => {
      let lastMessage = '';
      if (ctx.lastTask && ctx.lastTask.history.length > 0) {
        const lastMsg = ctx.lastTask.history[ctx.lastTask.history.length - 1];
        const textPart = lastMsg.parts.find((p) => p.kind === 'Text' && p.text);
        if (textPart && textPart.text) {
          lastMessage = textPart.text.substring(0, 100) + (textPart.text.length > 100 ? '...' : '');
        }
      }

      return {
        id: ctx.id,
        name: ctx.name || 'Untitled Chat',
        createdAt: ctx.createdAt ? new Date(ctx.createdAt).getTime() : Date.now(),
        updatedAt: ctx.updatedAt ? new Date(ctx.updatedAt).getTime() : Date.now(),
        lastMessage,
        isArchived: ctx.isArchived,
        contextId: ctx.id,
      };
    });
  }, [contexts]);

  // Set initial active session
  useEffect(() => {
    if (!isLoadingContexts && !activeSessionId && contexts.length > 0) {
      // Prefer the first non-archived context, otherwise use the first context
      const firstActive = contexts.find((ctx) => !ctx.isArchived);
      const contextToActivate = firstActive || contexts[0];
      setActiveSessionId(contextToActivate.id);
    }
  }, [isLoadingContexts, activeSessionId, contexts]);

  // Create new session with optimistic updates
  const createNewSession = useCallback(
    async (name?: string) => {
      console.log('[useChatSessionsServerQuery] Creating new session...');

      try {
        // Generate default name with date and time if not provided
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
        const defaultName = name || `Chat ${dateStr} ${timeStr}`;

        const newContext = await createContext();
        console.log('[useChatSessionsServerQuery] Created context on server:', newContext.id);

        // Always set the name (either provided or generated default)
        await updateContext(newContext.id, { name: defaultName });

        return { id: newContext.id };
      } catch (error) {
        console.error('[useChatSessionsServerQuery] Error creating context:', error);
        throw error;
      }
    },
    [createContext, updateContext]
  );

  // Switch session with prefetching
  const switchSession = useCallback(
    async (sessionId: string) => {
      console.log('[useChatSessionsServerQuery] Switching to session:', sessionId);

      // Prefetch tasks for better UX
      prefetchTasks(sessionId);

      // Switch context
      await switchContextBase(sessionId);
    },
    [switchContextBase, prefetchTasks]
  );

  // Delete session (archive)
  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await archiveContext(sessionId);

        // If this was the active session, switch to another
        if (sessionId === activeSessionId) {
          const remainingSessions = sessions.filter((s) => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            await switchSession(remainingSessions[0].id);
          } else {
            await createNewSession();
          }
        }

        // Invalidate tasks cache for the archived context
        invalidateTasks(sessionId);
      } catch (error) {
        console.error('[useChatSessionsServerQuery] Error deleting session:', error);
        throw error;
      }
    },
    [archiveContext, activeSessionId, sessions, switchSession, createNewSession, invalidateTasks]
  );

  // Convert current tasks to messages
  const currentMessages = useTasksToMessages(currentTasks);

  // Toggle archived visibility
  const toggleIncludeArchived = useCallback(() => {
    setIncludeArchived((prev) => !prev);
  }, []);

  return {
    // Sessions data
    sessions,
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,

    // Current session data
    currentMessages,
    currentTasks,

    // Loading states
    isLoading: isInitializing || isLoading,
    isLoadingContexts,
    isLoadingTasks,
    isCreatingSession: isCreatingContext,
    isUpdatingSession: isUpdatingContext,

    // Actions
    createNewSession,
    switchSession,
    renameSession: renameContext,
    deleteSession,

    // Prefetch on hover for better UX
    onSessionHover: handleContextHover,

    // Archived state
    includeArchived,
    toggleIncludeArchived,

    // Total contexts info - check both active and archived contexts
    hasAnyContexts: (activeContexts?.length || 0) + (archivedContexts?.length || 0) > 0,

    // Client instance
    client,
  };
}
