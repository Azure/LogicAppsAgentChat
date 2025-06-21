import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useA2AClient } from './useA2AClient';
import { A2AClient } from '../a2aclient/A2AClient';
import type { AgentCard, SendMessageStreamEvent, Message as A2AMessage } from '../a2aclient/types';

// Mock dependencies
vi.mock('../a2aclient/A2AClient');
vi.mock('../utils/messageUtils', () => ({
  createMessage: vi.fn((content: string, sender: string) => ({
    id: Math.random().toString(),
    content,
    sender,
    timestamp: new Date(),
    status: 'sent',
  })),
  formatPart: vi.fn((part: any) => {
    if (part.kind === 'text') return part.text;
    return '';
  }),
  createArtifactMessage: vi.fn((name: string, content: string) => ({
    id: Math.random().toString(),
    content,
    sender: 'assistant',
    timestamp: new Date(),
    status: 'sent',
    metadata: { isArtifact: true, artifactName: name },
  })),
}));

describe('useA2AClient', () => {
  const mockA2AClient = vi.mocked(A2AClient);
  let mockClientInstance: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClientInstance = {
      getAgentCard: vi.fn(),
      supportsStreaming: vi.fn(),
      sendMessage: vi.fn(),
      sendMessageStream: vi.fn(),
    };
    
    mockA2AClient.mockImplementation(() => mockClientInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with disconnected state when no agentUrl provided', () => {
    const { result } = renderHook(() => useA2AClient({}));
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.supportsSSE).toBe(false);
    expect(result.current.agentName).toBe('Agent');
    expect(result.current.currentTaskId).toBeUndefined();
    expect(result.current.currentContextId).toBeUndefined();
    expect(result.current.isStreamActive).toBe(false);
  });

  it('connects to agent when agentUrl is provided', async () => {
    const mockAgentCard: AgentCard = {
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
      sseEnabled: true,
    };
    
    mockClientInstance.getAgentCard.mockResolvedValue(mockAgentCard);
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onConnectionChange = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onConnectionChange,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    expect(result.current.supportsSSE).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
    expect(onConnectionChange).toHaveBeenCalledWith(true);
    expect(mockA2AClient).toHaveBeenCalledWith('http://test.agent', { debug: true });
  });

  it('handles connection failure', async () => {
    mockClientInstance.getAgentCard.mockRejectedValue(new Error('Connection failed'));
    
    const onConnectionChange = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onConnectionChange,
    }));
    
    await waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });
    
    expect(result.current.isConnected).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Failed to connect to A2A agent:', expect.any(Error));
    
    consoleError.mockRestore();
  });

  it('disconnects when agentUrl is removed', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(false);
    
    const { result, rerender } = renderHook(
      ({ agentUrl }) => useA2AClient({ agentUrl }),
      {
        initialProps: { agentUrl: 'http://test.agent' },
      }
    );
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    rerender({ agentUrl: undefined });
    
    expect(result.current.isConnected).toBe(false);
  });

  it('sends message using streaming when SSE is supported', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onMessage = vi.fn();
    const onTypingChange = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onMessage,
      onTypingChange,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Mock streaming response
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'status-update',
        taskId: 'task123',
        contextId: 'context456',
        status: {
          state: 'agent-processing',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: 'Processing your request...' }],
          },
        },
        final: false,
      },
      {
        kind: 'status-update',
        status: {
          state: 'complete',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: 'Here is the response.' }],
          },
        },
        final: true,
      },
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Hello', 'msg123');
    });
    
    expect(mockClientInstance.sendMessageStream).toHaveBeenCalledWith({
      message: {
        kind: 'message',
        messageId: 'msg123',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
      },
      configuration: {
        acceptedOutputModes: ['text'],
      },
    });
    
    expect(onTypingChange).toHaveBeenCalledWith(true);
    expect(onTypingChange).toHaveBeenCalledWith(false);
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(result.current.currentTaskId).toBeUndefined(); // Cleared after final
    expect(result.current.currentContextId).toBe('context456');
  });

  it('sends message using regular request when SSE is not supported', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(false);
    
    const onMessage = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onMessage,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockResponse = {
      result: {
        kind: 'message',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Response from agent' }],
        taskId: 'task789',
        contextId: 'context101',
      },
    };
    
    mockClientInstance.sendMessage.mockResolvedValue(mockResponse);
    
    await act(async () => {
      await result.current.sendMessage('Hello', 'msg456');
    });
    
    expect(mockClientInstance.sendMessage).toHaveBeenCalledWith({
      message: {
        kind: 'message',
        messageId: 'msg456',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
      },
      configuration: {
        acceptedOutputModes: ['text'],
      },
    });
    
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(result.current.currentTaskId).toBe('task789');
    expect(result.current.currentContextId).toBe('context101');
  });

  it('includes existing task and context IDs in messages', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(false);
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Set task and context IDs through a previous message
    const firstResponse = {
      result: {
        kind: 'message',
        role: 'agent',
        parts: [{ kind: 'text', text: 'First response' }],
        taskId: 'existing-task',
        contextId: 'existing-context',
      },
    };
    
    mockClientInstance.sendMessage.mockResolvedValue(firstResponse);
    
    await act(async () => {
      await result.current.sendMessage('First message', 'msg1');
    });
    
    expect(result.current.currentTaskId).toBe('existing-task');
    expect(result.current.currentContextId).toBe('existing-context');
    
    // Send second message
    mockClientInstance.sendMessage.mockResolvedValue({
      result: {
        kind: 'message',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Second response' }],
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Second message', 'msg2');
    });
    
    // Check that existing IDs were included
    expect(mockClientInstance.sendMessage).toHaveBeenLastCalledWith({
      message: {
        kind: 'message',
        messageId: 'msg2',
        role: 'user',
        parts: [{ kind: 'text', text: 'Second message' }],
        taskId: 'existing-task',
        contextId: 'existing-context',
      },
      configuration: {
        acceptedOutputModes: ['text'],
      },
    });
  });

  it('handles artifact updates in stream', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onMessage = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onMessage,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'artifact-update',
        artifact: {
          name: 'Code Example',
          parts: [{ kind: 'text', text: 'console.log("Hello");' }],
        },
      },
      {
        kind: 'status-update',
        status: {
          state: 'complete',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: 'Here is the code example.' }],
          },
        },
        final: true,
      },
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Show me code', 'msg789');
    });
    
    // Should have received both artifact and regular message
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { isArtifact: true, artifactName: 'Code Example' },
      })
    );
  });

  it('handles direct message events in stream', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onMessage = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onMessage,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'message',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Direct message response' }],
        taskId: 'task999',
        contextId: 'context999',
      } as A2AMessage,
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Test', 'msg999');
    });
    
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Direct message response',
        sender: 'assistant',
      })
    );
    expect(result.current.currentTaskId).toBe('task999');
    expect(result.current.currentContextId).toBe('context999');
  });

  it('handles task events in stream', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'task',
        id: 'new-task-123',
        contextId: 'new-context-456',
      },
      {
        kind: 'status-update',
        status: {
          state: 'complete',
        },
        final: true,
      },
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Create task', 'msg123');
    });
    
    expect(result.current.currentTaskId).toBeUndefined(); // Cleared after final
    expect(result.current.currentContextId).toBe('new-context-456');
  });

  it('throws error when sending message without connection', async () => {
    const { result } = renderHook(() => useA2AClient({}));
    
    await expect(
      result.current.sendMessage('Hello', 'msg123')
    ).rejects.toThrow('A2A client not connected');
  });

  it('handles stream processing errors', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onTypingChange = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onTypingChange,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const streamError = new Error('Stream error');
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        throw streamError;
      },
    });
    
    await expect(
      result.current.sendMessage('Test', 'msg123')
    ).rejects.toThrow('Stream error');
    
    expect(onTypingChange).toHaveBeenLastCalledWith(false); // Typing stopped on error
    expect(consoleError).toHaveBeenCalledWith('Error in stream processing:', streamError);
    
    consoleError.mockRestore();
  });

  it('handles empty content in status updates', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const onMessage = vi.fn();
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
      onMessage,
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'status-update',
        status: {
          state: 'agent-processing',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: '   ' }], // Whitespace only
          },
        },
        final: false,
      },
      {
        kind: 'status-update',
        status: {
          state: 'complete',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: '' }], // Empty but final
          },
        },
        final: true,
      },
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Test', 'msg123');
    });
    
    // Only the final empty message should be sent
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('handles input-required state without clearing task ID', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      name: 'Test Agent',
      description: 'A test agent',
      agent_uri: 'http://test.agent',
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(true);
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    const mockStreamEvents: SendMessageStreamEvent[] = [
      {
        kind: 'status-update',
        taskId: 'input-task',
        status: {
          state: 'input-required',
          message: {
            role: 'agent',
            parts: [{ kind: 'text', text: 'Please provide input' }],
          },
        },
        final: true,
      },
    ];
    
    mockClientInstance.sendMessageStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });
    
    await act(async () => {
      await result.current.sendMessage('Start task', 'msg123');
    });
    
    // Task ID should not be cleared for input-required state
    expect(result.current.currentTaskId).toBe('input-task');
  });

  it('uses default agent name when not provided in card', async () => {
    mockClientInstance.getAgentCard.mockResolvedValue({
      description: 'A test agent',
      agent_uri: 'http://test.agent',
      // name is undefined
    });
    mockClientInstance.supportsStreaming.mockResolvedValue(false);
    
    const { result } = renderHook(() => useA2AClient({
      agentUrl: 'http://test.agent',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    expect(result.current.agentName).toBe('Agent');
  });
});