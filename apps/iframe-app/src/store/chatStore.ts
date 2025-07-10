import { create } from 'zustand';
import type { Message, Attachment } from '../types';

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  pendingUploads: Map<string, Attachment>;

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  setConnected: (connected: boolean) => void;
  setTyping: (typing: boolean) => void;

  // File upload actions
  addPendingUpload: (attachment: Attachment) => void;
  updatePendingUpload: (id: string, updates: Partial<Attachment>) => void;
  removePendingUpload: (id: string) => void;

  // Utilities
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  pendingUploads: new Map(),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    })),

  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),

  setMessages: (messages) => set({ messages }),

  setConnected: (connected) => set({ isConnected: connected }),

  setTyping: (typing) => set({ isTyping: typing }),

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
}));
