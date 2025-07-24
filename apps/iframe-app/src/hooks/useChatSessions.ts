import { useState, useEffect, useCallback } from 'react';
import { SessionManager, ChatSession, SessionMetadata } from '../utils/sessionManager';
import { Message } from '@microsoft/a2achat-core/react';

export function useChatSessions(agentUrl: string) {
  const sessionManager = SessionManager.getInstance(agentUrl);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const allSessions = await sessionManager.getAllSessions();
      setSessions(allSessions);

      // Get active session or create one if none exists
      let currentActiveId = await sessionManager.getActiveSessionId();

      if (!currentActiveId || !(await sessionManager.getSession(currentActiveId))) {
        // Create a new session if none exists
        if (allSessions.length === 0) {
          const newSession = await sessionManager.createSession();
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
          await sessionManager.setActiveSession(currentActiveId);
        }
      }

      setActiveSessionId(currentActiveId);
      const session = await sessionManager.getSession(currentActiveId);
      setActiveSession(session);
    } catch (error) {
      console.error('[useChatSessions] Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionManager]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      try {
        await sessionManager.setActiveSession(sessionId);
        setActiveSessionId(sessionId);
        const session = await sessionManager.getSession(sessionId);
        setActiveSession(session);
      } catch (error) {
        console.error('[useChatSessions] Error switching session:', error);
      }
    },
    [sessionManager]
  );

  const createNewSession = useCallback(
    async (name?: string) => {
      try {
        console.log('[useChatSessions] Creating new session...');
        const newSession = await sessionManager.createSession(name);

        // Reload all sessions from IndexedDB to ensure we have the latest data
        const allSessions = await sessionManager.getAllSessions();
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
    [sessionManager, switchSession]
  );

  const updateSessionMessages = useCallback(
    async (messages: Message[], contextId?: string) => {
      if (!activeSessionId) return;

      try {
        await sessionManager.updateSessionMessages(activeSessionId, messages, contextId);

        // Update active session state
        const updatedSession = await sessionManager.getSession(activeSessionId);
        setActiveSession(updatedSession);

        // Only update the sessions list, don't call loadSessions which can create new sessions
        const allSessions = await sessionManager.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error updating messages:', error);
      }
    },
    [activeSessionId, sessionManager]
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      try {
        await sessionManager.renameSession(sessionId, newName);

        // Update active session if it was renamed
        if (sessionId === activeSessionId) {
          const updatedSession = await sessionManager.getSession(sessionId);
          setActiveSession(updatedSession);
        }

        // Refresh sessions list
        const allSessions = await sessionManager.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error renaming session:', error);
      }
    },
    [activeSessionId, sessionManager]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);

        await sessionManager.deleteSession(sessionId);

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
        const allSessions = await sessionManager.getAllSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('[useChatSessions] Error deleting session:', error);
      }
    },
    [sessions, activeSessionId, sessionManager, switchSession, createNewSession]
  );

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
  };
}
