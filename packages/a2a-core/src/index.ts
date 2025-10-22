// Main entry point for @a2a/browser-sdk

// Export types
export * from './types';

// Export discovery
export * from './discovery';

// Export client
export * from './client';

// Export streaming
export * from './streaming';

// Export session
export * from './session';

// Export plugins
export * from './plugins';

// Export utils
export * from './utils/popup-window';
export {
  getAgentMessagesStorageKey,
  getAgentContextStorageKey,
  getAgentStorageIdentifier,
} from './utils/storage-keys';
export { isDirectAgentCardUrl } from './utils/agentUrlUtils';

// Re-export commonly used items at top level for convenience
export { A2AClient } from './client/a2a-client';
export { AgentDiscovery } from './discovery/agent-discovery';
export { HttpClient } from './client/http-client';
export { SSEClient } from './streaming/sse-client';
export { SessionManager, LocalStoragePlugin } from './session/session-manager';
export { ChatInterface } from './chat/chat-interface';
export { PluginManager } from './plugins/plugin-manager';
export { AnalyticsPlugin, LoggerPlugin } from './plugins';

// Export schemas for validation
export { AgentCardSchema, MessageSchema, TaskSchema, PartSchema } from './types/schemas';
