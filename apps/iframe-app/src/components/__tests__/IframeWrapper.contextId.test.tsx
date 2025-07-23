import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';

// Mock the dependencies
vi.mock('@microsoft/a2achat-core/react', () => ({
  ChatWidget: vi.fn(({ sessionKey }) => (
    <div data-testid="chat-widget">ChatWidget (sessionKey: {sessionKey})</div>
  )),
}));

vi.mock('../MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(() => <div data-testid="multi-session-chat">MultiSessionChat</div>),
}));

vi.mock('../../lib/authHandler', () => ({
  createUnauthorizedHandler: vi.fn(() => vi.fn()),
  getBaseUrl: vi.fn((agentCard) => `https://base.url.from/${agentCard}`),
}));

vi.mock('../../lib/hooks/useFrameBlade', () => ({
  useFrameBlade: vi.fn(() => ({
    isReady: true,
    sendMessage: vi.fn(),
  })),
}));

vi.mock('../../lib/hooks/useParentCommunication', () => ({
  useParentCommunication: vi.fn(() => ({
    isWaitingForAgentCard: false,
    sendMessageToParent: vi.fn(),
  })),
}));

describe('IframeWrapper - contextId support', () => {
  const defaultConfig: IframeConfig = {
    props: {
      agentCard: 'https://api.example.com/agent.json',
      userId: 'user123',
      userName: 'Test User',
    },
    multiSession: false,
    mode: 'light',
    inPortal: false,
  };

  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Reset URL
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000');

    // Mock localStorage
    localStorageMock = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set contextId in localStorage for single-session mode', () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-123',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'a2a-context-default',
      'test-context-123'
    );
  });

  it('should not set contextId in localStorage for multi-session mode', () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-456',
      multiSession: true,
    };

    render(<IframeWrapper config={configWithContextId} />);

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should respect existing contextId in localStorage', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Pre-populate localStorage
    localStorageMock['a2a-context-default'] = 'existing-context-789';

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'new-context-123',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Should not overwrite existing contextId
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Existing contextId found: a2a-context-default = existing-context-789'
    );

    consoleLogSpy.mockRestore();
  });

  it('should use custom sessionKey for contextId storage', () => {
    const configWithSessionKey: IframeConfig = {
      ...defaultConfig,
      props: {
        ...defaultConfig.props,
        sessionKey: 'custom-session',
      },
      contextId: 'test-context-abc',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithSessionKey} />);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'a2a-context-custom-session',
      'test-context-abc'
    );
  });

  it('should pass sessionKey to ChatWidget', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/a2achat-core/react'));

    const configWithSessionKey: IframeConfig = {
      ...defaultConfig,
      props: {
        ...defaultConfig.props,
        sessionKey: 'my-session',
      },
      contextId: 'test-context',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithSessionKey} />);

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'my-session',
      }),
      expect.any(Object)
    );
  });

  it('should handle missing contextId gracefully', () => {
    const configWithoutContextId: IframeConfig = {
      ...defaultConfig,
      contextId: undefined,
      multiSession: false,
    };

    render(<IframeWrapper config={configWithoutContextId} />);

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
  });

  it('should log when setting contextId', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'logged-context',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Set contextId in localStorage: a2a-context-default = logged-context'
    );

    consoleLogSpy.mockRestore();
  });
});
