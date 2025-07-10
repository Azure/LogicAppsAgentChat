import { EventEmitter } from 'eventemitter3';
import type { 
  SessionData, 
  SessionOptions,
  SessionEventMap 
} from './types';

export class SessionManager extends EventEmitter<SessionEventMap> {
  private session: SessionData;
  private options: Required<SessionOptions>;
  private storage: Storage;
  private saveDebounceTimer?: NodeJS.Timeout;

  constructor(options: SessionOptions = {}) {
    super();

    this.options = {
      sessionId: this.generateSessionId(),
      storage: 'local',
      storageKey: 'a2a-session-default',
      autoSave: true,
      ttl: 0, // No expiration by default
      ...options
    };

    this.storage = this.options.storage === 'local' 
      ? localStorage 
      : sessionStorage;

    // Load existing session or create new one
    this.session = this.loadSession() || this.createSession();
    
    // Save initial session if it's new and auto-save is enabled
    if (!this.loadSession() && this.options.autoSave) {
      this.persistSession();
    }

    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSession(): SessionData {
    const now = new Date();
    const session: SessionData = {
      id: this.options.sessionId,
      createdAt: now,
      updatedAt: now,
      data: {}
    };

    if (this.options.ttl > 0) {
      session.expiresAt = new Date(now.getTime() + this.options.ttl);
    }

    return session;
  }

  private loadSession(): SessionData | null {
    try {
      const stored = this.storage.getItem(this.options.storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const session: SessionData = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
      };

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < new Date()) {
        this.emit('expire');
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  private persistSession(): void {
    const toStore = {
      ...this.session,
      createdAt: this.session.createdAt.toISOString(),
      updatedAt: this.session.updatedAt.toISOString(),
      expiresAt: this.session.expiresAt?.toISOString()
    };

    this.storage.setItem(this.options.storageKey, JSON.stringify(toStore));
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Use setImmediate or Promise.resolve for immediate execution in tests
    if (typeof setImmediate !== 'undefined') {
      this.saveDebounceTimer = setImmediate(() => {
        this.persistSession();
      }) as any;
    } else {
      Promise.resolve().then(() => {
        this.persistSession();
      });
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.options.storageKey || !event.newValue) {
      return;
    }

    try {
      const newSession = JSON.parse(event.newValue);
      this.session = {
        ...newSession,
        createdAt: new Date(newSession.createdAt),
        updatedAt: new Date(newSession.updatedAt),
        expiresAt: newSession.expiresAt ? new Date(newSession.expiresAt) : undefined
      };

      this.emit('sync', this.session);
    } catch {
      // Ignore invalid data
    }
  };

  getSession(): SessionData {
    return { ...this.session };
  }

  get(key: string): unknown {
    return this.session.data[key];
  }

  set(key: string, value: unknown): void {
    const previousValue = this.session.data[key];
    this.session.data[key] = value;
    this.session.updatedAt = new Date();

    this.emit('change', { key, value, previousValue });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  delete(key: string): void {
    const previousValue = this.session.data[key];
    delete this.session.data[key];
    this.session.updatedAt = new Date();

    this.emit('change', { key, value: undefined, previousValue });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  clear(): void {
    const oldData = { ...this.session.data };
    this.session.data = {};
    this.session.updatedAt = new Date();

    // Emit change events for each cleared key
    Object.keys(oldData).forEach(key => {
      this.emit('change', { 
        key, 
        value: undefined, 
        previousValue: oldData[key] 
      });
    });

    if (this.options.autoSave) {
      this.debouncedSave();
    }
  }

  save(): void {
    this.persistSession();
  }

  rotate(preserveKeys: string[] = []): void {
    const preservedData: Record<string, unknown> = {};
    
    preserveKeys.forEach(key => {
      if (key in this.session.data) {
        preservedData[key] = this.session.data[key];
      }
    });

    // Create new session with new ID
    this.options.sessionId = this.generateSessionId();
    this.session = this.createSession();
    this.session.data = preservedData;

    if (this.options.autoSave) {
      this.persistSession();
    }
  }

  destroy(): void {
    this.storage.removeItem(this.options.storageKey);
    this.session = this.createSession();
    this.emit('destroy');
  }

  cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
  }
}