import { A2AClient } from './a2a-client';
import type { A2AClientConfig } from './a2a-client';

/**
 * A2AClient that works with React Query for history management.
 * This client does NOT auto-load history, leaving that responsibility
 * to React Query hooks for proper caching and deduplication.
 */
export class A2AClientQuery extends A2AClient {
  constructor(config: A2AClientConfig) {
    super(config);
    console.log('[A2AClientQuery] Created client without auto-history loading');
  }
}
