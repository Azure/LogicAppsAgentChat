import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useChatWidget } from './useChatWidget';

// Mock the dependencies
vi.mock('../use-a2a', () => ({
  useA2A: vi.fn(() => ({
    isConnected: false,
    isLoading: false,
    messages: [],
    agentCard: null,
    contextId: undefined,
    client: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    sendAuthenticationCompleted: vi.fn(),
  })),
}));

vi.mock('../../discovery/agent-discovery', () => ({
  AgentDiscovery: vi.fn(() => ({
    fromWellKnownUri: vi.fn(),
    fromDirect: vi.fn(),
  })),
}));

vi.mock('../utils/messageUtils', () => ({
  createMessage: vi.fn((content, role) => ({
    id: `msg-${Date.now()}`,
    content,
    sender: role,
    timestamp: new Date(),
    status: 'sending',
  })),
}));

const mockChatStore = {
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  setConnected: vi.fn(),
  setTyping: vi.fn(),
  setAuthRequired: vi.fn(),
  clearMessages: vi.fn(),
  currentContextId: undefined,
  setCurrentContextId: vi.fn(),
  getAuthRequiredForContext: vi.fn(() => null),
  messages: [],
};

vi.mock('../store/chatStore', () => ({
  useChatStore: Object.assign(
    vi.fn(() => mockChatStore),
    {
      getState: vi.fn(() => mockChatStore),
    }
  ),
}));

describe('useChatWidget', () => {
  let queryClient: QueryClient;

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

  it('should initialize with default state', () => {
    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
        }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.agentName).toBe('Agent');
  });

  it('should handle connection changes', async () => {
    const onConnectionChange = vi.fn();
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const setConnected = vi.fn();
    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected,
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: { name: 'Test Agent' },
      contextId: 'ctx-123',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
          onConnectionChange,
        }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
    expect(result.current.contextId).toBe('ctx-123');
    expect(setConnected).toHaveBeenCalledWith(true);
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('should handle typing state changes', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const setTyping = vi.fn();
    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping,
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: true,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
        }),
      { wrapper }
    );

    expect(result.current.isTyping).toBe(true);
    expect(setTyping).toHaveBeenCalledWith(true, undefined);
  });

  it('should send messages through SDK', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');
    const { createMessage } = await import('../utils/messageUtils');

    const mockSendMessage = vi.fn();
    const mockAddMessage = vi.fn();
    const mockUpdateMessage = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: mockAddMessage,
      updateMessage: mockUpdateMessage,
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(createMessage).toHaveBeenCalledWith('Hello', 'user', undefined);
    expect(mockAddMessage).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith('Hello');
  });

  it('should throw error when not connected', async () => {
    const { useA2A } = await import('../use-a2a');

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn().mockRejectedValue(new Error('Not connected to agent')),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
        }),
      { wrapper }
    );

    await expect(result.current.sendMessage('Hello')).rejects.toThrow('Not connected to agent');
  });

  it.skip('should handle incoming messages', async () => {
    const onMessage = vi.fn();
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');
    const { createMessage } = await import('../utils/messageUtils');

    const mockAddMessage = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: mockAddMessage,
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const mockMessage = {
      id: 'sdk-msg-1',
      role: 'assistant',
      content: 'Hello from agent',
      timestamp: new Date(),
      isStreaming: false,
    };

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [mockMessage],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
          onMessage,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(createMessage).toHaveBeenCalledWith('Hello from agent', 'assistant');
      expect(mockAddMessage).toHaveBeenCalled();
      expect(onMessage).toHaveBeenCalled();
    });
  });

  it('should clear session', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const mockClearMessages = vi.fn();
    const mockClearLocalMessages = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: mockClearLocalMessages,
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: mockClearMessages,
    });

    const { result } = renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
        }),
      { wrapper }
    );

    act(() => {
      result.current.clearMessages();
    });

    expect(mockClearLocalMessages).toHaveBeenCalled();
  });

  it.skip('should auto-connect with agent card URL', async () => {
    const { useA2A } = await import('../use-a2a');
    const { AgentDiscovery } = await import('../../discovery/agent-discovery');

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
      contextId: undefined,
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    const mockDiscoveryInstance = {
      fromWellKnownUri: mockFromWellKnownUri,
      fromDirect: vi.fn(),
    };

    vi.mocked(AgentDiscovery).mockImplementation(() => mockDiscoveryInstance as any);

    renderHook(
      () =>
        useChatWidget({
          agentCard: 'https://example.com/agent',
          auth: { type: 'bearer', token: 'test-token' },
        }),
      { wrapper }
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

  it('should auto-connect with agent card object', async () => {
    const { useA2A } = await import('../use-a2a');

    const mockConnect = vi.fn();
    const agentCard = {
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
        extensions: [],
      },
    };

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      setAuthRequired: vi.fn(),
      currentContextId: undefined,
      setCurrentContextId: vi.fn(),
      getAuthRequiredForContext: vi.fn(() => null),
      messages: [],
    });

    renderHook(
      () =>
        useChatWidget({
          agentCard,
        }),
      { wrapper }
    );

    // Give the effect time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockConnect).toHaveBeenCalledWith(agentCard);
  });
});
