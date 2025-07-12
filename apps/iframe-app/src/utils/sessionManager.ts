import { Message } from '@microsoft/a2achat-core/react';

export interface ChatSession {
  id: string;
  contextId: string | null;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionMetadata {
  id: string;
  contextId: string | null;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

const SESSIONS_KEY = 'a2a-chat-sessions';
const ACTIVE_SESSION_KEY = 'a2a-active-session';

export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  getAllSessions(): SessionMetadata[] {
    const sessionsData = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsData) {
      return [];
    }

    try {
      const sessions = JSON.parse(sessionsData) as Record<string, ChatSession>;
      return Object.values(sessions)
        .filter((session) => session && typeof session === 'object')
        .map((session) => {
          // Ensure all required properties exist with defaults
          const safeSession: ChatSession = {
            id: session.id || '',
            contextId: session.contextId || null,
            name: session.name || 'Untitled Chat',
            messages: Array.isArray(session.messages) ? session.messages : [],
            createdAt: session.createdAt || Date.now(),
            updatedAt: session.updatedAt || Date.now(),
          };

          const lastMessage =
            safeSession.messages && safeSession.messages.length > 0
              ? safeSession.messages[safeSession.messages.length - 1]?.content || ''
              : '';

          return {
            id: safeSession.id,
            contextId: safeSession.contextId,
            name: safeSession.name,
            createdAt: safeSession.createdAt,
            updatedAt: safeSession.updatedAt,
            lastMessage,
          };
        })
        .filter((session) => session.id) // Filter out any sessions without ID
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error parsing sessions:', error);
      return [];
    }
  }

  getSession(sessionId: string): ChatSession | null {
    if (!sessionId) return null;

    const sessionsData = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsData) return null;

    try {
      const sessions = JSON.parse(sessionsData) as Record<string, ChatSession>;
      const session = sessions[sessionId];
      if (!session || typeof session !== 'object') return null;

      // Ensure all required properties exist with defaults
      return {
        id: session.id || sessionId,
        contextId: session.contextId || null,
        name: session.name || 'Untitled Chat',
        messages: Array.isArray(session.messages) ? session.messages : [],
        createdAt: session.createdAt || Date.now(),
        updatedAt: session.updatedAt || Date.now(),
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  createSession(name?: string): ChatSession {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const newSession: ChatSession = {
      id: sessionId,
      contextId: null,
      name: name || `New Chat ${new Date(now).toLocaleString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    console.log('[SessionManager] Creating new session:', sessionId);
    this.saveSession(newSession);
    this.setActiveSession(sessionId);

    // Debug: Log all sessions after creation
    const allSessions = this.getAllSessions();
    console.log('[SessionManager] Total sessions after creation:', allSessions.length);
    console.log(
      '[SessionManager] All session IDs:',
      allSessions.map((s) => s.id)
    );

    return newSession;
  }

  saveSession(session: ChatSession): void {
    const sessionsData = localStorage.getItem(SESSIONS_KEY);
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};

    console.log('[SessionManager] Before save - existing sessions:', Object.keys(sessions));

    sessions[session.id] = {
      ...session,
      updatedAt: Date.now(),
    };

    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

    console.log('[SessionManager] After save - all sessions:', Object.keys(sessions));
  }

  updateSessionMessages(sessionId: string, messages: Message[], contextId?: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.messages = messages;
    if (contextId && !session.contextId) {
      session.contextId = contextId;
    }

    this.saveSession(session);
  }

  renameSession(sessionId: string, newName: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.name = newName;
    this.saveSession(session);
  }

  deleteSession(sessionId: string): void {
    const sessionsData = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsData) return;

    try {
      const sessions = JSON.parse(sessionsData);
      delete sessions[sessionId];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

      // If this was the active session, clear it
      const activeSessionId = this.getActiveSessionId();
      if (activeSessionId === sessionId) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  getActiveSessionId(): string | null {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  }

  setActiveSession(sessionId: string): void {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
