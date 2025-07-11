import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock useTheme hook
vi.mock('../../hooks/useTheme', () => ({
  useTheme: (theme: any) => ({
    ...theme,
    processed: true,
  }),
}));

describe('ChatWidget', () => {
  let styleElements: HTMLStyleElement[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    // Track style elements added to document
    styleElements = [];
    const originalAppendChild = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLStyleElement) {
        styleElements.push(node);
      }
      return originalAppendChild(node);
    });
  });

  afterEach(() => {
    // Clean up any style elements
    styleElements.forEach((el) => {
      try {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (e) {
        // Ignore errors if element was already removed
      }
    });
    styleElements = [];
    vi.restoreAllMocks();
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

  it('should apply processed theme to ChatWindow', () => {
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
      processed: true,
    });
  });

  it('should wrap content in a2a-chat-widget container', () => {
    const { container } = render(<ChatWidget agentCard="test-agent" />);

    const wrapper = container.querySelector('.a2a-chat-widget');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.querySelector('[data-testid="chat-window"]')).toBeInTheDocument();
  });

  it('should add global styles on mount', async () => {
    render(<ChatWidget agentCard="test-agent" />);

    await waitFor(() => {
      expect(styleElements).toHaveLength(1);
      const styleContent = styleElements[0].textContent;
      expect(styleContent).toContain('.a2a-chat-widget');
      expect(styleContent).toContain('height: 100%');
      expect(styleContent).toContain('min-height: 400px');
      expect(styleContent).toContain('font-family: var(--chat-font-family');
    });
  });

  it('should remove global styles on unmount', async () => {
    const { unmount } = render(<ChatWidget agentCard="test-agent" />);

    // Verify style was added
    await waitFor(() => {
      expect(styleElements).toHaveLength(1);
    });

    const styleElement = styleElements[0];
    const removeChildSpy = vi.spyOn(document.head, 'removeChild');

    unmount();

    // Verify style was removed
    expect(removeChildSpy).toHaveBeenCalledWith(styleElement);
  });

  it('should pass all props except theme to ChatWindow', () => {
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

    // Verify theme was processed
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');
    expect(themeData.processed).toBe(true);
    expect(themeData.primaryColor).toBe('#007bff');

    // Verify other props were passed
    expect(screen.getByText('Agent: https://agent.example.com/agent.json')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('should handle missing theme prop', () => {
    render(<ChatWidget agentCard="test-agent" />);

    const chatWindow = screen.getByTestId('chat-window');
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');

    // Should have processed flag even with undefined theme
    expect(themeData.processed).toBe(true);
  });

  it('should apply box-sizing to all child elements', async () => {
    render(<ChatWidget agentCard="test-agent" />);

    await waitFor(() => {
      const styleContent = styleElements[0].textContent;
      expect(styleContent).toContain('.a2a-chat-widget * {');
      expect(styleContent).toContain('box-sizing: border-box');
    });
  });

  it('should set proper CSS variables with fallbacks', async () => {
    render(<ChatWidget agentCard="test-agent" />);

    await waitFor(() => {
      const styleContent = styleElements[0].textContent;
      expect(styleContent).toContain('var(--chat-font-family, -apple-system, BlinkMacSystemFont');
      expect(styleContent).toContain('var(--chat-font-size, 14px)');
      expect(styleContent).toContain('var(--chat-line-height, 1.5)');
      expect(styleContent).toContain('var(--chat-color-text, #1a1a1a)');
      expect(styleContent).toContain('var(--chat-color-background, #ffffff)');
      expect(styleContent).toContain('var(--chat-border-radius, 8px)');
    });
  });

  it('should handle rapid mount/unmount cycles', async () => {
    const { unmount, rerender } = render(<ChatWidget agentCard="test-agent" />);

    // Quick unmount and remount
    unmount();
    rerender(<ChatWidget agentCard="test-agent-2" />);

    // Should still work correctly
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText('Agent: test-agent-2')).toBeInTheDocument();
  });
});
