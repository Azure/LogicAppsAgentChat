/**
 * ServerSyncManager - Manages synchronization between local and server storage
 * Handles conflict resolution, automatic sync, and error recovery
 */

import EventEmitter from 'eventemitter3';
import { ServerHistoryService } from './ServerHistoryService';
import { SessionManager, ChatSession, SessionMetadata } from '../utils/sessionManager';
import type {
  ServerContext,
  ConversationData,
  SyncEvents,
  SyncStatus,
  StorageConfig,
} from './types';

export class ServerSyncManager extends EventEmitter<SyncEvents> {
  private historyService: ServerHistoryService;
  private sessionManager: SessionManager;
  private syncInterval: number;
  private syncTimer?: NodeJS.Timeout;
  private isSyncing: boolean = false;
  private isOnline: boolean = true;
  private lastSyncTime?: Date;
  private pendingChanges: Set<string> = new Set();
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 5000;
  private config: Partial<StorageConfig>;

  constructor(
    historyService: ServerHistoryService,
    sessionManager: SessionManager,
    config: Partial<StorageConfig> = {}
  ) {
    super();
    this.historyService = historyService;
    this.sessionManager = sessionManager;
    this.config = config;
    this.syncInterval = this.config.syncInterval || 30000; // Default 30 seconds
    this.maxRetries = this.config.maxRetries || 3;
    this.retryDelay = this.config.retryDelay || 5000;

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Sync only the initial list of contexts and create minimal sessions for display
   */
  async syncInitialContexts(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    this.emit('syncStart');

    try {
      // Fetch the list of contexts with basic info
      const serverContexts = await this.historyService.fetchContexts({
        limit: 50,
        includeLastTask: true, // Include last task to get a preview
        includeArchived: false,
      });

      console.log(`[ServerSyncManager] Found ${serverContexts.length} contexts on server`);

      // Get existing local sessions to avoid duplicates
      const localSessions = await this.sessionManager.getAllSessions();
      const localContextIds = new Set(localSessions.map((s) => s.contextId).filter(Boolean));

      // Create minimal sessions for contexts that don't exist locally
      for (const context of serverContexts) {
        const contextId = context.Id || (context as any).id || (context as any).ID;

        if (!contextId) continue;

        // Skip if we already have this context locally
        if (localContextIds.has(contextId)) {
          console.log(`[ServerSyncManager] Skipping context ${contextId} - already exists locally`);
          continue;
        }

        // Create a minimal session for display (messages will be loaded on demand)
        const title =
          context.Name ||
          context.Title ||
          (context as any).title ||
          (context as any).name ||
          `Chat ${contextId.slice(0, 8)}`;
        const createdAtField =
          context.CreatedAt || (context as any).createdAt || (context as any).created_at;
        const updatedAtField =
          context.UpdatedAt || (context as any).updatedAt || (context as any).updated_at;
        const isArchived = context.IsArchived || context.isArchived || false;
        const status = context.Status || context.status || 'Running';

        let createdAt = Date.now();
        let updatedAt = Date.now();

        if (createdAtField) {
          const parsed = new Date(createdAtField).getTime();
          if (!isNaN(parsed)) {
            createdAt = parsed;
          }
        }

        if (updatedAtField) {
          const parsed = new Date(updatedAtField).getTime();
          if (!isNaN(parsed)) {
            updatedAt = parsed;
          }
        }

        const minimalSession: ChatSession = {
          id: contextId, // Use contextId as session ID for server sessions
          contextId: contextId,
          name: title,
          messages: [], // Don't load messages yet
          createdAt,
          updatedAt,
          isArchived: isArchived,
          status: status,
        };

        console.log(`[ServerSyncManager] Creating minimal session for context ${contextId}`);
        // Don't update timestamp since this is from server sync, use server timestamp
        await this.sessionManager.saveSession(minimalSession, false);
      }

      // Note: We don't need to store context IDs as they're only used locally

      this.emit('syncComplete', { synced: serverContexts.length, failed: 0 });
    } catch (error) {
      console.error('[ServerSyncManager] Failed to sync initial contexts:', error);
      this.emit('syncError', error as Error);
    }
  }

  /**
   * Sync a specific thread when switching to it
   * @param contextId - The context ID to sync
   * @param forceRefresh - Whether to skip cache and force a fresh fetch
   */
  async syncSpecificThread(contextId: string, forceRefresh: boolean = false): Promise<void> {
    if (!this.isOnline || !contextId) {
      return;
    }

    this.emit('syncStart');

    try {
      // Check if we already have this session locally
      const localSessions = await this.sessionManager.getAllSessions();
      const existingSession = localSessions.find((s) => s.contextId === contextId);

      if (existingSession) {
        // We already have this session, just update its messages
        console.log(
          `[ServerSyncManager] Updating existing session for context ${contextId}, forceRefresh: ${forceRefresh}`
        );
        const conversation = await this.historyService.fetchFullConversation(
          contextId,
          forceRefresh
        );

        // Get the full session to check messages
        const fullSession = await this.sessionManager.getSession(existingSession.id);

        // Check if messages actually changed before updating
        const existingMessageIds = new Set((fullSession?.messages || []).map((m: any) => m.id));
        const hasChanges =
          conversation.messages.length !== (fullSession?.messages || []).length ||
          conversation.messages.some((m) => !existingMessageIds.has(m.id));

        if (hasChanges) {
          // Update only the messages, keep the session metadata
          await this.sessionManager.updateSessionMessages(
            existingSession.id,
            conversation.messages,
            contextId
          );
        } else {
          console.log(
            `[ServerSyncManager] No message changes for context ${contextId}, skipping update`
          );
        }
      } else {
        // This is a server-only context, fetch and create locally
        console.log(`[ServerSyncManager] Fetching new context ${contextId} from server`);
        const contexts = await this.historyService.fetchContexts({
          limit: 1,
          includeLastTask: true,
          includeArchived: false,
        });

        const context = contexts.find((c) => {
          const id = c.Id || (c as any).id || (c as any).ID;
          return id === contextId;
        });

        if (context) {
          const conversation = await this.historyService.fetchFullConversation(
            contextId,
            forceRefresh
          );
          await this.updateLocalSession(context, conversation);
        }
      }

      this.emit('syncComplete', { synced: 1, failed: 0 });
    } catch (error) {
      console.error(`[ServerSyncManager] Failed to sync thread ${contextId}:`, error);
      this.emit('syncError', error as Error);
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    this.stopAutoSync();

    // Initial sync
    this.syncFromServer().catch((error) => {
      console.error('[ServerSyncManager] Initial sync failed:', error);
    });

    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncFromServer().catch((error) => {
          console.error('[ServerSyncManager] Periodic sync failed:', error);
        });
      }
    }, this.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Sync all threads - fetches full conversation history for all contexts
   */
  async syncAllThreads(): Promise<void> {
    if (!this.isOnline) {
      console.log('[ServerSyncManager] Cannot sync all threads - offline');
      return;
    }

    this.emit('syncStart');
    this.isSyncing = true;

    try {
      // First, get the list of all contexts
      const serverContexts = await this.historyService.fetchContexts({
        limit: 100, // Get more contexts for full sync
        includeLastTask: true,
        includeArchived: false,
      });

      console.log(`[ServerSyncManager] Starting full sync of ${serverContexts.length} threads`);

      // Get existing local sessions
      const localSessions = await this.sessionManager.getAllSessions();
      const localSessionsByContextId = new Map<string, SessionMetadata>();

      for (const session of localSessions) {
        if (session.contextId) {
          localSessionsByContextId.set(session.contextId, session);
        }
      }

      // Sync each context
      for (const context of serverContexts) {
        const contextId = context.Id || (context as any).id || (context as any).ID;

        if (!contextId) {
          console.warn('[ServerSyncManager] Context missing ID, skipping:', context);
          continue;
        }

        try {
          console.log(`[ServerSyncManager] Syncing thread ${contextId}`);

          // Fetch full conversation history for this context
          const conversation = await this.historyService.fetchFullConversation(contextId);

          if (!conversation || !conversation.tasks || conversation.tasks.length === 0) {
            console.log(`[ServerSyncManager] No conversation data for context ${contextId}`);
            continue;
          }

          // Check if we have a local session for this context
          let localSession = localSessionsByContextId.get(contextId);

          if (!localSession) {
            // Create a new session for this context
            const title =
              context.Name ||
              context.Title ||
              (context as any).title ||
              (context as any).name ||
              `Chat ${contextId.slice(0, 8)}`;
            const isArchived = context.IsArchived || context.isArchived || false;
            const status = context.Status || context.status || 'Running';
            localSession = await this.sessionManager.createSession(title);
            await this.sessionManager.updateSessionContextId(localSession.id, contextId);
            // Update archived and status
            await this.sessionManager.updateSession(localSession.id, { isArchived, status });
            console.log(`[ServerSyncManager] Created new session for context ${contextId}`);
          }

          // Sync the conversation data to the local session using the context object and preloaded conversation
          await this.syncContext(context, localSession, conversation);

          console.log(`[ServerSyncManager] Successfully synced thread ${contextId}`);
        } catch (error) {
          console.error(`[ServerSyncManager] Failed to sync thread ${contextId}:`, error);
          // Continue with other threads even if one fails
        }
      }

      this.lastSyncTime = new Date();
      this.emit('syncComplete', { synced: serverContexts.length, failed: 0 });
      console.log('[ServerSyncManager] Full sync completed successfully');
    } catch (error) {
      console.error('[ServerSyncManager] Full sync failed:', error);
      this.emit('syncError', error as Error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Main sync method - fetches from server and updates local
   */
  async syncFromServer(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.emit('syncStart');

    const syncResult = { synced: 0, failed: 0 };

    try {
      // Fetch all contexts from server
      const serverContexts = await this.historyService.fetchContexts({
        limit: 50,
        includeLastTask: true,
        includeArchived: false,
      });

      // Get local sessions for comparison
      const localSessions = await this.sessionManager.getAllSessions();

      // Create two maps: one by contextId for sessions that have one,
      // and one by session ID for tracking all sessions
      const localSessionByContextId = new Map<string, any>();
      const localSessionById = new Map<string, any>();

      for (const session of localSessions) {
        localSessionById.set(session.id, session);
        if (session.contextId) {
          localSessionByContextId.set(session.contextId, session);
        }
      }

      // Sync each context
      console.log(`[ServerSyncManager] Syncing ${serverContexts.length} contexts from server`);
      console.log('[ServerSyncManager] Server contexts:', serverContexts);

      for (const context of serverContexts) {
        try {
          // Handle both uppercase and lowercase id field
          const contextId = context.Id || (context as any).id || (context as any).ID;

          if (!contextId) {
            console.warn('[ServerSyncManager] Context missing ID:', context);
            syncResult.failed++;
            continue;
          }

          await this.syncContext(context, localSessionByContextId.get(contextId));
          syncResult.synced++;
          this.emit('contextSynced', contextId);
        } catch (error) {
          const contextId = context.Id || (context as any).id || (context as any).ID || 'unknown';
          console.error(`[ServerSyncManager] Failed to sync context ${contextId}:`, error);
          syncResult.failed++;
        }
      }
      console.log(`[ServerSyncManager] Sync results:`, syncResult);

      // Handle local-only sessions (not on server)
      await this.handleLocalOnlySessions(localSessions, serverContexts);

      this.lastSyncTime = new Date();
      this.retryCount = 0;
      this.emit('syncComplete', syncResult);
    } catch (error) {
      console.error('[ServerSyncManager] Sync failed:', error);
      this.emit('syncError', error as Error);

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => {
          this.syncFromServer();
        }, this.retryDelay * this.retryCount);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single context
   */
  private async syncContext(
    serverContext: ServerContext,
    localSession?:
      | SessionMetadata
      | {
          id: string;
          contextId: string | null;
          updatedAt: number;
        },
    preloadedConversation?: ConversationData
  ): Promise<void> {
    // Handle different field name formats
    const contextId = serverContext.Id || (serverContext as any).id || (serverContext as any).ID;
    const updatedAtField =
      serverContext.UpdatedAt ||
      (serverContext as any).updatedAt ||
      (serverContext as any).updated_at;

    if (!contextId) {
      throw new Error('Context missing ID field');
    }

    console.log(`[ServerSyncManager] Processing context ${contextId}, local session:`, {
      exists: !!localSession,
      localSessionId: localSession?.id,
      localContextId: localSession?.contextId,
      localUpdatedAt: localSession?.updatedAt,
    });

    // Parse date safely
    let serverUpdatedAt: number;
    try {
      if (updatedAtField) {
        serverUpdatedAt = new Date(updatedAtField).getTime();
        if (isNaN(serverUpdatedAt)) {
          console.warn(
            `[ServerSyncManager] Invalid date format for context ${contextId}:`,
            updatedAtField
          );
          serverUpdatedAt = Date.now();
        }
      } else {
        console.log(
          `[ServerSyncManager] No UpdatedAt field for context ${contextId}, using current time`
        );
        serverUpdatedAt = Date.now();
      }
    } catch (error) {
      console.warn(`[ServerSyncManager] Error parsing date for context ${contextId}:`, error);
      serverUpdatedAt = Date.now();
    }

    const localUpdatedAt = localSession?.updatedAt || 0;

    console.log(`[ServerSyncManager] Syncing context ${contextId}:`, {
      serverUpdatedAt: new Date(serverUpdatedAt).toISOString(),
      localUpdatedAt: localUpdatedAt ? new Date(localUpdatedAt).toISOString() : 'none',
      shouldSync: serverUpdatedAt > localUpdatedAt || !localSession,
      comparison: `${serverUpdatedAt} > ${localUpdatedAt} = ${serverUpdatedAt > localUpdatedAt}`,
    });

    // Force sync if we don't have messages locally
    const forceSync = !localSession || true; // Always sync for now to debug

    if (forceSync || serverUpdatedAt > localUpdatedAt || !localSession) {
      try {
        // Use preloaded conversation if available, otherwise fetch from server
        const conversation =
          preloadedConversation || (await this.historyService.fetchFullConversation(contextId));

        console.log(
          `[ServerSyncManager] ${preloadedConversation ? 'Using preloaded' : 'Fetched'} conversation for ${contextId}:`,
          {
            messageCount: conversation.messages.length,
            taskCount: conversation.tasks.length,
          }
        );

        // Update local session
        await this.updateLocalSession(serverContext, conversation);
        console.log(`[ServerSyncManager] Updated local session for ${contextId}`);
      } catch (error) {
        // If fetching tasks fails, still create the session with basic info
        console.warn(
          `[ServerSyncManager] Failed to fetch full conversation for ${contextId}, creating basic session:`,
          error
        );

        // Handle flexible field names
        const title =
          serverContext.Title || (serverContext as any).title || (serverContext as any).name;
        const createdAtField =
          serverContext.CreatedAt ||
          (serverContext as any).createdAt ||
          (serverContext as any).created_at;

        // Parse dates safely
        let createdAt = Date.now();
        if (createdAtField) {
          const parsed = new Date(createdAtField).getTime();
          if (!isNaN(parsed)) {
            createdAt = parsed;
          }
        }

        const isArchived = serverContext.IsArchived || serverContext.isArchived || false;
        const status = serverContext.Status || serverContext.status || 'Running';

        const basicSession: ChatSession = {
          id: contextId,
          contextId: contextId,
          name: title || this.generateSessionName(serverContext),
          messages: [],
          createdAt: createdAt,
          updatedAt: serverUpdatedAt,
          isArchived: isArchived,
          status: status,
        };

        // Don't update timestamp since we're using server timestamp
        await this.sessionManager.saveSession(basicSession, false);
      }
    } else if (localUpdatedAt > serverUpdatedAt && localSession?.contextId) {
      // Local is newer - mark for upload (future implementation)
      this.pendingChanges.add(localSession.contextId);
    }
  }

  /**
   * Update local session with server data
   */
  private async updateLocalSession(
    context: ServerContext,
    conversation: ConversationData
  ): Promise<void> {
    // Handle flexible field names
    const contextId = context.Id || (context as any).id || (context as any).ID;
    const title = context.Title || (context as any).title || (context as any).name;
    const createdAtField =
      context.CreatedAt || (context as any).createdAt || (context as any).created_at;
    const updatedAtField =
      context.UpdatedAt || (context as any).updatedAt || (context as any).updated_at;

    // Parse dates safely
    let createdAt = Date.now();
    let updatedAt = Date.now();

    if (createdAtField) {
      const parsed = new Date(createdAtField).getTime();
      if (!isNaN(parsed)) {
        createdAt = parsed;
      }
    }

    if (updatedAtField) {
      const parsed = new Date(updatedAtField).getTime();
      if (!isNaN(parsed)) {
        updatedAt = parsed;
      }
    }

    const isArchived = context.IsArchived || context.isArchived || false;
    const status = context.Status || context.status || 'Running';

    const session: ChatSession = {
      id: contextId,
      contextId: contextId,
      name: title || this.generateSessionName(context),
      messages: conversation.messages,
      createdAt: createdAt,
      updatedAt: updatedAt,
      isArchived: isArchived,
      status: status,
    };

    console.log(
      `[ServerSyncManager] Saving session ${contextId} with ${conversation.messages.length} messages, archived: ${isArchived}, status: ${status}`
    );
    if (conversation.messages.length > 0) {
      console.log(`[ServerSyncManager] First message:`, conversation.messages[0]);
    }

    // Don't update timestamp since we're using server timestamp
    await this.sessionManager.saveSession(session, false);
  }

  /**
   * Handle sessions that exist locally but not on server
   */
  private async handleLocalOnlySessions(
    localSessions: Array<{ id: string; contextId: string | null }>,
    serverContexts: ServerContext[]
  ): Promise<void> {
    const serverContextIds = new Set(
      serverContexts.map((c) => c.Id || (c as any).id || (c as any).ID).filter(Boolean)
    );

    for (const localSession of localSessions) {
      const contextId = localSession.contextId || localSession.id;

      if (!serverContextIds.has(contextId)) {
        // This session doesn't exist on server
        if (localSession.contextId) {
          // Has a context ID but not on server - might be deleted
          console.log(`[ServerSyncManager] Local session ${localSession.id} not found on server`);

          // Check if it actually exists on server (might be archived)
          const exists = await this.historyService.contextExists(contextId);
          if (!exists) {
            // Mark for upload or deletion based on config
            this.pendingChanges.add(contextId);
          }
        } else {
          // Local-only session without context ID
          // These are sessions that haven't been sent to server yet
          this.pendingChanges.add(localSession.id);
        }
      }
    }
  }

  /**
   * Generate a session name from context
   */
  private generateSessionName(context: ServerContext): string {
    const title = context.Title || (context as any).title || (context as any).name;
    if (title) return title;

    const createdAtField =
      context.CreatedAt || (context as any).createdAt || (context as any).created_at;
    if (createdAtField) {
      const date = new Date(createdAtField);
      if (!isNaN(date.getTime())) {
        return `Chat ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      }
    }

    return `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      status: this.isSyncing ? 'syncing' : this.isOnline ? 'idle' : 'offline',
      lastSyncTime: this.lastSyncTime,
      pendingChanges: this.pendingChanges.size,
    };
  }

  /**
   * Manually trigger sync
   */
  async triggerSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    // Clear cache to force fresh fetch
    this.historyService.clearCache();

    return this.syncFromServer();
  }

  /**
   * Mark a session for sync
   */
  markForSync(sessionId: string): void {
    this.pendingChanges.add(sessionId);

    // Trigger sync soon if not already syncing
    if (!this.isSyncing && this.isOnline) {
      setTimeout(() => {
        this.syncFromServer();
      }, 1000);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    this.emit('online');

    // Resume sync after coming online
    if (this.pendingChanges.size > 0 || !this.lastSyncTime) {
      this.syncFromServer();
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    this.emit('offline');
  };

  /**
   * Get the history service instance
   */
  getHistoryService(): ServerHistoryService {
    return this.historyService;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.removeAllListeners();
  }
}
