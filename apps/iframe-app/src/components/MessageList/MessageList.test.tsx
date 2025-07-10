/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { MessageList } from '.';
import { useChatStore } from '../../store/chatStore';
import styles from './MessageList.module.css';
import type { Message as MessageType } from '../../types';

// Mock dependencies
vi.mock('../../store/chatStore');
vi.mock('../Message', () => ({
  Message: ({ message, agentName }: any) => (
    <div data-testid={`message-${message.id}`}>
      <span>{message.content}</span>
      <span>{message.sender}</span>
      <span>{agentName}</span>
    </div>
  ),
}));
vi.mock('../TypingIndicator', () => ({
  TypingIndicator: ({ agentName }: any) => (
    <div data-testid="typing-indicator">{agentName} is typing...</div>
  ),
}));

describe('MessageList', () => {
  const mockUseChatStore = vi.mocked(useChatStore);
  const mockMessages: MessageType[] = [
    {
      id: '1',
      content: 'Hello',
      sender: 'user',
      timestamp: new Date('2024-01-01T10:00:00'),
      status: 'sent',
    },
    {
      id: '2',
      content: 'Hi there!',
      sender: 'assistant',
      timestamp: new Date('2024-01-01T10:01:00'),
      status: 'sent',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatStore.mockReturnValue({
      messages: [],
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });
  });

  it('renders empty list with no messages', () => {
    render(<MessageList />);

    const messageElements = screen.queryAllByTestId(/^message-/);
    expect(messageElements).toHaveLength(0);
  });

  it('renders welcome message when no messages and welcomeMessage provided', () => {
    render(<MessageList welcomeMessage="Welcome to the chat!" />);

    expect(screen.getByText('Welcome to the chat!')).toBeInTheDocument();
  });

  it('does not render welcome message when messages exist', () => {
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList welcomeMessage="Welcome to the chat!" />);

    expect(screen.queryByText('Welcome to the chat!')).not.toBeInTheDocument();
  });

  it('renders all messages', () => {
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('passes agentName to Message components', () => {
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList agentName="Support Bot" />);

    const message2 = screen.getByTestId('message-2');
    expect(message2).toHaveTextContent('Support Bot');
  });

  it('uses default agentName when not provided', () => {
    mockUseChatStore.mockReturnValue({
      messages: [mockMessages[1]], // Only assistant message
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList />);

    const message = screen.getByTestId('message-2');
    expect(message).toHaveTextContent('Agent');
  });

  it('shows typing indicator when isTyping is true', () => {
    mockUseChatStore.mockReturnValue({
      messages: [],
      isTyping: true,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
  });

  it('does not show typing indicator when isTyping is false', () => {
    render(<MessageList />);

    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('passes agentName to typing indicator', () => {
    mockUseChatStore.mockReturnValue({
      messages: [],
      isTyping: true,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList agentName="AI Assistant" />);

    expect(screen.getByText('AI Assistant is typing...')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<MessageList />);

    const messageList = container.firstChild as HTMLElement;
    expect(messageList).toHaveClass(styles.messageList);
    expect(messageList).toHaveClass('chat-scrollbar');
  });

  it.skip('scrolls to bottom when messages change', () => {
    const mockScrollElement = document.createElement('div');
    mockScrollElement.scrollTop = 0;
    Object.defineProperty(mockScrollElement, 'scrollHeight', {
      value: 1000,
      writable: false,
    });

    const scrollSpy = vi.spyOn(mockScrollElement, 'scrollTop', 'set');

    vi.spyOn(React, 'useRef').mockReturnValue({ current: mockScrollElement });

    const { rerender } = render(<MessageList />);

    // Update messages
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    rerender(<MessageList />);

    expect(scrollSpy).toHaveBeenCalledWith(1000);
  });

  it.skip('scrolls to bottom when typing status changes', () => {
    const mockScrollElement = document.createElement('div');
    mockScrollElement.scrollTop = 0;
    Object.defineProperty(mockScrollElement, 'scrollHeight', {
      value: 800,
      writable: false,
    });

    const scrollSpy = vi.spyOn(mockScrollElement, 'scrollTop', 'set');

    vi.spyOn(React, 'useRef').mockReturnValue({ current: mockScrollElement });

    const { rerender } = render(<MessageList />);

    // Update typing status
    mockUseChatStore.mockReturnValue({
      messages: [],
      isTyping: true,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    rerender(<MessageList />);

    expect(scrollSpy).toHaveBeenCalledWith(800);
  });

  it('renders welcome message with correct CSS class', () => {
    render(<MessageList welcomeMessage="Welcome!" />);

    const welcomeDiv = screen.getByText('Welcome!');
    expect(welcomeDiv).toHaveClass(styles.welcomeMessage);
  });

  it('maintains message order', () => {
    const orderedMessages: MessageType[] = [
      {
        id: '1',
        content: 'First',
        sender: 'user',
        timestamp: new Date('2024-01-01T10:00:00'),
        status: 'sent',
      },
      {
        id: '2',
        content: 'Second',
        sender: 'assistant',
        timestamp: new Date('2024-01-01T10:01:00'),
        status: 'sent',
      },
      {
        id: '3',
        content: 'Third',
        sender: 'user',
        timestamp: new Date('2024-01-01T10:02:00'),
        status: 'sent',
      },
    ];

    mockUseChatStore.mockReturnValue({
      messages: orderedMessages,
      isTyping: false,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList />);

    const messageElements = screen.getAllByTestId(/^message-/);
    expect(messageElements).toHaveLength(3);
    expect(messageElements[0]).toHaveTextContent('First');
    expect(messageElements[1]).toHaveTextContent('Second');
    expect(messageElements[2]).toHaveTextContent('Third');
  });

  it('handles empty welcomeMessage prop', () => {
    const { container } = render(<MessageList welcomeMessage="" />);

    // Empty welcome message should not render
    const welcomeDiv = container.querySelector(`.${styles.welcomeMessage}`);
    expect(welcomeDiv).not.toBeInTheDocument();
  });

  it('renders both messages and typing indicator when both present', () => {
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isTyping: true,
      isConnected: true,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      clearMessages: vi.fn(),
    });

    render(<MessageList />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });
});
