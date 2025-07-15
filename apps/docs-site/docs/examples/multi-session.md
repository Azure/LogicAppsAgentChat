---
sidebar_position: 3
---

# Multi-Session Chat Example

Learn how to implement a chat interface that supports multiple concurrent conversations with session management.

## Complete Multi-Session Implementation

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { A2AClient, Message } from '@microsoft/a2achat-core';
import {
  makeStyles,
  shorthands,
  tokens,
  FluentProvider,
  webLightTheme,
  Card,
  Button,
  Text,
  Input,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Divider,
  TabList,
  Tab,
  Badge,
} from '@fluentui/react-components';
import {
  Chat24Regular,
  Add24Regular,
  Delete24Regular,
  Edit24Regular,
  MoreVertical24Regular,
  CheckmarkCircle24Regular,
  Circle24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '320px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  sessionCard: {
    marginBottom: tokens.spacingVerticalS,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  activeSession: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('2px', 'solid', tokens.colorBrandForeground1),
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL),
  },
  inputArea: {
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
});

// Session management hook
function useSessionManager() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat-sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('chat-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createSession = useCallback(
    (name?: string) => {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        name: name || `Chat ${sessions.length + 1}`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      return newSession;
    },
    [sessions.length]
  );

  const updateSession = useCallback((id: string, updates: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, ...updates, updatedAt: new Date() } : session
      )
    );
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(sessions[0]?.id || null);
      }
    },
    [activeSessionId, sessions]
  );

  const addMessage = useCallback((sessionId: string, message: Message) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              updatedAt: new Date(),
            }
          : session
      )
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId),
    setActiveSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
  };
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  contextId?: string;
}

export function MultiSessionChat() {
  const styles = useStyles();
  const {
    sessions,
    activeSessionId,
    activeSession,
    setActiveSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
  } = useSessionManager();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = () => {
    createSession();
  };

  const handleRenameSession = () => {
    if (sessionToRename && newSessionName.trim()) {
      updateSession(sessionToRename, { name: newSessionName.trim() });
      setRenameDialogOpen(false);
      setNewSessionName('');
      setSessionToRename(null);
    }
  };

  const openRenameDialog = (sessionId: string, currentName: string) => {
    setSessionToRename(sessionId);
    setNewSessionName(currentName);
    setRenameDialogOpen(true);
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.header}>
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              onClick={handleCreateSession}
              style={{ width: '100%' }}
            >
              New Chat Session
            </Button>
          </div>

          <div className={styles.sessionList}>
            {sessions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: tokens.spacingVerticalXXL,
                  color: tokens.colorNeutralForeground3,
                }}
              >
                No sessions yet. Create one to start chatting!
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onClick={() => setActiveSessionId(session.id)}
                  onRename={() => openRenameDialog(session.id, session.name)}
                  onDelete={() => deleteSession(session.id)}
                  styles={styles}
                />
              ))
            )}
          </div>
        </aside>

        <main className={styles.chatArea}>
          {activeSession ? (
            <ChatInterface
              session={activeSession}
              onMessageAdd={(message) => addMessage(activeSession.id, message)}
              onContextUpdate={(contextId) => updateSession(activeSession.id, { contextId })}
              styles={styles}
            />
          ) : (
            <div className={styles.emptyState}>
              <div style={{ textAlign: 'center' }}>
                <Chat24Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
                <Text size={400}>Select a session or create a new one to start chatting</Text>
              </div>
            </div>
          )}
        </main>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Rename Session</DialogTitle>
              <DialogContent>
                <Input
                  value={newSessionName}
                  onChange={(e, data) => setNewSessionName(data.value)}
                  placeholder="Enter new name"
                  style={{ width: '100%' }}
                />
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button
                  appearance="primary"
                  onClick={handleRenameSession}
                  disabled={!newSessionName.trim()}
                >
                  Rename
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    </FluentProvider>
  );
}

