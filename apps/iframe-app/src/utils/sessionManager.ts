import { Message } from '@microsoft/a2achat-core/react';
import { IndexedDBStorageAdapter } from '../lib/storage/indexeddb-storage-adapter';
import { getAgentStorageIdentifier } from '@microsoft/a2achat-core';
import type { ServerSyncManager } from '../services/ServerSyncManager';

export interface ChatSession {
  id: string;
  contextId: string | null;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isLocalOnly?: boolean; // Track if session exists only locally
  isArchived?: boolean; // Track if session is archived
  status?: string; // Track session status (Running, Stopped, etc.)
}

export interface SessionMetadata {
  id: string;
  contextId: string | null;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
  syncStatus?: 'synced' | 'pending' | 'error'; // Track sync status
  isArchived?: boolean; // Track archived status
  status?: 'Running' | 'Paused' | 'Stopped' | 'Completed' | string; // Track context status
}

export class SessionManager {
  private static instances: Map<string, SessionManager> = new Map();
  private storage: IndexedDBStorageAdapter;
  private initPromise: Promise<void>;
  private sessionsKey: string;
  private activeSessionKey: string;
  private agentUrl: string;

  // Server sync properties
  private syncManager?: ServerSyncManager;
  private useServerStorage: boolean = false;
  private syncQueue: Set<string> = new Set();
  private syncPromises: Map<string, Promise<void>> = new Map();

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

