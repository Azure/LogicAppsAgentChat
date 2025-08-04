/**
 * ServerHistoryService - Handles fetching chat history from the server
 * Uses the A2A client to make JSON-RPC calls to the server
 */

import type { Message } from '@microsoft/a2achat-core/react';
import type {
  ServerContext,
  ServerTask,
  ServerMessage,
  ConversationData,
  ContextListResponse,
  TaskListResponse,
} from './types';

export class ServerHistoryService {
  private agentUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(agentUrl: string) {
    // Use the agent URL directly - this should be the same URL used for sending messages
    // e.g., https://host/api/agents/agentname or /api/agents/agentname
    // Remove any .well-known/agent.json suffix if present
    this.agentUrl = agentUrl.replace(/\/\.well-known\/agent\.json$/, '').replace(/\/$/, '');
  }

  /**
   * Fetch contexts (conversation threads) from the server
   */
  async fetchContexts(params?: {
    limit?: number;
    includeLastTask?: boolean;
    includeArchived?: boolean;
  }): Promise<ServerContext[]> {
    const cacheKey = `contexts-${JSON.stringify(params)}`;
    const cached = this.getFromCache<ServerContext[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest<ContextListResponse>('contexts/list', {
        limit: params?.limit || 20,
        includeLastTask: params?.includeLastTask !== false,
        includeArchived: params?.includeArchived || false,
      });

      console.log('[ServerHistoryService] Raw contexts response:', response);

      // The response might be directly an array or nested in result
      let contexts: ServerContext[] = [];

      if (Array.isArray(response)) {
        contexts = response;
      } else if (response.result) {
        if (Array.isArray(response.result)) {
          contexts = response.result;
        } else if (response.result.contexts) {
          contexts = response.result.contexts;
        }
      } else if ((response as any).contexts) {
        contexts = (response as any).contexts;
      }

      console.log('[ServerHistoryService] Parsed contexts:', contexts);
      this.setCache(cacheKey, contexts);
      return contexts;
    } catch (error) {
      console.error('[ServerHistoryService] Failed to fetch contexts:', error);
      throw error;
    }
  }

