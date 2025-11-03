import { Message } from '@microsoft/a2achat-core/react';
import { IndexedDBStorageAdapter } from '../lib/storage/indexeddb-storage-adapter';
import { getAgentStorageIdentifier } from '@microsoft/a2achat-core';

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

export class SessionManager {
  private static instances: Map<string, SessionManager> = new Map();
  private storage: IndexedDBStorageAdapter;
  private initPromise: Promise<void>;
  private sessionsKey: string;
  private activeSessionKey: string;
  private agentUrl: string;

  private constructor(agentUrl: string) {
    this.agentUrl = agentUrl;
    const agentId = getAgentStorageIdentifier(agentUrl);
    this.sessionsKey = `a2a-chat-sessions-${agentId}`;
    this.activeSessionKey = `a2a-active-session-${agentId}`;
    this.storage = new IndexedDBStorageAdapter();
    this.initPromise = this.migrateFromLocalStorage();
  }

  static getInstance(agentUrl: string): SessionManager {
    if (!SessionManager.instances.has(agentUrl)) {
      SessionManager.instances.set(agentUrl, new SessionManager(agentUrl));
    }
    return SessionManager.instances.get(agentUrl)!;
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      // Try to migrate from old non-agent-specific keys first
      const oldSessionsKey = 'a2a-chat-sessions';
      const oldActiveKey = 'a2a-active-session';

      // Check if there's existing data in localStorage to migrate
      const sessionsData = localStorage.getItem(oldSessionsKey);
      const activeSessionId = localStorage.getItem(oldActiveKey);

      if (sessionsData) {
        // Migrate sessions to IndexedDB with agent-specific key
        await this.storage.setItem(this.sessionsKey, sessionsData);
        localStorage.removeItem(oldSessionsKey);
        console.log(
          `[SessionManager] Migrated sessions from localStorage to IndexedDB for agent: ${this.agentUrl}`
        );
      }

      if (activeSessionId) {
        // Migrate active session with agent-specific key
        await this.storage.setItem(this.activeSessionKey, activeSessionId);
        localStorage.removeItem(oldActiveKey);
        console.log(
          `[SessionManager] Migrated active session from localStorage to IndexedDB for agent: ${this.agentUrl}`
        );
      }
    } catch (error) {
      console.error('[SessionManager] Migration error:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
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
        .sort((a, b) => b.createdAt - a.createdAt); // Sort by creation time to maintain stable order
    } catch (error) {
      console.error('Error parsing sessions:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    if (!sessionId) return null;

    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
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

  async createSession(name?: string): Promise<ChatSession> {
    await this.ensureInitialized();

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

    console.log(`[SessionManager] Creating new session for ${this.agentUrl}:`, sessionId);
    await this.saveSession(newSession);
    await this.setActiveSession(sessionId);

    // Debug: Log all sessions after creation
    const allSessions = await this.getAllSessions();
    console.log(
      `[SessionManager] Total sessions after creation for ${this.agentUrl}:`,
      allSessions.length
    );
    console.log(
      `[SessionManager] All session IDs for ${this.agentUrl}:`,
      allSessions.map((s) => s.id)
    );

    return newSession;
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};

    console.log(
      `[SessionManager] Before save - existing sessions for ${this.agentUrl}:`,
      Object.keys(sessions)
    );

    sessions[session.id] = {
      ...session,
      updatedAt: Date.now(),
    };

    await this.storage.setItem(this.sessionsKey, JSON.stringify(sessions));

    console.log(
      `[SessionManager] After save - all sessions for ${this.agentUrl}:`,
      Object.keys(sessions)
    );
  }

  async updateSessionMessages(
    sessionId: string,
    messages: Message[],
    contextId?: string
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Only update if messages have actually changed
    const messagesChanged = JSON.stringify(session.messages) !== JSON.stringify(messages);
    const contextIdChanged = contextId && !session.contextId;

    if (!messagesChanged && !contextIdChanged) {
      return; // No changes, don't update
    }

    session.messages = messages;
    if (contextId && !session.contextId) {
      session.contextId = contextId;
    }

    await this.saveSession(session);
  }

  async updateSessionContextId(sessionId: string, contextId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Only update if contextId is actually changing
    if (session.contextId === contextId) {
      return; // No change
    }

    session.contextId = contextId;

    // Save without updating updatedAt since this is just metadata
    await this.ensureInitialized();
    const sessionsData = await this.storage.getItem(this.sessionsKey);
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};

    sessions[session.id] = session; // Don't update updatedAt
    await this.storage.setItem(this.sessionsKey, JSON.stringify(sessions));
  }

  async renameSession(sessionId: string, newName: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.name = newName;
    await this.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
    if (!sessionsData) return;

    try {
      const sessions = JSON.parse(sessionsData);
      delete sessions[sessionId];
      await this.storage.setItem(this.sessionsKey, JSON.stringify(sessions));

      // If this was the active session, clear it
      const activeSessionId = await this.getActiveSessionId();
      if (activeSessionId === sessionId) {
        await this.storage.removeItem(this.activeSessionKey);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  async getActiveSessionId(): Promise<string | null> {
    await this.ensureInitialized();
    return await this.storage.getItem(this.activeSessionKey);
  }

  async setActiveSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    await this.storage.setItem(this.activeSessionKey, sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // For testing purposes only
  static clearAllSessions(): void {
    SessionManager.instances.clear();
  }
}
