import { IndexedDBStoragePlugin } from './indexeddb-plugin';

/**
 * IndexedDB-only storage adapter for iframe-app
 * Provides async storage operations using IndexedDB
 */
export class IndexedDBStorageAdapter {
  private indexedDBPlugin: IndexedDBStoragePlugin;
  private initialized = false;
  private initPromise: Promise<void>;

  constructor(dbName = 'a2a-chat-storage', storeName = 'sessions') {
    this.indexedDBPlugin = new IndexedDBStoragePlugin(dbName, storeName);
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Test if IndexedDB is working
      await this.indexedDBPlugin.setItem('__test__', 'test');
      await this.indexedDBPlugin.removeItem('__test__');

      this.initialized = true;
      console.log('IndexedDBStorageAdapter: Initialized successfully');
    } catch (error) {
      console.error('IndexedDBStorageAdapter: Failed to initialize', error);
      throw new Error('IndexedDB is required but not available');
    }
  }

  /**
   * Ensure IndexedDB is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Get item from IndexedDB
   */
  async getItem(key: string): Promise<string | null> {
    await this.ensureInitialized();

    try {
      return await this.indexedDBPlugin.getItem(key);
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Set item in IndexedDB
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.indexedDBPlugin.setItem(key, value);
    } catch (error) {
      console.error('Error writing to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Remove item from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.indexedDBPlugin.removeItem(key);
    } catch (error) {
      console.error('Error removing from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Clear all items from IndexedDB
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.indexedDBPlugin.clear) {
        await this.indexedDBPlugin.clear();
      }
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }
}