  /**
   * Fetch tasks (conversations) for a specific context
   */
  async fetchTasks(contextId: string, skipCache: boolean = false): Promise<ServerTask[]> {
    console.log(
      `[ServerHistoryService] fetchTasks called with contextId: "${contextId}", skipCache: ${skipCache}`
    );

    if (!contextId) {
      console.error('[ServerHistoryService] fetchTasks called with undefined/empty contextId');
      throw new Error('Context ID is required to fetch tasks');
    }

    const cacheKey = `tasks-${contextId}`;
    if (!skipCache) {
      const cached = this.getFromCache<ServerTask[]>(cacheKey);
      if (cached) {
        console.log(`[ServerHistoryService] Returning cached tasks for ${contextId}`);
        return cached;
      }
    } else {
      console.log(`[ServerHistoryService] Skipping cache for ${contextId}, forcing network fetch`);
    }

    try {
      // Try different field name formats that the server might expect
      const params = {
        Id: contextId,
        id: contextId, // Also include lowercase version
        contextId: contextId, // And full field name
      };

      console.log(`[ServerHistoryService] Requesting tasks with params:`, params);

      const response = await this.makeRequest<TaskListResponse>('tasks/list', params);

      console.log('[ServerHistoryService] Raw tasks response:', response);

      // The response might be directly an array or nested in result
      let tasks: ServerTask[] = [];

      if (Array.isArray(response)) {
        tasks = response;
      } else if (response.result) {
        if (Array.isArray(response.result)) {
          tasks = response.result;
        } else if (response.result.tasks) {
          tasks = response.result.tasks;
        }
      } else if ((response as any).tasks) {
        tasks = (response as any).tasks;
      }

      console.log('[ServerHistoryService] Parsed tasks:', tasks);
      // Only cache if we're not skipping cache
      if (!skipCache) {
        this.setCache(cacheKey, tasks);
      }
      return tasks;
    } catch (error) {
      console.error(
        `[ServerHistoryService] Failed to fetch tasks for context ${contextId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch full conversation including all messages
   */
  async fetchFullConversation(
    contextId: string,
    skipCache: boolean = false
  ): Promise<ConversationData> {
    const cacheKey = `conversation-${contextId}`;
    if (!skipCache) {
      const cached = this.getFromCache<ConversationData>(cacheKey);
      if (cached) {
        console.log(`[ServerHistoryService] Returning cached conversation for ${contextId}`);
        return cached;
      }
    } else {
      console.log(
        `[ServerHistoryService] Skipping cache for conversation ${contextId}, forcing fresh fetch`
      );
    }

    try {
      const tasks = await this.fetchTasks(contextId, skipCache);
      const conversation = this.assembleConversation(contextId, tasks);
      // Only cache if we're not skipping cache
      if (!skipCache) {
        this.setCache(cacheKey, conversation);
      }
      return conversation;
    } catch (error) {
      console.error(`[ServerHistoryService] Failed to fetch conversation ${contextId}:`, error);
      throw error;
    }
  }

  /**
   * Update context metadata on the server (name and archive status)
   */
  async updateContext(
    contextId: string,
    updates: { name?: string; isArchived?: boolean }
  ): Promise<void> {
    try {
      const params: any = {
        Id: contextId,
      };

      // Add name if provided
      if (updates.name !== undefined) {
        params.Name = updates.name;
      }

      // Add archive status if provided
      if (updates.isArchived !== undefined) {
        params.IsArchived = updates.isArchived;
      }

      console.log(`[ServerHistoryService] Updating context ${contextId}:`, params);

      await this.makeRequest<any>('contexts/update', params);

      // Clear cache for this context
      const cacheKey = `conversation-${contextId}`;
      this.cache.delete(cacheKey);
      this.cache.delete(`tasks-${contextId}`);

      console.log(`[ServerHistoryService] Successfully updated context ${contextId}`);
    } catch (error) {
      console.error(`[ServerHistoryService] Failed to update context ${contextId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a context exists on the server
   */
  async contextExists(contextId: string): Promise<boolean> {
    try {
      const contexts = await this.fetchContexts({ includeArchived: true });
      return contexts.some((ctx) => {
        // Handle flexible field names
        const ctxId = ctx.Id || (ctx as any).id || (ctx as any).ID;
        return ctxId === contextId;
      });
    } catch {
      return false;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a specific context
   */
  invalidateContext(contextId: string): void {
    // Remove all cache entries related to this context
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(contextId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Make JSON-RPC request to the server
   */
  private async makeRequest<T>(method: string, params: any): Promise<T> {
    const requestId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const requestBody = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    console.log(`[ServerHistoryService] Making request to ${this.agentUrl}:`, {
      method,
      params,
    });

    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`[ServerHistoryService] Request failed:`, {
        url: this.agentUrl,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Server request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[ServerHistoryService] Server returned error:`, data.error);
      throw new Error(`Server error: ${data.error.message || 'Unknown error'}`);
    }

    console.log(`[ServerHistoryService] Request successful:`, {
      method,
      hasResult: !!data.result,
      resultType: data.result ? typeof data.result : 'undefined',
      dataKeys: Object.keys(data),
    });

    // Log the actual result structure for debugging
    if (method === 'contexts/list' || method === 'tasks/list') {
      console.log(`[ServerHistoryService] Response data structure:`, data);
    }

    return data as T;
  }

  /**
   * Transform server tasks into a conversation
   */
  private assembleConversation(contextId: string, tasks: ServerTask[]): ConversationData {
    console.log(
      `[ServerHistoryService] Assembling conversation for ${contextId} with ${tasks.length} tasks`
    );

    console.log(
      `[ServerHistoryService] Task details:`,
      tasks.map((t) => ({
        Id: t.Id || (t as any).id,
        hasMessages: !!t.Messages,
        messageCount: t.Messages?.length || 0,
        hasHistory: !!(t as any).history,
        historyCount: (t as any).history?.length || 0,
      }))
    );

    // Flatten all messages from all tasks
    const messages: Message[] = [];

    // IMPORTANT: Tasks come in newest-first order, so we need to reverse them
    // to get chronological order (oldest first)
    const chronologicalTasks = [...tasks].reverse();

    for (const task of chronologicalTasks) {
      // Handle flexible field names for task ID
      const taskId = task.Id || (task as any).id || (task as any).ID || 'unknown';

      // Check for messages in different possible field names - including 'history'
      const taskMessages =
        task.Messages || (task as any).messages || (task as any).Outputs || (task as any).history;

      if (taskMessages && Array.isArray(taskMessages)) {
        console.log(
          `[ServerHistoryService] Processing ${taskMessages.length} messages from task ${taskId}`
        );

        // IMPORTANT: Messages within a task also come in newest-first order
        // So we need to reverse them too for chronological order
        const chronologicalMessages = [...taskMessages].reverse();

        for (const serverMsg of chronologicalMessages) {
          // If history items have different structure, handle them
          if ((task as any).history === taskMessages) {
            // History items might be simpler message format
            const transformedMsg = this.transformHistoryMessage(serverMsg, taskId);
            if (transformedMsg) {
              messages.push(transformedMsg);
            }
          } else {
            messages.push(this.transformServerMessage(serverMsg, taskId));
          }
        }
      } else {
        console.log(
          `[ServerHistoryService] No messages found in task ${taskId}, available fields:`,
          Object.keys(task)
        );
        console.log(`[ServerHistoryService] Task content:`, JSON.stringify(task, null, 2));
      }
    }

    return {
      contextId,
      messages,
      tasks,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Transform history item to client message format
   * History items might have a simpler structure than full ServerMessage
   */
  private transformHistoryMessage(historyItem: any, taskId: string): Message | null {
    // Handle different possible structures for history items
    if (!historyItem) return null;

    // If it has the standard ServerMessage structure, use the normal transformer
    if (historyItem.parts && Array.isArray(historyItem.parts)) {
      return this.transformServerMessage(historyItem as ServerMessage, taskId);
    }

    // Handle simpler message formats
    let content = '';
    let sender: 'user' | 'assistant' | 'system' = 'user';
    let timestamp = new Date();

    // Extract content - could be in various fields
    if (typeof historyItem === 'string') {
      content = historyItem;
    } else if (historyItem.text) {
      content = historyItem.text;
    } else if (historyItem.content) {
      content = historyItem.content;
    } else if (historyItem.message) {
      content = historyItem.message;
    }

    // Extract role/sender (case-insensitive)
    if (historyItem.role) {
      const roleLower = historyItem.role.toLowerCase();
      if (roleLower === 'agent' || roleLower === 'assistant') {
        sender = 'assistant';
      } else if (roleLower === 'system') {
        sender = 'system';
      } else if (roleLower === 'user') {
        sender = 'user';
      }
    } else if (historyItem.sender) {
      const senderLower = historyItem.sender.toLowerCase();
      sender =
        senderLower === 'agent' || senderLower === 'assistant'
          ? 'assistant'
          : senderLower === 'system'
            ? 'system'
            : 'user';
    }

    // Extract timestamp - handle various formats
    if (historyItem.timestamp) {
      try {
        const parsedTime = new Date(historyItem.timestamp);
        if (!isNaN(parsedTime.getTime())) {
          timestamp = parsedTime;
        }
      } catch (error) {
        console.warn(`[ServerHistoryService] Error parsing history timestamp:`, error);
      }
    } else if (historyItem.createdAt) {
      try {
        const parsedTime = new Date(historyItem.createdAt);
        if (!isNaN(parsedTime.getTime())) {
          timestamp = parsedTime;
        }
      } catch (error) {
        console.warn(`[ServerHistoryService] Error parsing history createdAt:`, error);
      }
    } else if (historyItem.Timestamp) {
      try {
        const parsedTime = new Date(historyItem.Timestamp);
        if (!isNaN(parsedTime.getTime())) {
          timestamp = parsedTime;
        }
      } catch (error) {
        console.warn(`[ServerHistoryService] Error parsing history Timestamp:`, error);
      }
    }

    if (!content) {
      console.log(
        `[ServerHistoryService] Could not extract content from history item:`,
        historyItem
      );
      return null;
    }

    return {
      id:
        historyItem.id ||
        historyItem.messageId ||
        `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender,
      timestamp,
      metadata: {
        taskId,
        originalData: historyItem,
      },
    };
  }

  /**
   * Transform server message format to client message format
   */
  private transformServerMessage(serverMsg: ServerMessage, taskId: string): Message {
    // Extract text content from parts
    let content = '';
    let data: any = null;

    for (const part of serverMsg.parts) {
      // Handle different possible field names for the kind/type
      const partKind = part.kind || (part as any).type || (part as any).Kind || (part as any).Type;

      // The server is sending 'Text' with capital T
      if (partKind && partKind.toLowerCase() === 'text') {
        // Handle different possible field names for text content
        // Use type assertion since we know it's a text part based on the kind
        const textPart = part as any;
        content =
          textPart.text ||
          textPart.Text ||
          textPart.content ||
          textPart.Content ||
          textPart.TEXT ||
          '';
      } else if (
        partKind &&
        (partKind.toLowerCase() === 'data' || partKind.toLowerCase() === 'structured')
      ) {
        // Note: A2A protocol might use 'structured' instead of 'data'
        const dataPart = part as any;
        data = dataPart.data || dataPart.Data || dataPart.value || dataPart.Value || part;
      }

      // Fallback: if no kind field, check if it has text/data directly
      if (!partKind) {
        if ((part as any).text || (part as any).Text) {
          content = (part as any).text || (part as any).Text;
        }
        if ((part as any).data || (part as any).Data) {
          data = (part as any).data || (part as any).Data;
        }
      }

      // Additional fallback: if part is a simple object with specific structure
      // Some servers might send { "Text": "...", "Type": "text" } format
      if (!content && !partKind) {
        const possibleTextFields = [
          'text',
          'Text',
          'TEXT',
          'content',
          'Content',
          'message',
          'Message',
        ];
        for (const field of possibleTextFields) {
          if ((part as any)[field]) {
            content = (part as any)[field];
            break;
          }
        }
      }

      // Ultimate fallback: if still no content and part looks like it might be the content itself
      if (!content && typeof part === 'string') {
        content = part;
      }

      // If part is an object but we still have no content, log it for debugging
      if (!content && typeof part === 'object') {
        console.log(
          `[ServerHistoryService] Could not extract content from part:`,
          JSON.stringify(part)
        );
      }
    }

    // Map server role to Message sender field (case-insensitive)
    let sender: 'user' | 'assistant' | 'system' = 'user';
    const roleLower = serverMsg.role?.toLowerCase();
    if (roleLower === 'agent' || roleLower === 'assistant') {
      sender = 'assistant';
    } else if (roleLower === 'system') {
      sender = 'system';
    } else {
      // Default to 'user' for any other role including 'User'
      sender = 'user';
    }

    // Handle timestamp - might be undefined or invalid
    let timestamp = new Date();
    if (serverMsg.timestamp) {
      try {
        const parsedTime = new Date(serverMsg.timestamp);
        if (!isNaN(parsedTime.getTime())) {
          timestamp = parsedTime;
        } else {
          console.warn(`[ServerHistoryService] Invalid timestamp format: ${serverMsg.timestamp}`);
        }
      } catch (error) {
        console.warn(
          `[ServerHistoryService] Error parsing timestamp: ${serverMsg.timestamp}`,
          error
        );
      }
    }

    return {
      id: serverMsg.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender,
      timestamp,
      metadata: {
        ...serverMsg.metadata,
        taskId,
        data,
      },
    };
  }

  /**
   * Get data from cache if still valid
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}
