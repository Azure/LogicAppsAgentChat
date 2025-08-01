import { SSEClient } from '../streaming/sse-client';
import { TaskStateManager } from './task-state-manager';
import { AuthHandler } from './auth-handler';
import type { Task } from '../types';
import type { AuthRequiredHandler } from './types';

interface StreamConfig {
  url: string;
  headers: Record<string, string>;
  body: string;
  withCredentials: boolean;
  onUnauthorized?: (event: any) => void | Promise<void>;
  onAuthRequired?: AuthRequiredHandler;
}

/**
 * Simplified streaming iterator for A2A messages
 */
export class StreamIterator {
  private sseClient: SSEClient | null = null;
  private taskManager = new TaskStateManager();
  private authHandler: AuthHandler;
  private messageQueue: Task[] = [];
  private isComplete = false;
  private error: Error | null = null;

  constructor(
    private config: StreamConfig,
    authHandler?: AuthRequiredHandler
  ) {
    this.authHandler = new AuthHandler(authHandler);
  }

  /**
   * Create async iterator for streaming
   */
  async *iterate(): AsyncIterableIterator<Task> {
    try {
      await this.connect();

      while (!this.isComplete || this.messageQueue.length > 0) {
        // Yield queued messages first
        if (this.messageQueue.length > 0) {
          yield this.messageQueue.shift()!;
          continue;
        }

        // Check for errors
        if (this.error) {
          throw this.error;
        }

        // Wait for new messages
        await this.waitForMessages();
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * Get SSE client for testing
   */
  getSseClient() {
    return this.sseClient;
  }

  /**
   * Connect to SSE endpoint
   */
  private async connect(): Promise<void> {
    this.sseClient = new SSEClient(this.config.url, {
      method: 'POST',
      headers: this.config.headers,
      body: this.config.body,
      withCredentials: this.config.withCredentials,
      onUnauthorized: this.config.onUnauthorized,
    });

    this.sseClient.onMessage(this.handleMessage.bind(this));
    this.sseClient.onError(this.handleError.bind(this));
  }

  /**
   * Handle incoming SSE message
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      // Parse JSON-RPC data
      const jsonRpcData =
        typeof message.data === 'string' ? JSON.parse(message.data) : message.data;

      // Check for JSON-RPC error
      if (jsonRpcData.error) {
        this.error = new Error(
          `JSON-RPC error: ${jsonRpcData.error.message || JSON.stringify(jsonRpcData.error)}`
        );
        this.isComplete = true;
        return;
      }

      const result = jsonRpcData.result || jsonRpcData;

      // Handle auth required
      const currentTask = this.taskManager.getCurrentTask();
      if (currentTask) {
        await this.authHandler.handleAuthRequired(result, currentTask.id);
      }

      // Process update
      const updatedTask = this.taskManager.processUpdate(result, jsonRpcData);
      if (updatedTask) {
        this.messageQueue.push(updatedTask);
      }

      // Check if complete
      if (this.taskManager.isComplete(result)) {
        this.isComplete = true;
      }
    } catch (error) {
      this.error = error as Error;
      this.isComplete = true;
    }
  }

  /**
   * Handle SSE error
   */
  private handleError(error: Error): void {
    this.error = error;
    this.isComplete = true;
  }

  /**
   * Wait for new messages to arrive
   */
  private async waitForMessages(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.error) {
          clearInterval(checkInterval);
          reject(this.error);
        } else if (this.messageQueue.length > 0 || this.isComplete) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.sseClient) {
      this.sseClient.close();
      this.sseClient = null;
    }
  }
}