  async getAllSessions(includeArchived: boolean = false): Promise<SessionMetadata[]> {
    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
    if (!sessionsData) {
      return [];
    }

    try {
      const sessions = JSON.parse(sessionsData) as Record<string, ChatSession>;
      return Object.values(sessions)
        .filter((session) => session && typeof session === 'object')
        .filter((session) => includeArchived || !session.isArchived)
        .map((session) => {
          // Ensure all required properties exist with defaults
          const safeSession: ChatSession = {
            id: session.id || '',
            contextId: session.contextId || null,
            name: session.name || 'Untitled Chat',
            messages: Array.isArray(session.messages) ? session.messages : [],
            createdAt: session.createdAt || Date.now(),
            updatedAt: session.updatedAt || Date.now(),
            isArchived: session.isArchived || false,
            status: session.status,
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
            isArchived: safeSession.isArchived,
            status: safeSession.status,
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
        isArchived: session.isArchived || false,
        status: session.status,
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async createSession(name?: string, setAsActive: boolean = true): Promise<ChatSession> {
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

    // Only set as active if requested (default true for backward compatibility)
    if (setAsActive) {
      await this.setActiveSession(sessionId);
    }

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

  async saveSession(session: ChatSession, updateTimestamp: boolean = true): Promise<void> {
    await this.ensureInitialized();

    const sessionsData = await this.storage.getItem(this.sessionsKey);
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};

    console.log(
      `[SessionManager] Before save - existing sessions for ${this.agentUrl}:`,
      Object.keys(sessions)
    );

    sessions[session.id] = updateTimestamp
      ? {
          ...session,
          updatedAt: Date.now(),
        }
      : session;

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

  async renameSession(sessionId: string, newName: string, historyService?: any): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.name = newName;
    await this.saveSession(session);

    // If server sync is enabled and we have a contextId, update on server
    if (historyService && session.contextId) {
      try {
        await historyService.updateContext(session.contextId, { name: newName });
        console.log(
          `[SessionManager] Updated session name on server for context ${session.contextId}`
        );
      } catch (error) {
        console.error('Error updating session name on server:', error);
      }
    }
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    Object.assign(session, updates);
    await this.saveSession(session);
  }

  async archiveSession(sessionId: string, historyService?: any): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Update the session to mark it as archived
    await this.updateSession(sessionId, { isArchived: true });

    // If server sync is enabled and we have a contextId, update on server
    if (historyService && session.contextId) {
      try {
        await historyService.updateContext(session.contextId, { isArchived: true });
        console.log(`[SessionManager] Archived session on server for context ${session.contextId}`);
      } catch (error) {
        console.error('Error archiving session on server:', error);
      }
    }
  }

  // Keep deleteSession for backwards compatibility but have it call archiveSession
  async deleteSession(sessionId: string, historyService?: any): Promise<void> {
    return this.archiveSession(sessionId, historyService);
  }

  async getActiveSessionId(): Promise<string | null> {
    await this.ensureInitialized();
    return await this.storage.getItem(this.activeSessionKey);
  }

  async setActiveSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    // Just set the active session ID, don't update any timestamps
    await this.storage.setItem(this.activeSessionKey, sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Server sync methods

  /**
   * Enable server synchronization
   */
  enableServerSync(syncManager: ServerSyncManager): void {
    this.syncManager = syncManager;
    this.useServerStorage = true;

    // Listen to sync events
    syncManager.on('contextSynced', (contextId: string) => {
      this.syncQueue.delete(contextId);
    });

    syncManager.on('syncComplete', () => {
      this.syncQueue.clear();
    });

    // Start auto sync
    syncManager.startAutoSync();
  }

  /**
   * Disable server synchronization
   */
  disableServerSync(): void {
    if (this.syncManager) {
      this.syncManager.stopAutoSync();
      this.syncManager.destroy();
      this.syncManager = undefined;
    }
    this.useServerStorage = false;
    this.syncQueue.clear();
  }

  /**
   * Check if server sync is enabled
   */
  isServerSyncEnabled(): boolean {
    return this.useServerStorage && !!this.syncManager;
  }

  /**
   * Queue a session for server sync
   */
  private queueForServerSync(sessionId: string): void {
    if (!this.useServerStorage || !this.syncManager) return;

    this.syncQueue.add(sessionId);

    // Debounce sync trigger
    if (!this.syncPromises.has(sessionId)) {
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (this.syncManager && this.syncQueue.has(sessionId)) {
            this.syncManager.markForSync(sessionId);
          }
          this.syncPromises.delete(sessionId);
          resolve();
        }, 1000);
      });

      this.syncPromises.set(sessionId, promise);
    }
  }

  /**
   * Get sessions with server sync if enabled
   */
  async getAllSessionsWithSync(): Promise<SessionMetadata[]> {
    // Trigger server sync if enabled
    if (this.useServerStorage && this.syncManager) {
      try {
        console.log('[SessionManager] Triggering server sync before getting sessions...');
        await this.syncManager.triggerSync();
        console.log('[SessionManager] Server sync completed');
      } catch (error) {
        console.warn('[SessionManager] Server sync failed, using local data:', error);
      }
    }

    // Get local sessions (which should now be updated by sync)
    const sessions = await this.getAllSessions();
    console.log(
      '[SessionManager] Retrieved sessions after sync:',
      sessions.map((s) => ({
        id: s.id,
        contextId: s.contextId,
        name: s.name,
      }))
    );

    // Add sync status to metadata
    return sessions.map((session) => ({
      ...session,
      syncStatus: this.getSyncStatus(session.id),
    }));
  }

  /**
   * Get sync status for a session
   */
  private getSyncStatus(sessionId: string): 'synced' | 'pending' | 'error' {
    if (!this.useServerStorage) return 'synced';

    if (this.syncQueue.has(sessionId)) {
      return 'pending';
    }

    return 'synced';
  }

  /**
   * Save session with server sync
   */
  async saveSessionWithSync(session: ChatSession): Promise<void> {
    // Save locally first
    await this.saveSession(session);

    // Queue for server sync if enabled
    if (this.useServerStorage && session.contextId) {
      this.queueForServerSync(session.contextId);
    }
  }

  /**
   * Update session messages with server sync
   */
  async updateSessionMessagesWithSync(
    sessionId: string,
    messages: Message[],
    contextId?: string
  ): Promise<void> {
    // Update locally first
    await this.updateSessionMessages(sessionId, messages, contextId);

    // Queue for server sync if enabled
    if (this.useServerStorage && contextId) {
      this.queueForServerSync(contextId);
    }
  }

  // For testing purposes only
  static clearAllSessions(): void {
    SessionManager.instances.clear();
  }
}
