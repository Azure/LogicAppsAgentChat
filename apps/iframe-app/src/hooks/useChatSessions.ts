import { useState, useEffect, useCallback } from 'react';
import { SessionManager, ChatSession, SessionMetadata } from '../utils/sessionManager';
import { Message } from '@microsoft/a2achat-core/react';

export function useChatSessions() {
  const sessionManager = SessionManager.getInstance();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(() => {
    const allSessions = sessionManager.getAllSessions();
    setSessions(allSessions);

    // Get active session or create one if none exists
    let currentActiveId = sessionManager.getActiveSessionId();

    if (!currentActiveId || !sessionManager.getSession(currentActiveId)) {
      // Create a new session if none exists
      if (allSessions.length === 0) {
        const newSession = sessionManager.createSession();
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
        sessionManager.setActiveSession(currentActiveId);
      }
    }

    setActiveSessionId(currentActiveId);
    const session = sessionManager.getSession(currentActiveId);
    setActiveSession(session);
  }, [sessionManager]);

  const switchSession = useCallback(
    (sessionId: string) => {
      sessionManager.setActiveSession(sessionId);
      setActiveSessionId(sessionId);
      const session = sessionManager.getSession(sessionId);
      setActiveSession(session);
    },
    [sessionManager]
  );

  const createNewSession = useCallback(
    (name?: string) => {
      console.log('[useChatSessions] Creating new session...');
      const newSession = sessionManager.createSession(name);

      // Reload all sessions from localStorage to ensure we have the latest data
      const allSessions = sessionManager.getAllSessions();
      console.log(
        '[useChatSessions] Sessions after creation:',
        allSessions.length,
        allSessions.map((s) => s.id)
      );
      setSessions(allSessions);

      // Then switch to the new session by calling switchSession
      // This ensures the session is properly loaded from SessionManager
      switchSession(newSession.id);

      return newSession;
    },
    [sessionManager, switchSession]
  );

  const updateSessionMessages = useCallback(
    (messages: Message[], contextId?: string) => {
      if (!activeSessionId) return;

      sessionManager.updateSessionMessages(activeSessionId, messages, contextId);

      // Update active session state
      const updatedSession = sessionManager.getSession(activeSessionId);
      setActiveSession(updatedSession);

      // Only update the sessions list, don't call loadSessions which can create new sessions
      const allSessions = sessionManager.getAllSessions();
      setSessions(allSessions);
    },
    [activeSessionId, sessionManager]
  );

  const renameSession = useCallback(
    (sessionId: string, newName: string) => {
      sessionManager.renameSession(sessionId, newName);

      // Update active session if it was renamed
      if (sessionId === activeSessionId) {
        const updatedSession = sessionManager.getSession(sessionId);
        setActiveSession(updatedSession);
      }

      // Refresh sessions list
      const allSessions = sessionManager.getAllSessions();
      setSessions(allSessions);
    },
    [activeSessionId, sessionManager]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);

      sessionManager.deleteSession(sessionId);

      // If we deleted the active session, switch to another one
      if (sessionId === activeSessionId) {
        if (remainingSessions.length > 0) {
          switchSession(remainingSessions[0].id);
        } else {
          // Create a new session if all were deleted
          createNewSession();
        }
      }

      // Refresh sessions list
      const allSessions = sessionManager.getAllSessions();
      setSessions(allSessions);
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
  };
}
