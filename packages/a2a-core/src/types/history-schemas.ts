import { z } from 'zod';

// Task history message schema - represents a message in the task history
const TaskHistoryMessageSchema = z.object({
  messageId: z.string(),
  taskId: z.string(),
  contextId: z.string(),
  role: z.enum(['User', 'Agent']),
  parts: z.array(
    z.object({
      text: z.string().optional(),
      kind: z.enum(['Text', 'Data']),
      data: z.unknown().optional(),
    })
  ),
  kind: z.literal('Message'),
});

// Task status schema
const TaskStatusSchema = z.object({
  state: z.enum(['Submitted', 'InProgress', 'Completed', 'Failed']),
  message: TaskHistoryMessageSchema.optional(),
  timestamp: z.string(),
});

// Task history schema - represents a task with its history
const TaskHistorySchema = z.object({
  id: z.string(),
  contextId: z.string(),
  taskStatus: TaskStatusSchema,
  history: z.array(TaskHistoryMessageSchema),
  kind: z.literal('Task'),
});

// Context schema - represents a conversation thread
const ContextSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  isArchived: z.boolean(),
  lastTask: TaskHistorySchema.optional(),
  // Additional fields that may be returned by the API
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// List contexts request params
export const ListContextsParamsSchema = z.object({
  limit: z.number().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  includeLastTask: z.boolean().optional(),
  includeArchived: z.boolean().optional(),
});

// List tasks request params
export const ListTasksParamsSchema = z.object({
  Id: z.string(),
});

// Update context request params
export const UpdateContextParamsSchema = z.object({
  Id: z.string(),
  Name: z.string().optional(),
  IsArchived: z.boolean().optional(),
});

// Type exports
export type TaskHistoryMessage = z.infer<typeof TaskHistoryMessageSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskHistory = z.infer<typeof TaskHistorySchema>;
export type Context = z.infer<typeof ContextSchema>;
export type ListContextsParams = z.infer<typeof ListContextsParamsSchema>;
export type ListTasksParams = z.infer<typeof ListTasksParamsSchema>;
export type UpdateContextParams = z.infer<typeof UpdateContextParamsSchema>;
