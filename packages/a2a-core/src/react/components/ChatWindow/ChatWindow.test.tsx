import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWindow } from './ChatWindow';
import styles from './ChatWindow.module.css';

// Mock dependencies
vi.mock('../MessageList', () => ({
  MessageList: ({ welcomeMessage, userName, branding }: any) => (
    <div data-testid="message-list">
      {welcomeMessage && <div>{welcomeMessage}</div>}
      <div>Agent: {userName}</div>
      {branding && <div>Branding: {JSON.stringify(branding)}</div>}
    </div>
  ),
}));

vi.mock('../MessageInput', () => ({
  MessageInput: ({ placeholder, disabled, onSendMessage }: any) => (
    <div data-testid="message-input">
      <input placeholder={placeholder} disabled={disabled} data-testid="input-field" />
      <button onClick={() => onSendMessage('test message', [])}>Send</button>
    </div>
  ),
}));

vi.mock('../CompanyLogo', () => ({
  CompanyLogo: ({ branding }: any) => (
    <div data-testid="company-logo">Logo {branding?.logoUrl}</div>
  ),
}));

const mockUseChatWidget = vi.fn();

vi.mock('../../hooks/useChatWidget', () => ({
  useChatWidget: mockUseChatWidget,
}));

describe('ChatWindow', () => {
  const mockSendMessage = vi.fn();
  const mockClearSession = vi.fn();

  const defaultProps = {
    agentCard: 'https://agent.example.com/agent.json',
    theme: {},
    placeholder: 'Type here...',
    welcomeMessage: 'Welcome!',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'Test Agent',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
    });
  });

  it('should render all core components', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Agent: Test Agent')).toBeInTheDocument();
  });

  it('should show header logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'header' as const,
          logoUrl: 'logo.png',
        },
      },
    };

    render(<ChatWindow {...props} />);

    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    expect(logos[0].parentElement?.className).toContain(styles.header);
    expect(logos[0]).toHaveTextContent('Logo logo.png');
  });

  it('should show footer logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'footer' as const,
          logoUrl: 'logo.png',
        },
      },
    };

    render(<ChatWindow {...props} />);

    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    expect(logos[0].parentElement?.className).toContain(styles.footer);
  });

  it('should not show logo when not configured', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.queryByTestId('company-logo')).not.toBeInTheDocument();
  });

  it('should pass correct props to MessageInput', () => {
    const props = {
      ...defaultProps,
      allowFileUpload: false,
      maxFileSize: 5000000,
      allowedFileTypes: ['image/*', '.pdf'],
    };

    render(<ChatWindow {...props} />);

    const input = screen.getByTestId('input-field');
    expect(input).toHaveAttribute('placeholder', 'Type here...');
    expect(input).not.toBeDisabled();
  });

  it('should disable input when not connected', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: false,
      agentName: '',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
    });

    render(<ChatWindow {...defaultProps} />);

    const input = screen.getByTestId('input-field');
    expect(input).toBeDisabled();
  });

  it('should use chat widget hook with provided props', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(mockUseChatWidget).toHaveBeenCalledWith({
      agentCard: 'https://agent.example.com/agent.json',
      auth: undefined,
      onMessage: undefined,
      onConnectionChange: undefined,
    });
  });

  it('should use default agent name when not provided', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: '',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
    });

    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByText('Agent: Assistant')).toBeInTheDocument();
  });

  it('should handle all props correctly', () => {
    const props = {
      agentCard: 'https://agent.example.com/agent.json',
      auth: { token: 'test-token' },
      theme: {
        branding: {
          logoPosition: 'header' as const,
        },
      },
      onMessage: vi.fn(),
      onConnectionChange: vi.fn(),
      userId: 'user123',
      metadata: { source: 'web' },
      placeholder: 'Custom placeholder',
      welcomeMessage: 'Custom welcome',
      allowFileUpload: true,
      maxFileSize: 10000000,
      allowedFileTypes: ['.jpg', '.png'],
    };

    render(<ChatWindow {...props} />);

    // Verify the component renders without errors
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should pass callbacks to chat widget hook', () => {
    const onMessage = vi.fn();
    const onConnectionChange = vi.fn();

    const props = {
      ...defaultProps,
      onMessage,
      onConnectionChange,
    };

    render(<ChatWindow {...props} />);

    expect(mockUseChatWidget).toHaveBeenCalledWith({
      agentCard: 'https://agent.example.com/agent.json',
      auth: undefined,
      onMessage,
      onConnectionChange,
    });
  });

  it('should show new session button when connected', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByText('New Session')).toBeInTheDocument();
    expect(screen.getByTitle('Start new session')).toBeInTheDocument();
  });

  it('should call clearSession when new session button is clicked', async () => {
    const user = userEvent.setup();

    render(<ChatWindow {...defaultProps} />);

    const newSessionButton = screen.getByText('New Session');
    await user.click(newSessionButton);

    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('should not show new session button when not connected', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: false,
      agentName: 'Test Agent',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
    });

    render(<ChatWindow {...defaultProps} />);

    expect(screen.queryByText('New Session')).not.toBeInTheDocument();
  });

  it('should show header when connected even without logo', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'footer' as const,
        },
      },
    };

    render(<ChatWindow {...props} />);

    // Should show header because user is connected (for new session button)
    expect(screen.getByText('New Session')).toBeInTheDocument();
    // Logo should be in footer
    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    expect(logos[0].parentElement?.className).toContain(styles.footer);
  });

  it('should apply theme styles to container', () => {
    const props = {
      ...defaultProps,
      theme: {
        '--chat-color-primary': '#ff0000',
        '--chat-color-background': '#ffffff',
      },
    };

    const { container } = render(<ChatWindow {...props} />);
    const chatWindow = container.querySelector(`.${styles.chatWindow}`);

    expect(chatWindow).toHaveStyle({
      '--chat-color-primary': '#ff0000',
      '--chat-color-background': '#ffffff',
    });
  });

  it('should pass branding to MessageList', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          name: 'Test Company',
          logoUrl: 'logo.png',
        },
      },
    };

    render(<ChatWindow {...props} />);

    expect(screen.getByText(/Branding:.*Test Company/)).toBeInTheDocument();
  });

  it('should handle send message from MessageInput', async () => {
    const user = userEvent.setup();

    render(<ChatWindow {...defaultProps} />);

    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('test message', []);
  });

  it('should disable new session button when not connected', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: false,
      agentName: 'Test Agent',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
    });

    render(<ChatWindow {...defaultProps} />);

    // Header should not be visible when not connected
    expect(screen.queryByText('New Session')).not.toBeInTheDocument();
  });

  it('should handle missing clearSession function gracefully', async () => {
    const user = userEvent.setup();

    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'Test Agent',
      sendMessage: mockSendMessage,
      clearSession: undefined,
    });

    render(<ChatWindow {...defaultProps} />);

    const newSessionButton = screen.getByText('New Session');

    // Should not throw error when clicking
    await expect(user.click(newSessionButton)).resolves.not.toThrow();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(<ChatWindow {...defaultProps} />);

    expect(container.querySelector(`.${styles.chatWindow}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.header}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.headerActions}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.clearButton}`)).toBeInTheDocument();
  });

  it('should include chat-widget-container class', () => {
    const { container } = render(<ChatWindow {...defaultProps} />);

    const chatWindow = container.querySelector('.chat-widget-container');
    expect(chatWindow).toBeInTheDocument();
    expect(chatWindow).toHaveClass(styles.chatWindow);
  });
});
