export type SessionData = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  data: Record<string, unknown>;
};

export type StorageType = 'local' | 'session';

export type SessionOptions = {
  sessionId?: string;
  storage?: StorageType;
  storageKey?: string;
  autoSave?: boolean;
  ttl?: number; // Time to live in milliseconds
};

export type SessionChangeEvent = {
  key: string;
  value: unknown;
  previousValue: unknown;
};

export type SessionEventMap = {
  change: SessionChangeEvent;
  destroy: void;
  expire: void;
  sync: SessionData;
};