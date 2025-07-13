/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChatWidget } from './ChatWidget';

// Mock the ChatWindow component
vi.mock('../ChatWindow', () => ({
  ChatWindow: ({ theme, ...props }: any) => (
    <div data-testid="chat-window" data-theme={JSON.stringify(theme)}>
      ChatWindow Component
      {props.agentCard && <div>Agent: {props.agentCard}</div>}
      {props.welcomeMessage && <div>{props.welcomeMessage}</div>}
    </div>
  ),
}));

// Mock the ThemeProvider component
vi.mock('../ThemeProvider/ThemeProvider', () => ({
  ChatThemeProvider: ({ children }: any) => <div className="theme-provider">{children}</div>,
}));

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ChatWindow component', () => {
    render(
      <ChatWidget agentCard="https://agent.example.com/agent.json" welcomeMessage="Welcome!" />
    );

    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText('ChatWindow Component')).toBeInTheDocument();
    expect(screen.getByText('Agent: https://agent.example.com/agent.json')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('should pass theme to ChatWindow', () => {
    const theme = {
      primaryColor: '#007bff',
      fontFamily: 'Arial',
    };

    render(<ChatWidget agentCard="test-agent" theme={theme} />);

    const chatWindow = screen.getByTestId('chat-window');
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');

    expect(themeData).toEqual({
      primaryColor: '#007bff',
      fontFamily: 'Arial',
    });
  });

  it('should wrap content in theme provider', () => {
    const { container } = render(<ChatWidget agentCard="test-agent" />);

    const themeProvider = container.querySelector('.theme-provider');
    expect(themeProvider).toBeInTheDocument();
    expect(themeProvider?.querySelector('[data-testid="chat-window"]')).toBeInTheDocument();
  });

  it('should convert legacy theme to themeConfig', () => {
    const theme = {
      primaryColor: '#007bff',
    };

    render(<ChatWidget agentCard="test-agent" theme={theme} />);

    // The component should still work with legacy theme
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  it('should pass all props to ChatWindow', () => {
    const props = {
      agentCard: 'https://agent.example.com/agent.json',
      auth: { token: 'test-token' },
      theme: { primaryColor: '#007bff' },
      onMessage: vi.fn(),
      onConnectionChange: vi.fn(),
      userId: 'user123',
      metadata: { source: 'web' },
      placeholder: 'Type a message...',
      welcomeMessage: 'Hello!',
      allowFileUpload: true,
      maxFileSize: 5000000,
      allowedFileTypes: ['.jpg', '.png'],
    };

    render(<ChatWidget {...props} />);

    const chatWindow = screen.getByTestId('chat-window');

    // Verify theme was passed
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');
    expect(themeData.primaryColor).toBe('#007bff');

    // Verify other props were passed
    expect(screen.getByText('Agent: https://agent.example.com/agent.json')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('should handle missing theme prop', () => {
    render(<ChatWidget agentCard="test-agent" />);

    const chatWindow = screen.getByTestId('chat-window');
    const themeData = chatWindow.getAttribute('data-theme');

    // Should handle undefined theme gracefully
    expect(themeData).toBe(null);
  });

  it('should support new themeConfig prop', () => {
    const themeConfig = {
      primaryColor: '#ff0000',
    };

    render(<ChatWidget agentCard="test-agent" themeConfig={themeConfig} />);

    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  it('should support fluentTheme prop', () => {
    render(<ChatWidget agentCard="test-agent" fluentTheme="dark" />);

    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  it('should handle rapid mount/unmount cycles', async () => {
    const { unmount } = render(<ChatWidget agentCard="test-agent" />);

    // Verify initial render
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();

    // Unmount
    unmount();

    // Re-render with new component instance
    render(<ChatWidget agentCard="test-agent-2" />);

    // Should still work correctly
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText('Agent: test-agent-2')).toBeInTheDocument();
  });
});
