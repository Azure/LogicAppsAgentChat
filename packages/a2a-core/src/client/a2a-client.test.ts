import { describe, it, expect, vi, beforeEach } from 'vitest';
import { A2AClient } from './a2a-client';
import type { AgentCard, Task, Message } from '../types';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock dependencies
vi.mock('./http-client');
vi.mock('../discovery/agent-discovery');

describe('A2AClient', () => {
  let client: A2AClient;
  let mockAgentCard: AgentCard;
  
  beforeEach(() => {
    mockAgentCard = getMockAgentCard({
      url: 'https://api.test-agent.com',
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false
      }
    });
    
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with agent card and auth config', async () => {
      client = new A2AClient({
        agentCard: mockAgentCard,
        auth: {
          type: 'bearer',
          token: 'test-token'
        }
      });

      expect(client.getAgentCard()).toEqual(mockAgentCard);
      expect(client.getCapabilities()).toEqual(mockAgentCard.capabilities);
      expect(client.getServiceEndpoint()).toBe('https://api.test-agent.com');
    });

    it('should initialize with custom HTTP options', async () => {
      client = new A2AClient({
        agentCard: mockAgentCard,
        httpOptions: {
          timeout: 60000,
          retries: 5
        }
      });

      expect(client.getAgentCard()).toEqual(mockAgentCard);
    });
  });

  describe('message operations', () => {
    beforeEach(() => {
      client = new A2AClient({
        agentCard: mockAgentCard,
        auth: {
          type: 'bearer',
          token: 'test-token'
        }
      });
    });

    it('should send a message', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'pending',
        createdAt: new Date().toISOString(),
        messages: []
      };

      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post = vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        result: mockTask,
        id: 1
      });

      const message: Message = {
        role: 'user',
        content: [
          {
            type: 'text',
            content: 'Hello, agent!'
          }
        ]
      };

      const result = await client.message.send({
        message,
        context: { sessionId: 'session-123' }
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/',
        expect.objectContaining({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: expect.objectContaining({
              kind: 'message',
              role: 'user',
              parts: [
                {
                  kind: 'text',
                  text: 'Hello, agent!'
                }
              ]
            }),
            configuration: { sessionId: 'session-123' }
          },
          id: expect.any(Number)
        })
      );
      expect(result).toEqual(mockTask);
    });

    it('should validate message before sending', async () => {
      const invalidMessage = {
        role: 'invalid-role',
        content: []
      };

      await expect(client.message.send({
        message: invalidMessage as any
      })).rejects.toThrow('Invalid message');
    });
  });

  describe('task operations', () => {
    beforeEach(() => {
      client = new A2AClient({
        agentCard: mockAgentCard,
        auth: {
          type: 'bearer',
          token: 'test-token'
        }
      });
    });

    it('should get task by ID', async () => {
      const mockTask: Task = {
        id: 'task-456',
        state: 'completed',
        createdAt: new Date().toISOString(),
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Test' }]
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Response' }]
          }
        ]
      };

      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.get = vi.fn().mockResolvedValue(mockTask);

      const result = await client.task.get('task-456');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tasks/task-456');
      expect(result).toEqual(mockTask);
    });

    it('should cancel task', async () => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post = vi.fn().mockResolvedValue({ success: true });

      await client.task.cancel('task-789', 'User requested');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/tasks/task-789/cancel',
        {
          reason: 'User requested'
        }
      );
    });

    it('should poll task status', async () => {
      const mockTask: Task = {
        id: 'task-999',
        state: 'running',
        createdAt: new Date().toISOString(),
        messages: []
      };

      const completedTask: Task = {
        ...mockTask,
        state: 'completed'
      };

      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.get = vi.fn()
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(completedTask);

      const result = await client.task.waitForCompletion('task-999', {
        pollingInterval: 100,
        timeout: 1000
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual(completedTask);
    });

    it('should timeout when polling task', async () => {
      const mockTask: Task = {
        id: 'task-timeout',
        state: 'running',
        createdAt: new Date().toISOString(),
        messages: []
      };

      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.get = vi.fn().mockResolvedValue(mockTask);

      await expect(client.task.waitForCompletion('task-timeout', {
        pollingInterval: 100,
        timeout: 300
      })).rejects.toThrow('Timeout waiting for task completion');
    });
  });

  describe('capability checking', () => {
    it('should check if agent has capability', () => {
      client = new A2AClient({
        agentCard: mockAgentCard
      });

      expect(client.hasCapability('streaming')).toBe(true);
      expect(client.hasCapability('pushNotifications')).toBe(false);
    });

    it('should get all capabilities', () => {
      client = new A2AClient({
        agentCard: mockAgentCard
      });

      const capabilities = client.getCapabilities();
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.pushNotifications).toBe(false);
      expect(capabilities.stateTransitionHistory).toBe(false);
    });
  });
});