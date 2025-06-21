/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2AClient } from './A2AClient';
import type {
  AgentCard,
  SendMessageResponse,
  Message,
  Task,
  TaskStatusUpdateEvent,
  GetTaskResponse
} from './types';

// Mock data
const mockAgentUrl = 'https://agent.example.com';
const mockAgentCardSSE: AgentCard = {
  name: 'Test Agent',
  version: '1.0.0',
  description: 'Test agent with SSE support',
  url: 'https://agent.example.com/rpc',
  capabilities: {
    streaming: true,
    pushNotifications: true,
    stateTransitionHistory: true
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: []
};

const mockAgentCardNoSSE: AgentCard = {
  ...mockAgentCardSSE,
  capabilities: {
    streaming: false,
    pushNotifications: true,
    stateTransitionHistory: true
  }
};

const mockMessage: Message = {
  kind: 'message',
  messageId: 'msg-123',
  role: 'agent',
  parts: [{ kind: 'text', text: 'Hello from agent!' }]
};

const mockTask: Task = {
  kind: 'task',
  id: 'task-123',
  contextId: 'context-123',
  status: {
    state: 'working',
    timestamp: new Date().toISOString()
  },
  history: []
};

describe('A2AClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should fetch agent card on initialization', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const agentCard = await client.getAgentCard();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockAgentUrl}/.well-known/agent.json`,
        { headers: { 'Accept': 'application/json' } }
      );
      expect(agentCard).toEqual(mockAgentCardSSE);
    });

    it('should handle agent card fetch failure', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const client = new A2AClient(mockAgentUrl);

      await expect(client.getAgentCard()).rejects.toThrow(
        'Failed to fetch Agent Card'
      );
    });

    it('should detect SSE support correctly', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const supportsSSE = await client.supportsStreaming();

      expect(supportsSSE).toBe(true);
    });

    it('should detect lack of SSE support', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardNoSSE
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const supportsSSE = await client.supportsStreaming();

      expect(supportsSSE).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Mock message send
      const mockResponse: SendMessageResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: mockMessage
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const response = await client.sendMessage({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2); // agent card + message
    });

    it('should handle RPC errors', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Mock error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params'
          }
        }),
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params'
          }
        })
      } as Response);

      const client = new A2AClient(mockAgentUrl);

      const response = await client.sendMessage({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      expect('error' in response).toBe(true);
      const errorResponse = response as { error: { code: number; message: string } };
      expect(errorResponse.error.message).toBe('Invalid params');
      expect(errorResponse.error.code).toBe(-32602);
    });

    it('should work with both SSE and non-SSE agents', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Test with non-SSE agent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardNoSSE
      } as Response);

      // Mock message send
      const mockResponse: SendMessageResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: mockTask
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const response = await client.sendMessage({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      expect(response).toEqual(mockResponse);
      // Should just return the response without any polling
    });
  });

  describe('streaming with SSE', () => {
    it('should stream messages using SSE when supported', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Create a mock SSE stream
      const sseData = [
        `data: {"jsonrpc":"2.0","id":1,"result":${JSON.stringify(mockMessage)}}\n\n`,
        `data: {"jsonrpc":"2.0","id":1,"result":${JSON.stringify(mockTask)}}\n\n`
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          sseData.forEach(data => {
            controller.enqueue(encoder.encode(data));
          });
          controller.close();
        }
      });

      // Mock SSE response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: stream
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const results: any[] = [];

      for await (const event of client.sendMessageStream({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      })) {
        results.push(event);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockMessage);
      expect(results[1]).toEqual(mockTask);
    });

    it('should throw error when SSE is not supported', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch (no SSE)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardNoSSE
      } as Response);

      const client = new A2AClient(mockAgentUrl);

      await expect(async () => {
        for await (const _event of client.sendMessageStream({
          message: {
            kind: 'message',
            messageId: 'user-msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello!' }]
          },
          configuration: {
            acceptedOutputModes: ['text']
          }
        })) {
          // Should not reach here
        }
      }).rejects.toThrow('Agent does not support streaming (SSE)');
    });

    it('should handle SSE errors', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Mock SSE error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const stream = client.sendMessageStream({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      await expect(async () => {
        for await (const _event of stream) {
          // Should not reach here
        }
      }).rejects.toThrow('HTTP error establishing stream');
    });
  });

  describe('task operations', () => {

    it('should get task details', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      const taskResponse: GetTaskResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: mockTask
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => taskResponse
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const response = await client.getTask({ id: 'task-123' });

      expect(response).toEqual(taskResponse);
    });

    it('should cancel a task', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      const cancelledTask: Task = {
        ...mockTask,
        status: { state: 'canceled', timestamp: new Date().toISOString() }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: cancelledTask
        })
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const response = await client.cancelTask({ id: 'task-123' });

      if ('result' in response) {
        expect(response.result).toEqual(cancelledTask);
      } else {
        throw new Error(`Expected success response, got error: ${JSON.stringify(response)}`);
      }
    });

    it('should throw error when resubscribing without SSE support', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockClear();

      // Mock agent card fetch (no SSE)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardNoSSE
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      // Wait for agent card to be fetched
      await client.getAgentCard();

      await expect(async () => {
        for await (const _event of client.resubscribeTask({ id: 'task-123' })) {
          // Should not reach here
        }
      }).rejects.toThrow('Agent does not support streaming (SSE). Task resubscription requires SSE support.');
    });

    it('should resubscribe to task with SSE', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch with SSE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Create a mock SSE stream for resubscribe
      const statusUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: 'task-123',
        contextId: 'context-123',
        status: { state: 'completed', timestamp: new Date().toISOString() },
        final: true
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(
            `data: {"jsonrpc":"2.0","id":1,"result":${JSON.stringify(statusUpdate)}}\n\n`
          ));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: stream
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const results: any[] = [];

      for await (const event of client.resubscribeTask({ id: 'task-123' })) {
        results.push(event);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(statusUpdate);
    });
  });

  describe('push notifications', () => {
    it('should set push notification config when supported', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card with push notification support
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Mock push notification config response
      const pushConfig = {
        taskId: 'task-123',
        pushNotificationConfig: {
          url: 'https://webhook.example.com',
          token: 'secret-token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: pushConfig
        })
      } as Response);

      const client = new A2AClient(mockAgentUrl);
      const response = await client.setTaskPushNotificationConfig(pushConfig);

      if ('result' in response) {
        expect(response.result).toEqual(pushConfig);
      } else {
        throw new Error(`Expected success response, got error: ${JSON.stringify(response)}`);
      }
    });

    it('should throw error when push notifications not supported', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card without push notification support
      const noPushCard = {
        ...mockAgentCardSSE,
        capabilities: {
          ...mockAgentCardSSE.capabilities,
          pushNotifications: false
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noPushCard
      } as Response);

      const client = new A2AClient(mockAgentUrl);

      await expect(client.setTaskPushNotificationConfig({
        taskId: 'task-123',
        pushNotificationConfig: {
          url: 'https://webhook.example.com'
        }
      })).rejects.toThrow('Agent does not support push notifications');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new A2AClient(mockAgentUrl);

      await expect(client.getAgentCard()).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      const mockFetch = vi.mocked(global.fetch);

      // Mock agent card fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCardSSE
      } as Response);

      // Mock malformed response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      } as unknown as Response);

      const client = new A2AClient(mockAgentUrl);

      await expect(client.sendMessage({
        message: {
          kind: 'message',
          messageId: 'user-msg-123',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello!' }]
        },
        configuration: {
          acceptedOutputModes: ['text']
        }
      })).rejects.toThrow();
    });
  });
});