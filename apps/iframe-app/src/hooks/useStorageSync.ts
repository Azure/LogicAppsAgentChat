import { useEffect, useRef } from 'react';
import { IndexedDBStoragePlugin } from '../lib/storage/indexeddb-plugin';
import { getAgentMessagesStorageKey, getAgentContextStorageKey } from '@microsoft/a2achat-core';

/**
 * Hook that syncs localStorage data with IndexedDB for better performance and storage capacity
 * This provides a gradual migration path from localStorage to IndexedDB
 */
export function useStorageSync(agentUrl: string, sessionKey: string) {
  const indexedDBPlugin = useRef<IndexedDBStoragePlugin>();
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initialize IndexedDB plugin
    indexedDBPlugin.current = new IndexedDBStoragePlugin('a2a-chat-storage', 'sessions');

    // Function to sync from localStorage to IndexedDB
    const syncToIndexedDB = async () => {
      if (!indexedDBPlugin.current) return;

      const messagesKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
      const contextKey = getAgentContextStorageKey(agentUrl, sessionKey);

      try {
        // Sync messages
        const messagesData = localStorage.getItem(messagesKey);
        if (messagesData) {
          await indexedDBPlugin.current.setItem(messagesKey, messagesData);
        }

        // Sync context
        const contextData = localStorage.getItem(contextKey);
        if (contextData) {
          await indexedDBPlugin.current.setItem(contextKey, contextData);
        }
      } catch (error) {
        console.error('Failed to sync to IndexedDB:', error);
      }
    };

    // Function to restore from IndexedDB to localStorage (for crash recovery)
    const restoreFromIndexedDB = async () => {
      if (!indexedDBPlugin.current) return;

      const messagesKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
      const contextKey = getAgentContextStorageKey(agentUrl, sessionKey);

      try {
        // Check if localStorage is empty but IndexedDB has data
        const localMessages = localStorage.getItem(messagesKey);
        if (!localMessages) {
          const indexedMessages = await indexedDBPlugin.current.getItem(messagesKey);
          if (indexedMessages) {
            localStorage.setItem(messagesKey, indexedMessages);
          }
        }

        const localContext = localStorage.getItem(contextKey);
        if (!localContext) {
          const indexedContext = await indexedDBPlugin.current.getItem(contextKey);
          if (indexedContext) {
            localStorage.setItem(contextKey, indexedContext);
          }
        }
      } catch (error) {
        console.error('Failed to restore from IndexedDB:', error);
      }
    };

    // Initial restore in case of localStorage being cleared
    restoreFromIndexedDB();

    // Set up periodic sync to IndexedDB
    syncIntervalRef.current = setInterval(syncToIndexedDB, 5000); // Sync every 5 seconds

    // Listen for storage events to sync immediately
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === getAgentMessagesStorageKey(agentUrl, sessionKey) ||
        e.key === getAgentContextStorageKey(agentUrl, sessionKey)
      ) {
        syncToIndexedDB();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [agentUrl, sessionKey]);

  return {
    syncNow: async () => {
      const syncToIndexedDB = async () => {
        if (!indexedDBPlugin.current) return;

        const messagesKey = getAgentMessagesStorageKey(agentUrl, sessionKey);
        const contextKey = getAgentContextStorageKey(agentUrl, sessionKey);

        try {
          const messagesData = localStorage.getItem(messagesKey);
          if (messagesData) {
            await indexedDBPlugin.current.setItem(messagesKey, messagesData);
          }

          const contextData = localStorage.getItem(contextKey);
          if (contextData) {
            await indexedDBPlugin.current.setItem(contextKey, contextData);
          }
        } catch (error) {
          console.error('Failed to sync to IndexedDB:', error);
        }
      };

      await syncToIndexedDB();
    },
  };
}
