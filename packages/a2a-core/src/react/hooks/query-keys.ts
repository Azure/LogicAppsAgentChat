/**
 * Query key factory for consistent cache key management
 * This ensures proper cache invalidation and type safety
 */
export const queryKeys = {
  all: ['a2a'] as const,
  contexts: () => [...queryKeys.all, 'contexts'] as const,
  contextsList: (params?: { includeLastTask?: boolean; limit?: number }) =>
    [...queryKeys.contexts(), 'list', params] as const,
  contextDetail: (contextId: string) => [...queryKeys.contexts(), 'detail', contextId] as const,

  tasks: () => [...queryKeys.all, 'tasks'] as const,
  tasksList: (contextId: string) => [...queryKeys.tasks(), 'list', contextId] as const,
  taskDetail: (taskId: string) => [...queryKeys.tasks(), 'detail', taskId] as const,

  messages: () => [...queryKeys.all, 'messages'] as const,
  messageStream: (contextId: string) => [...queryKeys.messages(), 'stream', contextId] as const,
} as const;
