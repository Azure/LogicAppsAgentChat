/**
 * Server data types for A2A chat history
 * These types represent the data format returned by the server API
 */

import type { Message } from '@microsoft/a2achat-core/react';

/**
 * Server context representation (conversation thread)
 */
export interface ServerContext {
  Id: string;
  Title?: string;
  Name?: string; // Server also uses Name field
  CreatedAt: string;
  UpdatedAt: string;
  IsArchived?: boolean;
  isArchived?: boolean; // Handle both capitalizations
  Status?: 'Running' | 'Paused' | 'Stopped' | 'Completed' | string;
  status?: 'Running' | 'Paused' | 'Stopped' | 'Completed' | string; // Handle both capitalizations
  LastTask?: {
    Id: string;
    State: string;
    LastMessage?: {
      text: string;
      role: 'user' | 'agent';
      timestamp: string;
    };
  };
}

/**
 * Server task representation (individual conversation within a context)
 */
export interface ServerTask {
  Id: string;
  ContextId: string;
  State: 'active' | 'completed' | 'cancelled';
  CreatedAt: string;
  UpdatedAt: string;
  Messages?: ServerMessage[];
}

/**
 * Server message format
 */
export interface ServerMessage {
  messageId?: string;
  role: 'user' | 'agent' | 'system';
  parts: MessagePart[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message part types matching A2A protocol
 */
export type MessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'data'; data: unknown }
  | { kind: 'artifact'; artifactId: string; name: string; type: string };

/**
 * Assembled conversation data
 */
export interface ConversationData {
  contextId: string;
  messages: Message[];
  tasks: ServerTask[];
  lastUpdated: string;
}

/**
 * Server API response formats
 */
export interface ContextListResponse {
  jsonrpc: '2.0';
  id: string;
  result: {
    contexts: ServerContext[];
    total?: number;
    hasMore?: boolean;
  };
}

export interface TaskListResponse {
  jsonrpc: '2.0';
  id: string;
  result: {
    tasks: ServerTask[];
    hasMore?: boolean;
  };
}

/**
 * Sync status and metadata
 */
export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncTime?: Date;
  error?: Error;
  pendingChanges: number;
}

/**
 * Migration result tracking
 */
export interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: Error[];
  skipped?: number;
}

/**
 * Sync event types for event emitter
 */
export interface SyncEvents {
  syncStart: () => void;
  syncComplete: (result: { synced: number; failed: number }) => void;
  syncError: (error: Error) => void;
  contextSynced: (contextId: string) => void;
  offline: () => void;
  online: () => void;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  enableServerSync: boolean;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  fallbackToLocal: boolean;
  debugMode: boolean;
}
