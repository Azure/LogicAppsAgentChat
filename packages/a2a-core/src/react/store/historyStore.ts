import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Context, TaskHistory } from '../../types';
import type { A2AClient } from '../../client/a2a-client';

// Enable MapSet plugin for Immer to handle Maps
enableMapSet();

interface HistoryState {
  // State
  contexts: Context[];
  currentContextId: string | null;
  tasksCache: Map<string, TaskHistory[]>;
  isLoadingContexts: boolean;
  isLoadingTasks: boolean;
  contextsError: Error | null;
  updatingContextIds: Set<string>;

  // Actions
  setContexts: (contexts: Context[]) => void;
  setCurrentContext: (contextId: string | null) => void;
  setTasksForContext: (contextId: string, tasks: TaskHistory[]) => void;
  setLoadingContexts: (loading: boolean) => void;
  setLoadingTasks: (loading: boolean) => void;
  setContextsError: (error: Error | null) => void;

  // API methods
  fetchContexts: (client: A2AClient, includeLastTask?: boolean) => Promise<void>;
  fetchTasksForContext: (client: A2AClient, contextId: string) => Promise<TaskHistory[]>;
  updateContext: (
    client: A2AClient,
    contextId: string,
    updates: { name?: string; isArchived?: boolean }
  ) => Promise<void>;
  createContext: (client: A2AClient, message?: any, metadata?: any) => Promise<Context>;

  // Helpers
  getCurrentContext: () => Context | undefined;
  getTasksForContext: (contextId: string) => TaskHistory[] | undefined;
  getActiveContexts: () => Context[];
  getArchivedContexts: () => Context[];
  isContextUpdating: (contextId: string) => boolean;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    // Initial state
    contexts: [],
    currentContextId: null,
    tasksCache: new Map(),
    isLoadingContexts: false,
    isLoadingTasks: false,
    contextsError: null,
    updatingContextIds: new Set(),

    // Actions
    setContexts: (contexts) =>
      set((state) => {
        state.contexts = contexts;
      }),

    setCurrentContext: (contextId) =>
      set((state) => {
        state.currentContextId = contextId;
      }),

    setTasksForContext: (contextId, tasks) =>
      set((state) => {
        console.log('[historyStore] Setting tasks for context:', contextId, 'tasks:', tasks);
        state.tasksCache.set(contextId, tasks);
      }),

    setLoadingContexts: (loading) =>
      set((state) => {
        state.isLoadingContexts = loading;
      }),

    setLoadingTasks: (loading) =>
      set((state) => {
        state.isLoadingTasks = loading;
      }),

    setContextsError: (error) =>
      set((state) => {
        state.contextsError = error;
      }),

    // API methods
    fetchContexts: async (client, includeLastTask = true) => {
      const { setContexts, setLoadingContexts, setContextsError } = get();

      try {
        setLoadingContexts(true);
        setContextsError(null);

        const contexts = await client.history.listContexts({
          includeLastTask,
          limit: 50, // Reasonable default limit
        });

        console.log('[historyStore] Setting contexts:', contexts);
        setContexts(contexts);

        // If we don't have a current context, set the first active one
        const currentContext = get().currentContextId;
        if (!currentContext && contexts.length > 0) {
          const firstActive = contexts.find((c) => !c.isArchived);
          if (firstActive) {
            console.log('[historyStore] Setting current context to:', firstActive.id);
            set((state) => {
              state.currentContextId = firstActive.id;
            });
          }
        }
      } catch (error) {
        setContextsError(error as Error);
        throw error;
      } finally {
        setLoadingContexts(false);
      }
    },

    fetchTasksForContext: async (client, contextId) => {
      const { setTasksForContext, setLoadingTasks } = get();

      try {
        setLoadingTasks(true);

        const tasks = await client.history.listTasks(contextId);
        setTasksForContext(contextId, tasks);

        return tasks;
      } catch (error: any) {
        // Handle context not found errors gracefully - context doesn't exist on server yet
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Context not found') || errorMessage.includes('Invalid params')) {
          console.log('[historyStore] Context not found on server:', contextId);
          // Set empty tasks for this context to prevent repeated attempts
          setTasksForContext(contextId, []);
          return [];
        }
        console.error('Error fetching tasks:', error);
        throw error;
      } finally {
        setLoadingTasks(false);
      }
    },

    updateContext: async (client, contextId, updates) => {
      const { contexts, setContexts } = get();

      // Find the original context for potential rollback
      const originalContext = contexts.find((ctx) => ctx.id === contextId);
      if (!originalContext) {
        throw new Error('Context not found');
      }

      // Mark context as updating
      set((state) => {
        state.updatingContextIds.add(contextId);
      });

      // Optimistically update the local state immediately
      const optimisticContexts = contexts.map((ctx) =>
        ctx.id === contextId
          ? {
              ...ctx,
              name: updates.name !== undefined ? updates.name : ctx.name,
              isArchived: updates.isArchived !== undefined ? updates.isArchived : ctx.isArchived,
            }
          : ctx
      );
      setContexts(optimisticContexts);

      try {
        // Make the actual server request
        const updatedContext = await client.history.updateContext({
          Id: contextId,
          Name: updates.name,
          IsArchived: updates.isArchived,
        });

        // Update with the server response (in case there are server-side modifications)
        const currentContexts = get().contexts;
        const finalContexts = currentContexts.map((ctx) =>
          ctx.id === contextId ? updatedContext : ctx
        );
        setContexts(finalContexts);
      } catch (error) {
        console.error('Error updating context:', error);

        // Revert to original state on error
        const currentContexts = get().contexts;
        const revertedContexts = currentContexts.map((ctx) =>
          ctx.id === contextId ? originalContext : ctx
        );
        setContexts(revertedContexts);

        throw error;
      } finally {
        // Remove updating flag
        set((state) => {
          state.updatingContextIds.delete(contextId);
        });
      }
    },

    createContext: async (client, message, metadata) => {
      const { setContexts, contexts } = get();

      try {
        const newContext = await client.history.createContext(message, metadata);

        // Add the new context to our local state
        setContexts([newContext, ...contexts]);

        // Set it as the current context
        set((state) => {
          state.currentContextId = newContext.id;
        });

        return newContext;
      } catch (error) {
        console.error('Error creating context:', error);
        throw error;
      }
    },

    // Helpers
    getCurrentContext: () => {
      const { contexts, currentContextId } = get();
      return contexts.find((ctx) => ctx.id === currentContextId);
    },

    getTasksForContext: (contextId) => {
      const { tasksCache } = get();
      const tasks = tasksCache.get(contextId);
      console.log('[historyStore] Getting tasks for context:', contextId, 'found:', tasks);
      return tasks;
    },

    getActiveContexts: () => {
      const { contexts } = get();
      const active = contexts.filter((ctx) => !ctx.isArchived);
      console.log(
        '[historyStore] getActiveContexts - total contexts:',
        contexts.length,
        'active:',
        active.length
      );
      return active;
    },

    getArchivedContexts: () => {
      const { contexts } = get();
      const archived = contexts.filter((ctx) => ctx.isArchived);
      console.log(
        '[historyStore] getArchivedContexts - total contexts:',
        contexts.length,
        'archived:',
        archived.length
      );
      return archived;
    },

    isContextUpdating: (contextId) => {
      const { updatingContextIds } = get();
      return updatingContextIds.has(contextId);
    },
  }))
);
