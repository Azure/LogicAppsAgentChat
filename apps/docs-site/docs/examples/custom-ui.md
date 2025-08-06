---
sidebar_position: 2
---

# Custom UI Examples

Build advanced custom chat interfaces with A2A Chat's flexible components and hooks.

## Advanced Chat Interface

A feature-rich chat with custom styling, file uploads, and message actions:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useA2A, Message as MessageType, MessageContent } from '@microsoft/a2achat-core/react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Textarea,
  Tooltip,
  Badge,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  Send24Regular,
  Attach24Regular,
  Delete24Regular,
  Copy24Regular,
  ArrowDownload24Regular,
  MoreVertical24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
  },
  userMessageWrapper: {
    flexDirection: 'row-reverse',
  },
  message: {
    maxWidth: '70%',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    position: 'relative',
  },
  userMessage: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  assistantMessage: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  timestamp: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
    marginTop: tokens.spacingVerticalXS,
  },
  inputContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  input: {
    flex: 1,
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    fontSize: tokens.fontSizeBase200,
  },
});

export function AdvancedChat() {
  const styles = useStyles();
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading, error, clearMessages } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent-card.json',
    userName: 'John Doe',
    welcomeMessage:
      'Hello! I can help you with documents, code, and more. Feel free to upload files!',
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const content: MessageContent[] = [];

    if (input.trim()) {
      content.push({ type: 'text', content: input });
    }

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (base64) {
          content.push({
            type: 'file',
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            data: base64,
          });
          await sendMessage(content);
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      await sendMessage(content);
    }

    setInput('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadMessage = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            name="AI Assistant"
            image={{ src: '/ai-avatar.png' }}
            badge={{ status: 'available' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px' }}>AI Assistant</h1>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Always here to help</p>
          </div>
        </div>

        <Button appearance="subtle" icon={<Delete24Regular />} onClick={clearMessages}>
          Clear Chat
        </Button>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            onCopy={copyMessage}
            onDownload={downloadMessage}
            styles={styles}
          />
        ))}

        {isLoading && (
          <div className={styles.messageWrapper}>
            <Avatar name="AI Assistant" />
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && (
          <Badge appearance="filled" color="danger">
            Error: {error.message}
          </Badge>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".txt,.pdf,.doc,.docx,.csv,.json,.js,.ts,.py"
        />

        <Tooltip content="Attach file" relationship="label">
          <Button
            appearance="subtle"
            icon={<Attach24Regular />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          />
        </Tooltip>

        <div style={{ flex: 1 }}>
          {selectedFile && (
            <div className={styles.filePreview}>
              <span>{selectedFile.name}</span>
              <span>({formatFileSize(selectedFile.size)})</span>
              <Button appearance="subtle" size="small" onClick={() => setSelectedFile(null)}>
                ×
              </Button>
            </div>
          )}

          <Textarea
            className={styles.input}
            value={input}
            onChange={(e, data) => setInput(data.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            disabled={isLoading}
            resize="vertical"
          />
        </div>

        <Button
          appearance="primary"
          icon={<Send24Regular />}
          onClick={handleSend}
          disabled={isLoading || (!input.trim() && !selectedFile)}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  onCopy,
  onDownload,
  styles,
}: {
  message: MessageType;
  onCopy: (text: string) => void;
  onDownload: (text: string, filename: string) => void;
  styles: any;
}) {
  const isUser = message.role === 'user';
  const messageText = message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.content)
    .join('\n');

  return (
    <div className={`${styles.messageWrapper} ${isUser ? styles.userMessageWrapper : ''}`}>
      {!isUser && <Avatar name="AI Assistant" />}

      <div className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
        <div className={styles.messageContent}>{messageText}</div>

        <div className={styles.timestamp}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
        </div>

        {!isUser && (
          <Menu>
            <MenuTrigger>
              <Button
                appearance="subtle"
                icon={<MoreVertical24Regular />}
                size="small"
                style={{ position: 'absolute', top: '4px', right: '4px' }}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<Copy24Regular />} onClick={() => onCopy(messageText)}>
                  Copy
                </MenuItem>
                <MenuItem
                  icon={<ArrowDownload24Regular />}
                  onClick={() => onDownload(messageText, 'message.txt')}
                >
                  Download
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        )}
      </div>

      {isUser && <Avatar name="You" />}
    </div>
  );
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: tokens.colorNeutralForeground4,
            animation: `typing 1.4s infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes typing {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
```

## Sidebar Chat with History

Chat interface with conversation history sidebar:

```tsx
import React, { useState } from 'react';
import {
  useA2A,
  ChatContainer,
  MessageList,
  MessageInput,
  ChatHeader,
} from '@microsoft/a2achat-core/react';
import { makeStyles, tokens, shorthands, Card, Button, Text } from '@fluentui/react-components';
import { Chat24Regular, Add24Regular, Delete24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '300px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
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
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  activeSession: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('2px', 'solid', tokens.colorBrandForeground1),
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
});

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  agentCard: string;
}

export function SidebarChat() {
  const styles = useStyles();
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Project Discussion',
      lastMessage: 'Let me help you with that code...',
      timestamp: new Date(),
      agentCard: 'https://api.example.com/.well-known/agent-card.json',
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('1');

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `Chat ${sessions.length + 1}`,
      lastMessage: 'New conversation',
      timestamp: new Date(),
      agentCard: 'https://api.example.com/.well-known/agent-card.json',
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    if (id === activeSessionId && sessions.length > 1) {
      setActiveSessionId(sessions[0].id);
    }
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={createNewSession}
            style={{ width: '100%' }}
          >
            New Chat
          </Button>
        </div>

        <div className={styles.sessionList}>
          {sessions.map((session) => (
            <Card
              key={session.id}
              className={`${styles.sessionCard} ${
                session.id === activeSessionId ? styles.activeSession : ''
              }`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Chat24Regular />
                <div style={{ flex: 1 }}>
                  <Text weight="semibold">{session.title}</Text>
                  <Text size={200} truncate>
                    {session.lastMessage}
                  </Text>
                </div>
                {sessions.length > 1 && (
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      </aside>

      <main className={styles.chatArea}>
        {activeSession && <ChatSession key={activeSession.id} session={activeSession} />}
      </main>
    </div>
  );
}

function ChatSession({ session }: { session: ChatSession }) {
  const { messages, sendMessage, isLoading } = useA2A({
    agentCard: session.agentCard,
    sessionKey: `session-${session.id}`,
  });

  return (
    <ChatContainer style={{ height: '100%' }}>
      <ChatHeader title={session.title} subtitle="AI Assistant" />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <MessageList messages={messages} showTypingIndicator={isLoading} />
      </div>

      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </ChatContainer>
  );
}
```

## Minimal Dark Theme Chat

A clean, minimal chat with dark theme:

```tsx
import React from 'react';
import { ChatWidget, ChatThemeProvider } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

const darkTheme = {
  colors: {
    primary: '#60a5fa',
    primaryText: '#ffffff',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    error: '#ef4444',
    success: '#10b981',
  },
  borderRadius: {
    small: '6px',
    medium: '12px',
    large: '20px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem',
    },
  },
};

export function MinimalDarkChat() {
  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '80vh',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <ChatThemeProvider theme={darkTheme}>
          <ChatWidget
            agentCard="https://api.example.com/.well-known/agent-card.json"
            placeholder="Ask me anything..."
            welcomeMessage="Hello! I'm here to help. What would you like to know?"
          />
        </ChatThemeProvider>
      </div>
    </div>
  );
}
```

## Mobile-First Responsive Chat

Optimized for mobile devices:

```tsx
import React, { useState } from 'react';
import { useA2A } from '@microsoft/a2achat-core/react';
import './MobileChat.css';

export function MobileChat() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, isLoading } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent-card.json',
  });

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button className="fab" onClick={() => setIsOpen(true)} aria-label="Open chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-13h4v6h-4zm0 8h4v2h-4z" />
          </svg>
        </button>
      )}

      {/* Chat Interface */}
      <div className={`mobile-chat ${isOpen ? 'open' : ''}`}>
        <header className="mobile-chat-header">
          <button className="back-button" onClick={() => setIsOpen(false)}>
            ←
          </button>
          <h1>AI Assistant</h1>
          <div className="status-indicator online" />
        </header>

        <div className="mobile-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`mobile-message ${msg.role}`}>
              {msg.content[0]?.content}
            </div>
          ))}

          {isLoading && (
            <div className="mobile-message assistant typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        <form
          className="mobile-chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.message as HTMLInputElement;
            if (input.value.trim()) {
              sendMessage(input.value);
              input.value = '';
            }
          }}
        >
          <input
            name="message"
            type="text"
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            Send
          </button>
        </form>
      </div>
    </>
  );
}
```

```css
/* MobileChat.css */
.fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  z-index: 999;
}

.fab:active {
  transform: scale(0.95);
}

.mobile-chat {
  position: fixed;
  inset: 0;
  background: white;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
  z-index: 1000;
}

.mobile-chat.open {
  transform: translateY(0);
}

.mobile-chat-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #2563eb;
  color: white;
  gap: 12px;
}

.back-button {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  padding: 0;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

.mobile-chat-header h1 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.mobile-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-message {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
}

.mobile-message.user {
  align-self: flex-end;
  background: #2563eb;
  color: white;
}

.mobile-message.assistant {
  align-self: flex-start;
  background: #f3f4f6;
  color: #1f2937;
}

.mobile-message.typing {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.mobile-message.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite;
}

.mobile-message.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.mobile-message.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

.mobile-chat-input {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
}

.mobile-chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  outline: none;
  font-size: 16px;
}

.mobile-chat-input button {
  padding: 12px 24px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 500;
  cursor: pointer;
}

.mobile-chat-input button:disabled {
  opacity: 0.5;
}

/* Tablet and Desktop adjustments */
@media (min-width: 768px) {
  .mobile-chat {
    inset: auto;
    bottom: 90px;
    right: 20px;
    width: 400px;
    height: 600px;
    border-radius: 12px;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  }
}
```

## Best Practices

1. **Accessibility**: Always include proper ARIA labels and keyboard navigation
2. **Performance**: Use virtualization for long message lists
3. **Responsiveness**: Test on various screen sizes
4. **Error Handling**: Provide clear error messages and recovery options
5. **Loading States**: Show appropriate feedback during async operations

## Next Steps

- [Multi-Session Example](./multi-session) - Handle multiple conversations
- [Vue Integration](./vue-integration) - Use with Vue.js
- [Theming Guide](../customization/theming) - Customize appearance
- [Plugin Development](../customization/plugins) - Extend functionality
