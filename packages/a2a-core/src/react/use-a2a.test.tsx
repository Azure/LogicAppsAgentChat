import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
  })),
}));

describe('useA2A', () => {
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
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useA2A());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.agentCard).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should connect with agent card', async () => {
    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentCard).toEqual(mockAgentCard);
  });

  it('should send message and update messages array', async () => {
    // Mock the stream response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
          state: 'pending',
          messages: [],
          artifacts: [],
        };
        yield {
          id: 'task-1',
          state: 'running',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Hello from agent' }],
            },
          ],
          artifacts: [],
        };
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Hello from agent' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    // Connect first
    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello agent');
    });

    // Check that user message was added
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Hello agent',
    });

    // Check that assistant message was added
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Hello from agent',
    });
  });

  it('should handle artifacts in responses', async () => {
    // Mock stream with artifacts
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Generated code' }],
            },
          ],
          artifacts: [
            {
              artifactId: 'file.js',
              name: 'file.js',
              parts: [
                {
                  kind: 'text',
                  text: 'console.log("Hello");',
                },
              ],
            },
          ],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    await act(async () => {
      await result.current.sendMessage('Generate code');
    });

    // Should have user message + assistant message + artifact message
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].content).toContain('file.js');
    expect(result.current.messages[2].content).toContain('console.log("Hello");');
  });

  it('should handle loading states', async () => {
    // Mock a slow stream
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield {
          id: 'task-1',
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

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Start sending
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Test');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for completion
    await act(async () => {
      await sendPromise!;
    });

    // Should not be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('should disconnect and clear state', async () => {
    // Mock a simple response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
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

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test message');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.agentCard).toBeUndefined();
    expect(result.current.messages).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    // Mock error in stream
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        throw new Error('Stream failed');
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    await act(async () => {
      await expect(result.current.sendMessage('Test')).rejects.toThrow('Stream failed');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