// Session card component
function SessionCard({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
  styles,
}: {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  styles: any;
}) {
  const lastMessage = session.messages[session.messages.length - 1];
  const messageCount = session.messages.length;

  return (
    <Card
      className={`${styles.sessionCard} ${isActive ? styles.activeSession : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Chat24Regular style={{ marginTop: '2px' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text weight="semibold" truncate>
              {session.name}
            </Text>
            {messageCount > 0 && (
              <Badge appearance="filled" color="informative" size="extra-small">
                {messageCount}
              </Badge>
            )}
          </div>

          {lastMessage && (
            <Text size={200} truncate style={{ color: tokens.colorNeutralForeground3 }}>
              {lastMessage.role === 'user' ? 'You: ' : 'AI: '}
              {lastMessage.content[0]?.content || 'Message'}
            </Text>
          )}

          <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>
            {formatRelativeTime(session.updatedAt)}
          </Text>
        </div>

        <Menu>
          <MenuTrigger>
            <Button
              appearance="subtle"
              icon={<MoreVertical24Regular />}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<Edit24Regular />}
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
              >
                Rename
              </MenuItem>
              <Divider />
              <MenuItem
                icon={<Delete24Regular />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this session?')) {
                    onDelete();
                  }
                }}
              >
                Delete
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </Card>
  );
}

// Chat interface component
function ChatInterface({
  session,
  onMessageAdd,
  onContextUpdate,
  styles,
}: {
  session: ChatSession;
  onMessageAdd: (message: Message) => void;
  onContextUpdate: (contextId: string) => void;
  styles: any;
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [client] = useState(
    () =>
      new A2AClient({
        agentCard: 'https://api.example.com/.well-known/agent.json',
      })
  );

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', content: input.trim() }],
      timestamp: new Date(),
    };

    onMessageAdd(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const messageRequest = {
        message: {
          role: 'user' as const,
          content: [{ type: 'text' as const, content: userMessage.content[0].content }],
        },
        context: session.contextId ? { contextId: session.contextId } : undefined,
      };

      let assistantMessage: Message | null = null;

      for await (const task of client.message.stream(messageRequest)) {
        // Update context ID if it's a new conversation
        if (task.contextId && !session.contextId) {
          onContextUpdate(task.contextId);
        }

        // Find the latest assistant message
        const assistantMessages = task.messages.filter((m) => m.role === 'assistant');
        const latestAssistant = assistantMessages[assistantMessages.length - 1];

        if (latestAssistant) {
          const newMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: latestAssistant.content,
            timestamp: new Date(),
          };

          if (!assistantMessage) {
            assistantMessage = newMessage;
            onMessageAdd(newMessage);
          } else {
            // Update existing message
            assistantMessage.content = newMessage.content;
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      onMessageAdd({
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: [{ type: 'text', content: 'Sorry, an error occurred. Please try again.' }],
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          padding: tokens.spacingVerticalL,
          borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        }}
      >
        <Text size={500} weight="semibold">
          {session.name}
        </Text>
      </div>

      <div className={styles.messages}>
        {session.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '8px',
            }}
          >
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              AI is typing...
            </Text>
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <Input
            value={input}
            onChange={(e, data) => setInput(data.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <Button appearance="primary" type="submit" disabled={!input.trim() || isLoading}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: tokens.spacingVerticalM,
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: tokens.spacingVerticalS + ' ' + tokens.spacingHorizontalM,
          borderRadius: tokens.borderRadiusMedium,
          backgroundColor: isUser ? tokens.colorBrandBackground : tokens.colorNeutralBackground3,
          color: isUser ? tokens.colorNeutralForegroundOnBrand : tokens.colorNeutralForeground1,
        }}
      >
        <Text>{message.content[0]?.content}</Text>
        <Text
          size={100}
          style={{
            display: 'block',
            marginTop: tokens.spacingVerticalXS,
            opacity: 0.7,
          }}
        >
          {formatTime(message.timestamp)}
        </Text>
      </div>
    </div>
  );
}

// Utility functions
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatTime(date?: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

## Session Storage with IndexedDB

For better performance with large chat histories:

```typescript
// db.ts - IndexedDB wrapper for sessions
class ChatDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'a2a-chat-sessions';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', {
            keyPath: 'id',
          });
          sessionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', {
            keyPath: 'id',
          });
          messageStore.createIndex('sessionId', 'sessionId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getAllSessions(): Promise<ChatSession[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(session: ChatSession): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(session);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions', 'messages'], 'readwrite');

      // Delete session
      const sessionStore = transaction.objectStore('sessions');
      sessionStore.delete(sessionId);

      // Delete all messages for this session
      const messageStore = transaction.objectStore('messages');
      const index = messageStore.index('sessionId');
      const request = index.openCursor(IDBKeyRange.only(sessionId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const messages = request.result;
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveMessage(sessionId: string, message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put({ ...message, sessionId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Hook to use the database
export function useSessionDatabase() {
  const [db] = useState(() => new ChatDatabase());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    db.init().then(() => setIsReady(true));
  }, [db]);

  return { db, isReady };
}
```

## Features Implemented

1. **Session Management**
   - Create new sessions
   - Rename sessions
   - Delete sessions
   - Session persistence

2. **Context Preservation**
   - Maintains conversation context across messages
   - Each session has its own context ID

3. **UI Features**
   - Session list with last message preview
   - Message count badges
   - Relative timestamps
   - Active session highlighting
   - Empty states

4. **Performance**
   - Lazy loading of messages
   - IndexedDB for large histories
   - Efficient re-renders

## Best Practices

1. **Session Naming**: Auto-generate meaningful names based on first message
2. **Cleanup**: Implement session archiving for old conversations
3. **Search**: Add search functionality across sessions
4. **Export**: Allow users to export chat histories
5. **Sync**: Consider cloud sync for cross-device access

## Next Steps

- [Vue Integration](./vue-integration) - Multi-session in Vue.js
- [Advanced Features](../advanced/streaming) - Real-time features
- [Authentication](../advanced/authentication) - User-specific sessions
- [Deployment](../advanced/deployment) - Production considerations
