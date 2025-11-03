import type { SessionStoragePlugin } from '@microsoft/a2achat-core';
import { openDB, IDBPDatabase } from 'idb';

export class IndexedDBStoragePlugin implements SessionStoragePlugin {
  private dbName: string;
  private storeName: string;
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbName = 'a2a-chat-storage', storeName = 'sessions') {
    this.dbName = dbName;
    this.storeName = storeName;

    this.dbPromise = openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      },
    });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.dbPromise;
      const value = await db.get(this.storeName, key);
      return value || null;
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.put(this.storeName, value, key);
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.delete(this.storeName, key);
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.clear(this.storeName);
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  }
}
