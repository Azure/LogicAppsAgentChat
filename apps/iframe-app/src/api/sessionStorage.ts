import { z } from 'zod';

// Schema definitions based on the API documentation
const ContextSchema = z.object({
  id: z.string(),
  isArchived: z.boolean(),
  name: z.string().optional(),
});

const MessagePartSchema = z.object({
  text: z.string(),
  kind: z.literal('Text'),
});

const MessageSchema = z.object({
  messageId: z.string(),
  taskId: z.string(),
  contextId: z.string(),
  role: z.enum(['Agent', 'User']),
  parts: z.array(MessagePartSchema),
  kind: z.literal('Message'),
});

const TaskStatusSchema = z.object({
  state: z.string(),
  message: MessageSchema,
  timestamp: z.string(),
});

const TaskSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  taskStatus: TaskStatusSchema,
  history: z.array(MessageSchema),
  kind: z.literal('Task'),
});

const ContextsListResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.array(ContextSchema),
});

const TasksListResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.array(TaskSchema),
});

const UpdateContextResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: ContextSchema,
});

// Types
export type Context = z.infer<typeof ContextSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Message = z.infer<typeof MessageSchema>;

// API client functions
export class SessionStorageAPI {
  constructor(private agentUrl: string) {}

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async listContexts(params?: {
    limit?: number;
    before?: string;
    after?: string;
    includeLastTask?: boolean;
  }): Promise<Context[]> {
    const requestId = this.generateRequestId();

    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'contexts/list',
        params: {
          limit: params?.limit || 20,
          includeLastTask: params?.includeLastTask || false,
          ...(params?.before && { before: params.before }),
          ...(params?.after && { after: params.after }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list contexts: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = ContextsListResponseSchema.parse(data);
    return parsed.result;
  }

  async listTasks(contextId: string): Promise<Task[]> {
    const requestId = this.generateRequestId();

    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tasks/list',
        params: {
          Id: contextId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = TasksListResponseSchema.parse(data);
    return parsed.result;
  }

  async updateContext(params: {
    contextId: string;
    name?: string;
    isArchived?: boolean;
  }): Promise<Context> {
    const requestId = this.generateRequestId();

    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'contexts/update',
        params: {
          Id: params.contextId,
          ...(params.name !== undefined && { Name: params.name }),
          ...(params.isArchived !== undefined && { IsArchived: params.isArchived }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update context: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = UpdateContextResponseSchema.parse(data);
    return parsed.result;
  }
}
