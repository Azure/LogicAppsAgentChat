import type { Task, Message } from '../types';
import { MessageTransformer } from './message-transformer';

/**
 * Manages task state accumulation during streaming
 */
export class TaskStateManager {
  private currentTask: Task | null = null;

  /**
   * Process a streaming update and return the updated task
   */
  processUpdate(result: any, jsonRpcData?: any): Task | null {
    // Handle different response formats
    if (this.isLegacyFormat(result)) {
      return this.handleLegacyUpdate(result, jsonRpcData);
    }

    switch (result.kind) {
      case 'task':
        return this.handleTaskInit(result, jsonRpcData);
      case 'status-update':
        return this.handleStatusUpdate(result, jsonRpcData);
      case 'artifact-update':
        return this.handleArtifactUpdate(result, jsonRpcData);
      default:
        return this.handleUnknownFormat(result);
    }
  }

  /**
   * Check if the stream is complete
   */
  isComplete(result: any): boolean {
    return (
      result.final ||
      result.state === 'completed' ||
      result.state === 'failed' ||
      result.status?.state === 'completed' ||
      result.status?.state === 'failed'
    );
  }

  /**
   * Get current task state
   */
  getCurrentTask(): Task | null {
    return this.currentTask;
  }

  private isLegacyFormat(result: any): boolean {
    return !result.kind && result.id && result.state;
  }

  private handleLegacyUpdate(result: any, jsonRpcData?: any): Task {
    if (!this.currentTask || this.currentTask.id !== result.id) {
      // New task
      this.currentTask = {
        id: result.id,
        state: result.state,
        createdAt: result.createdAt || new Date().toISOString(),
        messages: result.messages || [],
        artifacts: result.artifacts || [],
        ...(result.contextId && { contextId: result.contextId }),
        ...(jsonRpcData?.contextId && { contextId: jsonRpcData.contextId }),
      };
    } else {
      // Update existing task
      this.currentTask = {
        ...this.currentTask,
        state: result.state,
        updatedAt: result.updatedAt || new Date().toISOString(),
        messages: result.messages || this.currentTask.messages,
        artifacts: result.artifacts || this.currentTask.artifacts,
        ...(result.contextId && { contextId: result.contextId }),
      };
    }

    return this.cloneTask();
  }

  private handleTaskInit(result: any, jsonRpcData?: any): Task {
    this.currentTask = {
      id: result.id,
      state: result.status?.state === 'submitted' ? 'pending' : 'running',
      createdAt: result.status?.timestamp || new Date().toISOString(),
      messages: [],
      artifacts: [],
      ...(result.contextId && { contextId: result.contextId }),
      ...(jsonRpcData?.contextId && { contextId: jsonRpcData.contextId }),
    };

    return this.cloneTask();
  }

  private handleStatusUpdate(result: any, _jsonRpcData?: any): Task {
    if (!this.currentTask) {
      this.currentTask = {
        id: result.taskId || result.id,
        state: 'running',
        createdAt: new Date().toISOString(),
        messages: [],
        artifacts: [],
      };
    }

    // Update state
    this.currentTask.state = this.mapTaskState(result.status?.state);
    this.currentTask.updatedAt = result.status?.timestamp || new Date().toISOString();

    // Update contextId
    if (result.contextId) {
      (this.currentTask as any).contextId = result.contextId;
    }

    // Add new message if present (ACCUMULATE, don't replace)
    if (result.status?.message?.parts) {
      const content = MessageTransformer.fromA2AMessageParts(result.status.message.parts);
      if (content.length > 0) {
        // Create a new message and add it to the existing messages
        const newMessage = {
          role: result.status.message.role === 'agent' ? 'assistant' : 'user',
          content,
        } as Message;

        // Accumulate messages - add to existing array
        this.currentTask.messages = [...this.currentTask.messages, newMessage];
      }
    }

    return this.cloneTask();
  }

  private handleArtifactUpdate(result: any, _jsonRpcData?: any): Task {
    if (!this.currentTask) {
      this.currentTask = {
        id: result.taskId || `task-${Date.now()}`,
        state: 'running',
        createdAt: new Date().toISOString(),
        messages: [],
        artifacts: [],
      };
    }

    // Handle streaming text content
    if (result.artifact?.parts) {
      const textContent = this.extractTextFromParts(result.artifact.parts);

      if (textContent) {
        if (!result.append) {
          // Start new message
          this.currentTask.messages.push({
            role: 'assistant',
            content: [{ type: 'text', content: textContent }],
          } as Message);
        } else {
          // Append to last message
          this.appendToLastMessage(textContent);
        }
      }
    }

    // Handle complete artifacts
    if (result.artifact && !result.artifact.parts) {
      this.updateArtifact(result.artifact);
    }

    if (result.lastChunk) {
      this.currentTask.state = 'completed';
    }

    return this.cloneTask();
  }

  private handleUnknownFormat(result: any): Task {
    if (!this.currentTask) {
      this.currentTask = {
        id: result.id || `task-${Date.now()}`,
        state: 'running',
        createdAt: new Date().toISOString(),
        messages: [],
        artifacts: [],
      };
    }
    return this.cloneTask();
  }

  private mapTaskState(state?: string): Task['state'] {
    switch (state) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'running';
    }
  }

  private extractTextFromParts(parts: any[]): string {
    return parts
      .filter((p: any) => p.kind === 'Text' || p.kind === 'text')
      .map((p: any) => p.text || '')
      .join('');
  }

  private appendToLastMessage(text: string): void {
    if (!this.currentTask?.messages.length) return;

    const lastMessage = this.currentTask.messages[this.currentTask.messages.length - 1];
    if (lastMessage.role === 'assistant' && lastMessage.content.length > 0) {
      const lastContent = lastMessage.content[lastMessage.content.length - 1];
      if (lastContent.type === 'text') {
        lastContent.content += text;
      }
    }
  }

  private updateArtifact(artifact: any): void {
    if (!this.currentTask) return;

    const existingIndex = this.currentTask.artifacts?.findIndex((a) => a.id === artifact.id);

    if (existingIndex === -1 || existingIndex === undefined) {
      this.currentTask.artifacts = [...(this.currentTask.artifacts || []), artifact];
    } else {
      this.currentTask.artifacts![existingIndex] = artifact;
    }
  }

  private cloneTask(): Task {
    if (!this.currentTask) {
      throw new Error('No current task to clone');
    }

    return {
      ...this.currentTask,
      messages: [...this.currentTask.messages],
      artifacts: this.currentTask.artifacts ? [...this.currentTask.artifacts] : [],
      ...((this.currentTask as any).contextId && {
        contextId: (this.currentTask as any).contextId,
      }),
    };
  }
}
