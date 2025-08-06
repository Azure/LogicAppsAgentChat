import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiSessionChat } from '../MultiSessionChat';
import { vi } from 'vitest';
import { SessionManager } from '../../utils/sessionManager';

// Mock the session manager
vi.mock('../../utils/sessionManager');

// Mock the ChatWidget from a2a-core
vi.mock('@microsoft/a2achat-core/react', () => ({
  ChatWidget: ({ sessionKey, onContextIdChange }: any) => {
    // Simulate contextId being obtained from server after initial connection
    React.useEffect(() => {
      if (onContextIdChange && sessionKey) {
        // Simulate server providing a contextId after a short delay
        const timeout = setTimeout(() => {
          const mockContextId = `context-for-${sessionKey}`;
          onContextIdChange(mockContextId);
        }, 100);

        return () => clearTimeout(timeout);
      }
    }, [sessionKey, onContextIdChange]);

    return (
      <div data-testid="chat-widget">
        <div>Session Key: {sessionKey}</div>
      </div>
    );
  },
  ChatThemeProvider: ({ children }: any) => <>{children}</>,
}));

// Mock fetch for agent card
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        name: 'Test Agent',
        description: 'Test Description',
        url: 'https://test.com',
        auth: { type: 'none' },
      }),
  })
) as any;

describe('MultiSessionChat contextId handling', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    // Clear mock sessions
    (SessionManager as any).clearAllSessions();
  });

  it('should update SessionManager when contextId is obtained from server', async () => {
    const { container } = render(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
    });

    // Get the active session ID from the rendered session key
    const sessionKeyElement = screen.getByText(/Session Key:/);
    const sessionKey = sessionKeyElement.textContent?.replace('Session Key: ', '');
    const sessionId = sessionKey?.replace('a2a-chat-session-', '');

    // Wait for contextId to be set
    await waitFor(
      async () => {
        const sessionManager = SessionManager.getInstance('https://test.com/agent-card.json');
        const session = await sessionManager.getSession(sessionId!);
        expect(session?.contextId).toBe(`context-for-${sessionKey}`);
      },
      { timeout: 500 }
    );
  });

  it('should maintain separate contextIds for different sessions', async () => {
    const { container } = render(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
    });

    // Get initial session info
    const sessionKeyElement = screen.getByText(/Session Key:/);
    const initialSessionKey = sessionKeyElement.textContent?.replace('Session Key: ', '');
    const initialSessionId = initialSessionKey?.replace('a2a-chat-session-', '');

    // Wait for contextId to be set on first session
    await waitFor(
      async () => {
        const sessionManager = SessionManager.getInstance('https://test.com/agent-card.json');
        const session = await sessionManager.getSession(initialSessionId!);
        expect(session?.contextId).toBe(`context-for-${initialSessionKey}`);
      },
      { timeout: 500 }
    );

    // Create a new session
    const sessionManager = SessionManager.getInstance('https://test.com/agent-card.json');
    const newSession = await sessionManager.createSession('New Session');

    // Manually set a contextId for the new session to simulate previous conversation
    await sessionManager.updateSessionMessages(newSession.id, [], 'existing-context-123');

    // Switch to the new session (this would normally be done via UI)
    await sessionManager.setActiveSession(newSession.id);

    // Force re-render by changing a prop
    const { rerender } = render(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
        key={newSession.id} // Force re-render
      />
    );

    // Wait for re-render with new session
    await waitFor(() => {
      const newSessionKey = `a2a-chat-session-${newSession.id}`;
      expect(screen.getByText(`Session Key: ${newSessionKey}`)).toBeInTheDocument();
    });

    // Verify that the new session has its own contextId
    await waitFor(async () => {
      const session = await sessionManager.getSession(newSession.id);
      expect(session?.contextId).toBe('existing-context-123');
    });
  });

  it('should handle multiple session switches correctly', async () => {
    const sessionManager = SessionManager.getInstance('https://test.com/agent-card.json');

    // Create multiple sessions with different contextIds
    const session1 = await sessionManager.createSession('Session 1');
    await sessionManager.updateSessionMessages(session1.id, [], 'context-111');

    const session2 = await sessionManager.createSession('Session 2');
    await sessionManager.updateSessionMessages(session2.id, [], 'context-222');

    const session3 = await sessionManager.createSession('Session 3');
    await sessionManager.updateSessionMessages(session3.id, [], 'context-333');

    // Start with session1
    await sessionManager.setActiveSession(session1.id);

    const { rerender } = render(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
      const sessionKey = `a2a-chat-session-${session1.id}`;
      expect(screen.getByText(`Session Key: ${sessionKey}`)).toBeInTheDocument();
    });

    // Verify session1 has correct contextId
    const s1 = await sessionManager.getSession(session1.id);
    expect(s1?.contextId).toBe('context-111');

    // Switch to session2
    await sessionManager.setActiveSession(session2.id);
    rerender(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
        key={session2.id}
      />
    );

    await waitFor(() => {
      const sessionKey = `a2a-chat-session-${session2.id}`;
      expect(screen.getByText(`Session Key: ${sessionKey}`)).toBeInTheDocument();
    });

    // Verify session2 has correct contextId
    const s2 = await sessionManager.getSession(session2.id);
    expect(s2?.contextId).toBe('context-222');

    // Switch to session3
    await sessionManager.setActiveSession(session3.id);
    rerender(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
        key={session3.id}
      />
    );

    await waitFor(() => {
      const sessionKey = `a2a-chat-session-${session3.id}`;
      expect(screen.getByText(`Session Key: ${sessionKey}`)).toBeInTheDocument();
    });

    // Verify session3 has correct contextId
    const s3 = await sessionManager.getSession(session3.id);
    expect(s3?.contextId).toBe('context-333');

    // Switch back to session1
    await sessionManager.setActiveSession(session1.id);
    rerender(
      <MultiSessionChat
        config={{
          apiUrl: 'https://test.com/agent-card.json',
        }}
        key={session1.id}
      />
    );

    await waitFor(() => {
      const sessionKey = `a2a-chat-session-${session1.id}`;
      expect(screen.getByText(`Session Key: ${sessionKey}`)).toBeInTheDocument();
    });

    // Verify session1 still has correct contextId
    const s1Again = await sessionManager.getSession(session1.id);
    expect(s1Again?.contextId).toBe('context-111');
  });
});
