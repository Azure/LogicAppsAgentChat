import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Message, Attachment } from '../types';
import type { AuthRequiredEvent } from '../../client/types';

// Enable MapSet plugin for Immer to handle Maps
enableMapSet();

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  pendingUploads: Map<string, Attachment>;
  authRequired: AuthRequiredEvent | null;

  // Session-specific states
  typingByContext: Map<string, boolean>;
  authRequiredByContext: Map<string, AuthRequiredEvent | null>;

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  setConnected: (connected: boolean) => void;
  setTyping: (typing: boolean, contextId?: string) => void;
  setAuthRequired: (event: AuthRequiredEvent | null, contextId?: string) => void;

  // File upload actions
  addPendingUpload: (attachment: Attachment) => void;
  updatePendingUpload: (id: string, updates: Partial<Attachment>) => void;
  removePendingUpload: (id: string) => void;

  // Utilities
  clearMessages: () => void;

  // Getters for session-specific states
  getIsTypingForContext: (contextId: string | undefined) => boolean;
  getAuthRequiredForContext: (contextId: string | undefined) => AuthRequiredEvent | null;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    messages: [],
    isConnected: false,
    isTyping: false,
    pendingUploads: new Map(),
    authRequired: null,
    typingByContext: new Map(),
    authRequiredByContext: new Map(),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),

    updateMessage: (id, updates) =>
      set((state) => {
        const messageIndex = state.messages.findIndex((msg) => msg.id === id);
        if (messageIndex !== -1) {
          Object.assign(state.messages[messageIndex], updates);
        }
      }),

    deleteMessage: (id) =>
      set((state) => {
        const index = state.messages.findIndex((msg) => msg.id === id);
        if (index !== -1) {
          state.messages.splice(index, 1);
        }
      }),

    setMessages: (messages) => set({ messages }),

    setConnected: (connected) => set({ isConnected: connected }),

    setTyping: (typing, contextId) =>
      set((state) => {
        let newTypingByContext = state.typingByContext;
        if (contextId) {
          // Create a new Map to avoid Immer issues
          newTypingByContext = new Map(state.typingByContext);
          newTypingByContext.set(contextId, typing);
        }
        return {
          isTyping: typing,
          typingByContext: newTypingByContext,
        };
      }),

    setAuthRequired: (event, contextId) =>
      set((state) => {
        let newAuthRequiredByContext = state.authRequiredByContext;
        if (contextId) {
          // Create a new Map to avoid Immer issues
          newAuthRequiredByContext = new Map(state.authRequiredByContext);
          newAuthRequiredByContext.set(contextId, event);
        }
        return {
          authRequired: event,
          authRequiredByContext: newAuthRequiredByContext,
        };
      }),

    addPendingUpload: (attachment) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        newUploads.set(attachment.id, attachment);
        return { pendingUploads: newUploads };
      }),

    updatePendingUpload: (id, updates) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        const existing = newUploads.get(id);
        if (existing) {
          newUploads.set(id, { ...existing, ...updates });
        }
        return { pendingUploads: newUploads };
      }),

    removePendingUpload: (id) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        newUploads.delete(id);
        return { pendingUploads: newUploads };
      }),

    clearMessages: () => set({ messages: [] }),

    getIsTypingForContext: (contextId: string | undefined): boolean => {
      if (!contextId) return false;
      const state = get();
      return state.typingByContext.get(contextId) || false;
    },

    getAuthRequiredForContext: (contextId: string | undefined): AuthRequiredEvent | null => {
      if (!contextId) return null;
      const state = get();
      return state.authRequiredByContext.get(contextId) || null;
    },
  }))
);
