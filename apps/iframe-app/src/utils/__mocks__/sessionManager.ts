import { Message } from '@microsoft/a2achat-core/react';
import { ChatSession, SessionMetadata } from '../sessionManager';

// In-memory storage for tests
const mockSessions: Record<string, ChatSession> = {};
let mockActiveSessionId: string | null = null;

export class SessionManager {
  private static instances: Map<string, SessionManager> = new Map();

  static getInstance(agentUrl: string): SessionManager {
    if (!SessionManager.instances.has(agentUrl)) {
      SessionManager.instances.set(agentUrl, new SessionManager());
    }
    return SessionManager.instances.get(agentUrl)!;
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    return Object.values(mockSessions)
      .map((session) => ({
        id: session.id,
        contextId: session.contextId,
        name: session.name,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessage: session.messages[session.messages.length - 1]?.content || '',
      }))
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by creation time to maintain stable order
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return mockSessions[sessionId] || null;
  }

  async createSession(name?: string): Promise<ChatSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newSession: ChatSession = {
      id: sessionId,
      contextId: null,
      name: name || `New Chat ${new Date(now).toLocaleString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    mockSessions[sessionId] = newSession;
    mockActiveSessionId = sessionId;

    return newSession;
  }

  async saveSession(session: ChatSession): Promise<void> {
    mockSessions[session.id] = {
      ...session,
      updatedAt: Date.now(),
    };
  }

  async updateSessionMessages(
    sessionId: string,
    messages: Message[],
    contextId?: string
  ): Promise<void> {
    const session = mockSessions[sessionId];
    if (!session) return;

    // Only update if messages have actually changed
    const messagesChanged = JSON.stringify(session.messages) !== JSON.stringify(messages);
    const contextIdChanged = contextId && !session.contextId;

    if (!messagesChanged && !contextIdChanged) {
      return; // No changes, don't update
    }

    session.messages = messages;
    if (contextId && !session.contextId) {
      session.contextId = contextId;
    }

    await this.saveSession(session);
  }

  async updateSessionContextId(sessionId: string, contextId: string): Promise<void> {
    const session = mockSessions[sessionId];
    if (!session) return;

    // Only update if contextId is actually changing
    if (session.contextId === contextId) {
      return; // No change
    }

    session.contextId = contextId;
    // Don't update updatedAt for context changes
    mockSessions[sessionId] = session;
  }

  async renameSession(sessionId: string, newName: string): Promise<void> {
    const session = mockSessions[sessionId];
    if (!session) return;

    session.name = newName;
    await this.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    delete mockSessions[sessionId];
    if (mockActiveSessionId === sessionId) {
      mockActiveSessionId = null;
    }
  }

  async getActiveSessionId(): Promise<string | null> {
    return mockActiveSessionId;
  }

  async setActiveSession(sessionId: string): Promise<void> {
    mockActiveSessionId = sessionId;
  }

  // Helper method for tests to access session synchronously
  getSessionSync(sessionId: string): ChatSession | null {
    return mockSessions[sessionId] || null;
  }

  // Helper method to clear all sessions in tests
  static clearAllSessions(): void {
    Object.keys(mockSessions).forEach((key) => delete mockSessions[key]);
    mockActiveSessionId = null;
    SessionManager.instances.clear();
  }
}
