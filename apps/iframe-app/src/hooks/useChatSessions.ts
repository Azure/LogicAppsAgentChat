import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionManager, ChatSession, SessionMetadata } from '../utils/sessionManager';
import { Message } from '@microsoft/a2achat-core/react';
import { getAgentMessagesStorageKey, getAgentContextStorageKey } from '@microsoft/a2achat-core';
import { ServerHistoryService } from '../services/ServerHistoryService';
import { ServerSyncManager } from '../services/ServerSyncManager';
import type { SyncStatus } from '../services/types';

export interface UseChatSessionsOptions {
  enableServerSync?: boolean;
  syncInterval?: number;
  debugMode?: boolean;
}

export function useChatSessions(agentUrl: string, options: UseChatSessionsOptions = {}) {
  const sessionManager = useRef(SessionManager.getInstance(agentUrl));
  const syncManagerRef = useRef<ServerSyncManager | null>(null);
  const loadSessionsRef = useRef<() => Promise<void>>();
  const syncedThreadsRef = useRef<Set<string>>(new Set()); // Track which threads have been synced
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [syncVersion, setSyncVersion] = useState(0); // Force re-render after sync - currently unused

  // Server sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    pendingChanges: 0,
  });
  const [isServerSyncEnabled, setIsServerSyncEnabled] = useState(options.enableServerSync || false);

  // Initialize server sync if enabled
  useEffect(() => {
    if (options.enableServerSync && agentUrl) {
      // agentUrl should be the base agent URL (e.g., /api/agents/wreport2)
      // not the .well-known/agent.json URL
      console.log('[useChatSessions] Initializing server sync with agent URL:', agentUrl);
      const historyService = new ServerHistoryService(agentUrl);
      const syncManager = new ServerSyncManager(historyService, sessionManager.current, {
        syncInterval: options.syncInterval,
        debugMode: options.debugMode,
      });

      // Set up event listeners
      syncManager.on('syncStart', () => {
        setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));
      });

      syncManager.on('syncComplete', () => {
        console.log('[useChatSessions] Sync complete, refreshing sessions...');
        setSyncStatus((prev) => ({
          ...prev,
          status: 'idle',
          lastSyncTime: new Date(),
          pendingChanges: 0,
        }));
        // Refresh sessions after sync - use ref to get latest function
        if (loadSessionsRef.current) {
          loadSessionsRef.current();
        }
      });

      syncManager.on('syncError', (error) => {
        setSyncStatus((prev) => ({
          ...prev,
          status: 'error',
          error,
        }));
      });

      syncManager.on('offline', () => {
        setSyncStatus((prev) => ({ ...prev, status: 'offline' }));
      });

      syncManager.on('online', () => {
        setSyncStatus((prev) => ({ ...prev, status: 'idle' }));
      });

      // DON'T start auto-sync here - we'll manually trigger it
      // sessionManager.current.enableServerSync(syncManager);
      syncManagerRef.current = syncManager;
      setIsServerSyncEnabled(true);

      // Perform a full sync of all contexts on initial mount
      console.log('[useChatSessions] Starting full sync of all threads on initial load...');
      syncManager
        .syncAllThreads()
        .then(() => {
          console.log('[useChatSessions] Initial full sync completed successfully');
          // Mark all synced threads as synced
          sessionManager.current.getAllSessions().then((sessions) => {
            sessions.forEach((session) => {
              if (session.contextId) {
                syncedThreadsRef.current.add(session.contextId);
              }
            });
          });
        })
        .catch((error) => {
          console.error('[useChatSessions] Initial full sync failed:', error);
        });

      return () => {
        syncManager.destroy();
        // sessionManager.current.disableServerSync();
        syncManagerRef.current = null;
      };
    }
  }, [agentUrl, options.enableServerSync, options.syncInterval, options.debugMode]);

  const loadSessions = useCallback(async () => {
    try {
      console.log('[useChatSessions] Loading sessions, serverSync enabled:', isServerSyncEnabled);
      setIsLoading(true);
      // Use sync-aware method if server sync is enabled
      const allSessions = isServerSyncEnabled
        ? await sessionManager.current.getAllSessionsWithSync()
        : await sessionManager.current.getAllSessions();
      console.log(
        '[useChatSessions] Loaded sessions:',
        allSessions.map((s) => ({
          id: s.id,
          contextId: s.contextId,
          name: s.name,
        }))
      );
      setSessions(allSessions);

      // Get active session or create one if none exists
      let currentActiveId = await sessionManager.current.getActiveSessionId();

      if (!currentActiveId || !(await sessionManager.current.getSession(currentActiveId))) {
        // Create a new session if none exists
        if (allSessions.length === 0) {
          const newSession = await sessionManager.current.createSession();
          currentActiveId = newSession.id;
          setSessions([
            ...allSessions,
            {
              id: newSession.id,
              contextId: newSession.contextId,
              name: newSession.name,
              createdAt: newSession.createdAt,
              updatedAt: newSession.updatedAt,
              lastMessage: '',
            },
          ]);
        } else {
          // Use the most recent session
          currentActiveId = allSessions[0].id;
          await sessionManager.current.setActiveSession(currentActiveId);
        }
      }

      setActiveSessionId(currentActiveId);
      const session = await sessionManager.current.getSession(currentActiveId);
      setActiveSession(session);

      // Load IndexedDB messages into localStorage for the active session
      if (session) {
        const sessionKey = `a2a-chat-session-${currentActiveId}`;
        const messagesStorageKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
        const contextStorageKey = getAgentContextStorageKey(agentUrl, sessionKey);

        // Clear and reload from IndexedDB to avoid duplicates
        localStorage.removeItem(messagesStorageKey);
        localStorage.removeItem(contextStorageKey);

        if (session.messages && session.messages.length > 0) {
          console.log(
            `[useChatSessions] Initial load: loading ${session.messages.length} messages from IndexedDB`
          );

          const transformedMessages = session.messages.map((msg) => ({
            id: msg.id,
            role:
              msg.sender === 'assistant'
                ? 'assistant'
                : msg.sender === 'system'
                  ? 'system'
                  : 'user',
            content: msg.content,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
            isStreaming: false,
            metadata: msg.metadata || {},
          }));

          localStorage.setItem(messagesStorageKey, JSON.stringify(transformedMessages));

          if (session.contextId) {
            localStorage.setItem(contextStorageKey, session.contextId);
          }

          console.log(
            `[useChatSessions] Initial load: stored ${transformedMessages.length} messages`
          );
        }
      }
    } catch (error) {
      console.error('[useChatSessions] Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isServerSyncEnabled]);

  // Update the ref whenever loadSessions changes
  useEffect(() => {
    loadSessionsRef.current = loadSessions;
  }, [loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchSession = useCallback(
    async (sessionId: string) => {
      try {
        console.log(`[useChatSessions] Switching to session ${sessionId}`);

        // First, get the session data
        const session = await sessionManager.current.getSession(sessionId);

        // CRITICAL: Merge IndexedDB messages with existing localStorage messages
        // This preserves new messages that were sent but not yet synced to server
        if (session) {
          const sessionKey = `a2a-chat-session-${sessionId}`;
          const messagesStorageKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
          const contextStorageKey = getAgentContextStorageKey(agentUrl, sessionKey);

          // Clear localStorage first to avoid duplicates
          localStorage.removeItem(messagesStorageKey);
          localStorage.removeItem(contextStorageKey);

          if (session.messages && session.messages.length > 0) {
            console.log(
              `[useChatSessions] Loading ${session.messages.length} messages from IndexedDB`
            );

            // Transform messages from IndexedDB to the format expected by useA2A
            const transformedMessages = session.messages.map((msg) => ({
              id: msg.id,
              role:
                msg.sender === 'assistant'
                  ? 'assistant'
                  : msg.sender === 'system'
                    ? 'system'
                    : 'user',
              content: msg.content,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
              isStreaming: false,
              metadata: msg.metadata || {},
            }));

            // Store messages in localStorage
            localStorage.setItem(messagesStorageKey, JSON.stringify(transformedMessages));

            // Also store the contextId if available
            if (session.contextId) {
              localStorage.setItem(contextStorageKey, session.contextId);
            }

            console.log(
              `[useChatSessions] Stored ${transformedMessages.length} messages in localStorage`
            );
          } else {
            console.log(`[useChatSessions] No messages to prepare for session ${sessionId}`);
          }
        }

        // Update the active session immediately without flickering
        await sessionManager.current.setActiveSession(sessionId);
        setActiveSessionId(sessionId);
        setActiveSession(session);

        // Note: We no longer sync individual threads on switch since we do a full sync on load
        // The syncedThreadsRef is still used by the manual sync button to avoid re-syncing
      } catch (error) {
        console.error('[useChatSessions] Error switching session:', error);
      }
    },
    [agentUrl, isServerSyncEnabled, activeSessionId]
  );

  const createNewSession = useCallback(
    async (name?: string) => {
      try {
        console.log('[useChatSessions] Creating new session...');
        const newSession = await sessionManager.current.createSession(name);

        // Reload all sessions from IndexedDB to ensure we have the latest data
        const allSessions = isServerSyncEnabled
          ? await sessionManager.current.getAllSessionsWithSync()
          : await sessionManager.current.getAllSessions();
        console.log(
          '[useChatSessions] Sessions after creation:',
          allSessions.length,
          allSessions.map((s) => s.id)
        );
        setSessions(allSessions);

        // Then switch to the new session by calling switchSession
        // This ensures the session is properly loaded from SessionManager
        await switchSession(newSession.id);

        return newSession;
      } catch (error) {
        console.error('[useChatSessions] Error creating session:', error);
        throw error;
      }
    },
    [isServerSyncEnabled, switchSession]
  );

  const updateSessionMessages = useCallback(
    async (messages: Message[], contextId?: string) => {
      if (!activeSessionId) return;

      try {
        // Use sync-aware method if server sync is enabled
        if (isServerSyncEnabled) {
          await sessionManager.current.updateSessionMessagesWithSync(
            activeSessionId,
            messages,
            contextId
          );
        } else {
          await sessionManager.current.updateSessionMessages(activeSessionId, messages, contextId);
        }

        // Update active session state
        const updatedSession = await sessionManager.current.getSession(activeSessionId);
        setActiveSession(updatedSession);

        // Only update the sessions list, don't call loadSessions which can create new sessions
        const allSessions = isServerSyncEnabled
          ? await sessionManager.current.getAllSessionsWithSync()
          : await sessionManager.current.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error updating messages:', error);
      }
    },
    [activeSessionId, isServerSyncEnabled]
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      try {
        // Pass historyService from syncManager if available
        const historyService = syncManagerRef.current?.getHistoryService();
        await sessionManager.current.renameSession(sessionId, newName, historyService);

        // Update active session if it was renamed
        if (sessionId === activeSessionId) {
          const updatedSession = await sessionManager.current.getSession(sessionId);
          setActiveSession(updatedSession);
        }

        // Refresh sessions list
        const allSessions = isServerSyncEnabled
          ? await sessionManager.current.getAllSessionsWithSync()
          : await sessionManager.current.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error renaming session:', error);
      }
    },
    [activeSessionId, isServerSyncEnabled]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);

        // Pass historyService from syncManager if available
        const historyService = syncManagerRef.current?.getHistoryService();
        await sessionManager.current.deleteSession(sessionId, historyService);

        // If we deleted the active session, switch to another one
        if (sessionId === activeSessionId) {
          if (remainingSessions.length > 0) {
            await switchSession(remainingSessions[0].id);
          } else {
            // Create a new session if all were deleted
            await createNewSession();
          }
        }

        // Refresh sessions list
        const allSessions = isServerSyncEnabled
          ? await sessionManager.current.getAllSessionsWithSync()
          : await sessionManager.current.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error deleting session:', error);
      }
    },
    [sessions, activeSessionId, isServerSyncEnabled, switchSession, createNewSession]
  );

  // Manual sync trigger for all sessions
  const triggerSync = useCallback(async () => {
    if (!syncManagerRef.current) {
      console.warn('[useChatSessions] Sync manager not initialized');
      return;
    }

    try {
      setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));
      await syncManagerRef.current.triggerSync();
      await loadSessions();
    } catch (error) {
      console.error('[useChatSessions] Manual sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: error as Error,
      }));
    }
  }, [loadSessions]);

  // Manual sync for current thread only
  const syncCurrentThread = useCallback(async () => {
    if (!syncManagerRef.current || !activeSession?.contextId) {
      console.warn('[useChatSessions] Cannot sync: no sync manager or active context');
      return;
    }

    try {
      setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));

      // Force re-sync by removing from synced set
      if (activeSession.contextId) {
        syncedThreadsRef.current.delete(activeSession.contextId);
      }

      // Pass true to force refresh and skip cache
      await syncManagerRef.current.syncSpecificThread(activeSession.contextId, true);

      // Reload the session data after sync
      const updatedSession = await sessionManager.current.getSession(activeSessionId!);
      if (updatedSession) {
        setActiveSession(updatedSession);

        // Update messages in localStorage
        const sessionKey = `a2a-chat-session-${activeSessionId}`;
        const messagesKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
        const contextKey = getAgentContextStorageKey(agentUrl, sessionKey);

        if (updatedSession.messages && updatedSession.messages.length > 0) {
          // Clear existing before storing fresh messages
          localStorage.removeItem(messagesKey);
          localStorage.removeItem(contextKey);

          const transformedMessages = updatedSession.messages.map((msg) => ({
            id: msg.id,
            role:
              msg.sender === 'assistant'
                ? 'assistant'
                : msg.sender === 'system'
                  ? 'system'
                  : 'user',
            content: msg.content,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
            isStreaming: false,
            metadata: msg.metadata || {},
          }));

          localStorage.setItem(messagesKey, JSON.stringify(transformedMessages));
          if (updatedSession.contextId) {
            localStorage.setItem(contextKey, updatedSession.contextId);
          }

          // Dispatch a custom event to notify that messages have been updated
          window.dispatchEvent(
            new CustomEvent('chatMessagesUpdated', {
              detail: { sessionId: activeSessionId, messageCount: transformedMessages.length },
            })
          );
        }
      }

      // Mark as synced again
      if (activeSession.contextId) {
        syncedThreadsRef.current.add(activeSession.contextId);
      }

      setSyncStatus((prev) => ({
        ...prev,
        status: 'idle',
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('[useChatSessions] Thread sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: error as Error,
      }));
    }
  }, [activeSession, activeSessionId, agentUrl]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    updateSessionMessages,
    renameSession,
    deleteSession,
    refreshSessions: loadSessions,
    isLoading,
    // Server sync properties
    syncStatus,
    isServerSyncEnabled,
    triggerSync,
    syncCurrentThread,
    // syncVersion, // Expose sync version for ChatWidget key - currently unused
  };
}
