/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useA2ANative } from './useA2ANative';

// Mock the SDK
vi.mock('a2a-browser-sdk/react', () => ({
  useA2A: vi.fn(() => ({
    isConnected: false,
    isLoading: false,
    messages: [],
    agentCard: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

// Mock the SDK's AgentDiscovery class
vi.mock('a2a-browser-sdk', () => ({
  AgentDiscovery: vi.fn(() => ({
    fromWellKnownUri: vi.fn(),
    fromDirect: vi.fn(),
    fromRegistry: vi.fn(),
  })),
}));

// Mock message utils
vi.mock('../utils/messageUtils', () => ({
  createMessage: vi.fn((content, role) => ({
    id: `msg-${Date.now()}`,
    content,
    sender: role,
    timestamp: new Date(),
  })),
}));

describe('useA2ANative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useA2ANative({}));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.agentName).toBe('Agent');
    expect(result.current.supportsSSE).toBe(true);
  });

  it('should handle connection changes', async () => {
    const onConnectionChange = vi.fn();
    const { useA2A } = await import('a2a-browser-sdk/react');

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: { name: 'Test Agent' },
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() => useA2ANative({ onConnectionChange }));

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('should handle typing state changes', async () => {
    const onTypingChange = vi.fn();
    const { useA2A } = await import('a2a-browser-sdk/react');

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: true,
      messages: [],
      agentCard: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() => useA2ANative({ onTypingChange }));

    expect(result.current.isTyping).toBe(true);
    expect(onTypingChange).toHaveBeenCalledWith(true);
  });

  it('should send messages through SDK', async () => {
    const { useA2A } = await import('a2a-browser-sdk/react');
    const mockSendMessage = vi.fn();

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() => useA2ANative({}));

    await act(async () => {
      await result.current.sendMessage('Hello', 'msg-123');
    });

    expect(mockSendMessage).toHaveBeenCalledWith('Hello');
  });

  it('should throw error when not connected', async () => {
    const { useA2A } = await import('a2a-browser-sdk/react');

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() => useA2ANative({}));

    await expect(result.current.sendMessage('Hello', 'msg-123')).rejects.toThrow(
      'A2A client not connected'
    );
  });

  it('should handle incoming messages', async () => {
    const onMessage = vi.fn();
    const { useA2A } = await import('a2a-browser-sdk/react');
    const { createMessage } = await import('../utils/messageUtils');

    const mockMessage = {
      role: 'assistant',
      content: 'Hello from agent',
      timestamp: new Date(),
    };

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [mockMessage],
      agentCard: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderHook(() => useA2ANative({ onMessage }));

    expect(createMessage).toHaveBeenCalledWith('Hello from agent', 'assistant');
    expect(onMessage).toHaveBeenCalled();
  });

  it('should auto-connect when agentCard is provided', async () => {
    const { useA2A } = await import('a2a-browser-sdk/react');
    const { AgentDiscovery } = await import('a2a-browser-sdk');

    const mockConnect = vi.fn();
    const mockFromWellKnownUri = vi.fn().mockResolvedValue({
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: { streaming: true },
    });

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    // Mock AgentDiscovery instance
    const mockDiscoveryInstance = {
      fromWellKnownUri: mockFromWellKnownUri,
      fromDirect: vi.fn(),
      fromRegistry: vi.fn(),
    };

    vi.mocked(AgentDiscovery).mockImplementation(() => mockDiscoveryInstance as any);

    renderHook(() =>
      useA2ANative({
        agentCard: 'https://example.com/agent',
        auth: { type: 'bearer', token: 'test-token' },
      })
    );

    // Give the effect time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFromWellKnownUri).toHaveBeenCalledWith('https://example.com/agent');
    expect(mockConnect).toHaveBeenCalledWith({
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: { streaming: true },
    });
  });
});
