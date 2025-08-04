/**
 * Storage configuration and feature flags for server sync
 */

import type { StorageConfig } from '../services/types';

/**
 * Default storage configuration
 */
export const defaultStorageConfig: StorageConfig = {
  enableServerSync: true, // Enable by default to ensure sync happens
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  cacheStrategy: 'moderate',
  fallbackToLocal: true, // Always fallback to local on error
  debugMode: false,
};

/**
 * Feature flag management for storage configuration
 */
export class FeatureFlags {
  private static config: StorageConfig = { ...defaultStorageConfig };
  private static configKey = 'a2a-storage-config';

  /**
   * Initialize configuration from environment or localStorage
   */
  static initialize(): void {
    // Check environment variables (for build-time config)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REACT_APP_ENABLE_SERVER_SYNC === 'true') {
        this.config.enableServerSync = true;
      }

      if (process.env.REACT_APP_SYNC_INTERVAL) {
        this.config.syncInterval = parseInt(process.env.REACT_APP_SYNC_INTERVAL, 10);
      }

      if (process.env.REACT_APP_DEBUG_MODE === 'true') {
        this.config.debugMode = true;
      }
    }

    // Check localStorage for runtime overrides
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(this.configKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = { ...this.config, ...parsed };
        }
      } catch (error) {
        console.error('[FeatureFlags] Failed to load config from localStorage:', error);
      }
    }

    // Check URL parameters for debugging
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);

      if (params.get('serverSync') === 'true') {
        this.config.enableServerSync = true;
      }

      if (params.get('debugSync') === 'true') {
        this.config.debugMode = true;
      }
    }
  }

  /**
   * Get current configuration
   */
  static get(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static setConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };

    // Persist to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
      } catch (error) {
        console.error('[FeatureFlags] Failed to save config to localStorage:', error);
      }
    }
  }

  /**
   * Check if server sync is enabled
   */
  static isServerSyncEnabled(): boolean {
    return this.config.enableServerSync;
  }

  /**
   * Check if debug mode is enabled
   */
  static isDebugMode(): boolean {
    return this.config.debugMode;
  }

  /**
   * Reset to default configuration
   */
  static reset(): void {
    this.config = { ...defaultStorageConfig };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.configKey);
    }
  }

  /**
   * Enable server sync for a specific percentage of users (for gradual rollout)
   */
  static enableForPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Generate a stable user ID (could be from actual user data in production)
    const userId = this.getUserId();
    const hash = this.hashCode(userId);
    const bucket = Math.abs(hash) % 100;

    this.config.enableServerSync = bucket < percentage;
  }

  /**
   * Get or generate a stable user ID
   */
  private static getUserId(): string {
    const key = 'a2a-user-id';

    if (typeof window !== 'undefined' && window.localStorage) {
      let userId = localStorage.getItem(key);

      if (!userId) {
        userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, userId);
      }

      return userId;
    }

    return 'default-user';
  }

  /**
   * Simple hash function for consistent bucketing
   */
  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

// Initialize on import
FeatureFlags.initialize();

export default FeatureFlags;
