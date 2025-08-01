import { useState, useEffect, useCallback, useRef } from 'react';
import { A2AClientWithAutoHistory } from '@microsoft/a2achat-core';
import type { A2AClient } from '@microsoft/a2achat-core';
import { useHistoryStore } from '@microsoft/a2achat-core/react';

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastMessage: string;
  isArchived?: boolean;
  contextId: string | null;
}

export function useChatSessionsServer(agentUrl: string, apiKey?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const clientRef = useRef<A2AClient | null>(null);

  const {
    contexts,
    currentContextId,
    setCurrentContext,
    fetchContexts,
    fetchTasksForContext,
    updateContext: updateContextInStore,
    createContext,
  } = useHistoryStore();

  // Initialize client
  useEffect(() => {
    async function initClient() {
      try {
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

        // Create client with auto-history support
        const client = new A2AClientWithAutoHistory({
          agentCard,
          apiKey,
        });

        clientRef.current = client;

        // A2AClientWithAutoHistory will automatically load contexts on construction
        // Just wait a bit for it to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Now fetch contexts to update the store
        await fetchContexts(client, true);
      } catch (error) {
        console.error('[useChatSessionsServer] Error initializing client:', error);
      }
    }

    initClient();
  }, [agentUrl, apiKey, fetchContexts]);

  // Convert contexts to sessions format
  useEffect(() => {
    const sessionsFromContexts: SessionMetadata[] = contexts.map((ctx) => {
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
        name: ctx.name || lastMessage || 'New conversation',
        createdAt: Date.now(), // Server doesn't provide this
        updatedAt: Date.now(), // Server doesn't provide this
        lastMessage,
        isArchived: ctx.isArchived,
        contextId: ctx.id,
      };
    });

    setSessions(sessionsFromContexts);
    setIsLoading(false);

    // Set active session
    if (currentContextId) {
      setActiveSessionId(currentContextId);
      // Load tasks for current context if we have a client and context exists
      const contextExists = contexts.some((ctx) => ctx.id === currentContextId);
      if (clientRef.current && contextExists) {
        fetchTasksForContext(clientRef.current, currentContextId).catch((error) => {
          console.error('[useChatSessionsServer] Error loading tasks for current context:', error);
        });
      }
    } else if (sessionsFromContexts.length > 0 && !sessionsFromContexts[0].isArchived) {
      const firstSessionId = sessionsFromContexts[0].id;
      setActiveSessionId(firstSessionId);
      setCurrentContext(firstSessionId);
      // Load tasks for first session if we have a client
      if (clientRef.current) {
        fetchTasksForContext(clientRef.current, firstSessionId).catch((error) => {
          console.error('[useChatSessionsServer] Error loading tasks for first session:', error);
        });
      }
    } else if (sessionsFromContexts.length === 0 && clientRef.current) {
      // No contexts from server - create a new one on the server
      console.log('[useChatSessionsServer] No contexts found, creating new context on server');

      // Create context on the server directly here to avoid circular dependency
      createContext(clientRef.current)
        .then((newContext) => {
          console.log('[useChatSessionsServer] Created initial context on server:', newContext.id);
          setActiveSessionId(newContext.id);
        })
        .catch((error) => {
          console.error('[useChatSessionsServer] Error creating initial context:', error);

          // Fallback to local-only session if server creation fails
          const newContextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setCurrentContext(newContextId);
          setActiveSessionId(newContextId);

          const newSession: SessionMetadata = {
            id: newContextId,
            name: 'New conversation',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessage: '',
            isArchived: false,
            contextId: newContextId,
          };

          setSessions([newSession]);
        });
    }
  }, [contexts, currentContextId, setCurrentContext, fetchTasksForContext, createContext]);

  const createNewSession = useCallback(
    async (name?: string) => {
      console.log('[useChatSessionsServer] Creating new session...');

      if (!clientRef.current) {
        throw new Error('Client not initialized');
      }

      try {
        // Create context on the server
        const newContext = await createContext(clientRef.current);
        console.log('[useChatSessionsServer] Created context on server:', newContext.id);

        // The context is already added to the store and set as current by createContext
        setActiveSessionId(newContext.id);

        // The sessions list will be updated automatically when contexts update

        return { id: newContext.id };
      } catch (error) {
        console.error('[useChatSessionsServer] Error creating context:', error);

        // Fallback to local-only session if server creation fails
        const newContextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        setCurrentContext(newContextId);
        setActiveSessionId(newContextId);

        const newSession: SessionMetadata = {
          id: newContextId,
          name: name || 'New conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastMessage: '',
          isArchived: false,
          contextId: newContextId,
        };

        setSessions((prev) => [newSession, ...prev]);

        return { id: newContextId };
      }
    },
    [createContext, setCurrentContext]
  );

  const switchSession = useCallback(
    async (sessionId: string) => {
      console.log('[useChatSessionsServer] Switching to session:', sessionId);
      setActiveSessionId(sessionId);
      setCurrentContext(sessionId);

      // Only load tasks if this context exists on the server
      const existingContext = contexts.find((ctx) => ctx.id === sessionId);
      if (clientRef.current && existingContext) {
        try {
          await fetchTasksForContext(clientRef.current, sessionId);
          console.log('[useChatSessionsServer] Tasks loaded for context:', sessionId);
        } catch (error) {
          console.error('[useChatSessionsServer] Error loading tasks:', error);
        }
      } else {
        console.log(
          '[useChatSessionsServer] Skipping task fetch for local-only context:',
          sessionId
        );
      }
    },
    [contexts, setCurrentContext, fetchTasksForContext]
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      if (!clientRef.current) return;

      try {
        await updateContextInStore(clientRef.current, sessionId, { name: newName });

        // Update local state immediately for UI responsiveness
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, name: newName } : s)));
      } catch (error) {
        console.error('[useChatSessionsServer] Error renaming session:', error);
        throw error;
      }
    },
    [updateContextInStore]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!clientRef.current) return;

      try {
        // Archive the context on the server
        await updateContextInStore(clientRef.current, sessionId, { isArchived: true });

        // Update local state
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, isArchived: true } : s))
        );

        // If this was the active session, switch to another
        if (sessionId === activeSessionId) {
          const activeSessions = sessions.filter((s) => !s.isArchived && s.id !== sessionId);
          if (activeSessions.length > 0) {
            await switchSession(activeSessions[0].id);
          } else {
            await createNewSession();
          }
        }
      } catch (error) {
        console.error('[useChatSessionsServer] Error deleting session:', error);
        throw error;
      }
    },
    [updateContextInStore, activeSessionId, sessions, switchSession, createNewSession]
  );

  return {
    sessions: sessions.filter((s) => !s.isArchived), // Only return non-archived sessions
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,
    isLoading,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
  };
}
