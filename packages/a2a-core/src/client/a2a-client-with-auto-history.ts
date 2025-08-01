import { A2AClient } from './a2a-client';
import type { A2AClientConfig } from './a2a-client';
import type { MessageSendRequest, Task } from '../types';

/**
 * Extended A2AClient that automatically loads history on first message.
 * This is a temporary solution to ensure history APIs are called.
 */
export class A2AClientWithAutoHistory extends A2AClient {
  private historyLoaded = false;
  private loadingHistory = false;
  private originalStream: ((request: MessageSendRequest) => AsyncIterable<Task>) | null = null;

  constructor(config: A2AClientConfig) {
    super(config);

    // Capture the original stream method after super() completes
    this.originalStream = this.message.stream;

    // Override the stream method
    this.message.stream = this.streamWithHistory.bind(this);

    // Start loading history immediately on construction
    this.ensureHistoryLoaded().catch((error) => {
      console.error('[A2AClientWithAutoHistory] Failed to load initial history:', error);
    });
  }

  private streamWithHistory(request: MessageSendRequest): AsyncIterable<Task> {
    const self = this;
    const originalStream = this.originalStream!;

    return {
      [Symbol.asyncIterator]: async function* () {
        // Load history on first message if not already loaded
        await self.ensureHistoryLoaded();

        // Then proceed with the original stream
        const stream = originalStream(request);
        for await (const task of stream) {
          yield task;
        }
      },
    };
  }

  private async ensureHistoryLoaded(): Promise<void> {
    if (this.historyLoaded || this.loadingHistory) {
      return;
    }

    this.loadingHistory = true;

    try {
      // Load contexts with includeLastTask=true
      console.log('[A2AClientWithAutoHistory] Loading contexts from server...');
      const contexts = await this.history.listContexts({
        includeLastTask: true,
        limit: 20,
      });
      console.log(`[A2AClientWithAutoHistory] Loaded ${contexts.length} contexts`);

      // If we have contexts, load tasks for the most recent one
      if (contexts.length > 0 && !contexts[0].isArchived) {
        console.log(`[A2AClientWithAutoHistory] Loading tasks for context ${contexts[0].id}...`);
        const tasks = await this.history.listTasks(contexts[0].id);
        console.log(`[A2AClientWithAutoHistory] Loaded ${tasks.length} tasks`);
      }

      this.historyLoaded = true;
    } catch (error) {
      console.error('[A2AClientWithAutoHistory] Failed to load history:', error);
      // Don't throw - allow normal operation to continue
    } finally {
      this.loadingHistory = false;
    }
  }
}
