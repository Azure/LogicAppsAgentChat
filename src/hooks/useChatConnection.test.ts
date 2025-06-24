/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatConnection } from './useChatConnection';
import { useA2AClient } from './useA2AClient';
import { useChatStore } from '../store/chatStore';
import { createMessage } from '../utils/messageUtils';
import type { Message, Attachment } from '../types';

// Mock dependencies
vi.mock('./useA2AClient');
vi.mock('../store/chatStore');
vi.mock('../utils/messageUtils');

describe('useChatConnection', () => {
  const mockUseA2AClient = vi.mocked(useA2AClient);
  const mockUseChatStore = vi.mocked(useChatStore);
  const mockCreateMessage = vi.mocked(createMessage);
  
  const mockChatStore = {
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setConnected: vi.fn(),
    setTyping: vi.fn(),
    messages: [],
    isConnected: true,
    isTyping: false,
    clearMessages: vi.fn(),
  };
  
  const mockA2AClient = {
    isConnected: true,
    agentName: 'Test Agent',
    sendMessage: vi.fn(),
    supportsSSE: true,
    currentTaskId: undefined,
    currentContextId: undefined,
    isStreamActive: false,
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock A2A client state
    mockA2AClient.isConnected = true;
    mockA2AClient.agentName = 'Test Agent';
    mockA2AClient.sendMessage = vi.fn();
    
    // Reset mock chat store functions
    mockChatStore.addMessage = vi.fn();
    mockChatStore.updateMessage = vi.fn();
    mockChatStore.setConnected = vi.fn();
    mockChatStore.setTyping = vi.fn();
    mockChatStore.clearMessages = vi.fn();
    
    mockUseChatStore.mockReturnValue(mockChatStore);
    mockUseA2AClient.mockReturnValue(mockA2AClient as any);
    mockCreateMessage.mockImplementation((content, sender, attachments) => ({
      id: 'msg-' + Date.now(),
      content,
      sender,
      timestamp: new Date(),
      status: 'sending',
      attachments,
    }));
  });

  it('initializes with A2A client connection', () => {
    const agentCard = 'http://test.agent/agent.json';
    const onMessage = vi.fn();
    const onConnectionChange = vi.fn();
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard, onMessage, onConnectionChange })
    );
    
    expect(mockUseA2AClient).toHaveBeenCalledWith({
      agentCard,
      onConnectionChange: expect.any(Function),
      onMessage: expect.any(Function),
      onTypingChange: expect.any(Function),
      onUpdateMessage: expect.any(Function),
    });
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
  });

  it('handles incoming messages', () => {
    const onMessage = vi.fn();
    
    renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json', onMessage })
    );
    
    // Get the message handler passed to useA2AClient
    const messageHandler = mockUseA2AClient.mock.calls[0][0].onMessage;
    
    const incomingMessage: Message = {
      id: 'msg-1',
      content: 'Hello from agent',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'sent',
    };
    
    // Simulate incoming message
    act(() => {
      messageHandler?.(incomingMessage);
    });
    
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(incomingMessage);
    expect(onMessage).toHaveBeenCalledWith(incomingMessage);
  });

  it('handles connection changes', () => {
    const onConnectionChange = vi.fn();
    
    renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json', onConnectionChange })
    );
    
    // Get the connection handler passed to useA2AClient
    const connectionHandler = mockUseA2AClient.mock.calls[0][0].onConnectionChange;
    
    // Simulate connection change
    act(() => {
      connectionHandler?.(false);
    });
    
    expect(mockChatStore.setConnected).toHaveBeenCalledWith(false);
    expect(onConnectionChange).toHaveBeenCalledWith(false);
    
    act(() => {
      connectionHandler?.(true);
    });
    
    expect(mockChatStore.setConnected).toHaveBeenCalledWith(true);
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('handles typing changes', () => {
    renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    // Get the typing handler passed to useA2AClient
    const typingHandler = mockUseA2AClient.mock.calls[0][0].onTypingChange;
    
    // Simulate typing change
    act(() => {
      typingHandler?.(true);
    });
    
    expect(mockChatStore.setTyping).toHaveBeenCalledWith(true);
    
    act(() => {
      typingHandler?.(false);
    });
    
    expect(mockChatStore.setTyping).toHaveBeenCalledWith(false);
  });

  it('sends message successfully', async () => {
    const mockMessage: Message = {
      id: 'msg-123',
      content: 'Hello agent',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
    
    mockCreateMessage.mockReturnValue(mockMessage);
    mockA2AClient.sendMessage.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    await act(async () => {
      await result.current.sendMessage('Hello agent');
    });
    
    expect(mockCreateMessage).toHaveBeenCalledWith('Hello agent', 'user', undefined);
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockA2AClient.sendMessage).toHaveBeenCalledWith('Hello agent', 'msg-123');
    expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-123', { status: 'sent' });
  });

  it('sends message with attachments', async () => {
    const attachments: Attachment[] = [
      {
        id: 'att-1',
        name: 'file.txt',
        size: 1024,
        type: 'text/plain',
        status: 'uploaded',
      },
    ];
    
    const mockMessage: Message = {
      id: 'msg-456',
      content: 'Here is a file',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      attachments,
    };
    
    mockCreateMessage.mockReturnValue(mockMessage);
    mockA2AClient.sendMessage.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    await act(async () => {
      await result.current.sendMessage('Here is a file', attachments);
    });
    
    expect(mockCreateMessage).toHaveBeenCalledWith('Here is a file', 'user', attachments);
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockA2AClient.sendMessage).toHaveBeenCalledWith('Here is a file', 'msg-456');
    expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-456', { status: 'sent' });
  });

  it('handles send message error when not connected', async () => {
    mockA2AClient.isConnected = false;
    
    const mockMessage: Message = {
      id: 'msg-789',
      content: 'Test message',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
    
    mockCreateMessage.mockReturnValue(mockMessage);
    
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    await act(async () => {
      await result.current.sendMessage('Test message');
    });
    
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockA2AClient.sendMessage).not.toHaveBeenCalled();
    expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-789', { status: 'error' });
    expect(consoleError).toHaveBeenCalledWith('Error sending message:', expect.any(Error));
    
    consoleError.mockRestore();
  });

  it('handles send message error from A2A client', async () => {
    const sendError = new Error('Network error');
    mockA2AClient.sendMessage.mockRejectedValue(sendError);
    
    const mockMessage: Message = {
      id: 'msg-999',
      content: 'Test message',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
    
    mockCreateMessage.mockReturnValue(mockMessage);
    
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    await act(async () => {
      await result.current.sendMessage('Test message');
    });
    
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockA2AClient.sendMessage).toHaveBeenCalledWith('Test message', 'msg-999');
    expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-999', { status: 'error' });
    expect(consoleError).toHaveBeenCalledWith('Error sending message:', sendError);
    
    consoleError.mockRestore();
  });

  it('handles multiple messages in sequence', async () => {
    mockA2AClient.sendMessage.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    // Send first message
    mockCreateMessage.mockReturnValue({
      id: 'msg-1',
      content: 'First message',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    });
    
    await act(async () => {
      await result.current.sendMessage('First message');
    });
    
    // Send second message
    mockCreateMessage.mockReturnValue({
      id: 'msg-2',
      content: 'Second message',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    });
    
    await act(async () => {
      await result.current.sendMessage('Second message');
    });
    
    expect(mockChatStore.addMessage).toHaveBeenCalledTimes(2);
    expect(mockA2AClient.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockChatStore.updateMessage).toHaveBeenCalledTimes(2);
    expect(mockChatStore.updateMessage).toHaveBeenNthCalledWith(1, 'msg-1', { status: 'sent' });
    expect(mockChatStore.updateMessage).toHaveBeenNthCalledWith(2, 'msg-2', { status: 'sent' });
  });

  it('maintains stable callback references', () => {
    const { result, rerender } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    const firstSendMessage = result.current.sendMessage;
    
    rerender();
    
    const secondSendMessage = result.current.sendMessage;
    
    expect(firstSendMessage).toBe(secondSendMessage);
  });

  it('updates when A2A client state changes', () => {
    const { result, rerender } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
    
    // Update A2A client by returning new value from mock
    const updatedClient = {
      ...mockA2AClient,
      isConnected: false,
      agentName: 'Updated Agent',
    };
    mockUseA2AClient.mockReturnValue(updatedClient as any);
    
    rerender();
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.agentName).toBe('Updated Agent');
  });

  it('handles empty content with attachments', async () => {
    const attachments: Attachment[] = [
      {
        id: 'att-1',
        name: 'image.png',
        size: 2048,
        type: 'image/png',
        status: 'uploaded',
      },
    ];
    
    const mockMessage: Message = {
      id: 'msg-empty',
      content: '',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      attachments,
    };
    
    mockCreateMessage.mockReturnValue(mockMessage);
    mockA2AClient.sendMessage.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => 
      useChatConnection({ agentCard: 'http://test.agent/agent.json' })
    );
    
    await act(async () => {
      await result.current.sendMessage('', attachments);
    });
    
    expect(mockCreateMessage).toHaveBeenCalledWith('', 'user', attachments);
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockA2AClient.sendMessage).toHaveBeenCalledWith('', 'msg-empty');
    expect(mockChatStore.updateMessage).toHaveBeenCalledWith('msg-empty', { status: 'sent' });
  });
});