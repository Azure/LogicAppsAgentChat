import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useA2A } from './use-a2a';
import type { AgentCard } from '../types';

// Mock the A2A client
let mockStreamReturnValue: any = {
  async *[Symbol.asyncIterator]() {
    yield {
      id: 'task-1',
      state: 'completed',
      messages: [],
      artifacts: [],
    };
  },
};

vi.mock('../client/a2a-client', () => ({
  A2AClient: vi.fn().mockImplementation(() => ({
    message: {
      stream: vi.fn().mockImplementation(() => mockStreamReturnValue),
    },
    getCapabilities: vi.fn().mockReturnValue({
      streaming: true,
      stateTransitionHistory: true,
    }),
    history: {
      listContexts: vi.fn().mockResolvedValue([]),
      listTasks: vi.fn().mockResolvedValue([]),
      createContext: vi.fn().mockResolvedValue({ id: 'context-123' }),
    },
  })),
}));

vi.mock('../client/a2a-client-with-auto-history', () => ({
  A2AClientWithAutoHistory: vi.fn().mockImplementation(() => ({
    message: {
      stream: vi.fn().mockImplementation(() => mockStreamReturnValue),
    },
    getCapabilities: vi.fn().mockReturnValue({
      streaming: true,
      stateTransitionHistory: true,
    }),
    history: {
      listContexts: vi.fn().mockResolvedValue([]),
      listTasks: vi.fn().mockResolvedValue([]),
      createContext: vi.fn().mockResolvedValue({ id: 'context-123' }),
    },
  })),
}));

describe('useA2A', () => {
  let queryClient: QueryClient;

  const mockAgentCard: AgentCard = {
    name: 'Test Agent',
    description: 'Test agent for testing',
    version: '1.0.0',
    url: 'http://example.com/.well-known/agent.json',
    serviceEndpoint: 'http://example.com/agent',
    capabilities: [
      {
        features: ['streaming', 'artifacts'],
        outputModes: ['text', 'structured'],
        inputModes: ['text', 'structured'],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should connect with agent card', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentCard).toEqual(mockAgentCard);
  });

  it('should send message and update messages array', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    // Connect first
    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Mock the stream response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-123',
          state: 'completed',
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', content: 'Hello' }],
            },
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Hello! How can I help you?' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // Should have both user and assistant messages
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].content).toBe('Hello! How can I help you?');
    expect(result.current.messages[1].role).toBe('assistant');
  });

  it('should handle artifacts in responses', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Mock stream with artifacts
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-456',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Here is your code:' }],
            },
          ],
          artifacts: [
            {
              artifactId: 'file.js',
              name: 'file.js',
              parts: [{ kind: 'text', text: 'console.log("Hello");' }],
            },
          ],
        };
      },
    };

    await act(async () => {
      await result.current.sendMessage('Create a file');
    });

    // Should have user message + assistant message + artifact message
    expect(result.current.messages).toHaveLength(3);

    // Check artifact message
    const artifactMessage = result.current.messages[2];
    expect(artifactMessage.content).toContain('file.js');
    expect(artifactMessage.metadata?.artifacts).toHaveLength(1);
    expect(artifactMessage.metadata?.artifacts[0]).toMatchObject({
      artifactId: 'file.js',
      name: 'file.js',
    });
  });

  it('should handle loading states', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Mock slow stream
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield {
          id: 'task-789',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Response' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    let loadingCapture = false;
    act(() => {
      result.current.sendMessage('Test').then(() => {
        loadingCapture = result.current.isLoading;
      });
    });

    // Should be loading immediately after send
    expect(result.current.isLoading).toBe(true);

    // Wait for completion
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should disconnect and clear state', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    // Connect and send message
    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.messages.length).toBeGreaterThan(0);

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.agentCard).toBeUndefined();
  });

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Mock stream that throws error
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        throw new Error('Stream error');
      },
    };

    // Need to use act for the error to be set in state
    await act(async () => {
      await expect(result.current.sendMessage('Test')).rejects.toThrow('Stream error');
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Stream error');
  });

  it('should throw error when sending message without connection', async () => {
    const { result } = renderHook(() => useA2A(), { wrapper });

    await expect(result.current.sendMessage('Test')).rejects.toThrow('Not connected to agent');
  });

  it('should clear messages', async () => {
    // Reset mock to provide valid response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-clear',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Test response' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test');
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('should handle streaming updates with state transitions', async () => {
    // Mock streaming response that transitions states
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-stream',
          state: 'running',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Processing...' }],
            },
          ],
          artifacts: [],
        };
        yield {
          id: 'task-stream',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Processing... Done!' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Process this');
    });

    // Verify the message was updated and streaming state changed
    const assistantMessage = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistantMessage?.content).toBe('Processing... Done!');
    expect(assistantMessage?.isStreaming).toBe(false);
  });

  it('should handle multiple artifacts correctly', async () => {
    // Mock stream with multiple artifacts
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-artifacts',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Created multiple files' }],
            },
          ],
          artifacts: [
            {
              artifactId: 'file1.js',
              name: 'file1.js',
              parts: [{ kind: 'text', text: 'console.log("file1");' }],
            },
            {
              artifactId: 'file2.js',
              name: 'file2.js',
              parts: [{ kind: 'text', text: 'console.log("file2");' }],
            },
          ],
        };
      },
    };

    const { result } = renderHook(() => useA2A(), { wrapper });

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Create files');
    });

    // Should have user message + assistant message + 2 artifact messages
    expect(result.current.messages).toHaveLength(4);

    const artifactMessage1 = result.current.messages[2];
    const artifactMessage2 = result.current.messages[3];
    expect(artifactMessage1.content).toContain('file1.js');
    expect(artifactMessage2.content).toContain('file2.js');
    expect(artifactMessage1.metadata?.artifacts).toHaveLength(1);
    expect(artifactMessage2.metadata?.artifacts).toHaveLength(1);
  });
});
