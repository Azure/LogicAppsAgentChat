---
sidebar_position: 3
---

# Pre-built React Components

A2A Chat provides a comprehensive set of pre-built React components that you can use to quickly build chat interfaces. These components are built with Microsoft's Fluent UI v9 and are fully customizable.

## ChatWidget

The `ChatWidget` is a complete chat interface that works out of the box:

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <div style={{ height: '600px' }}>
      <ChatWidget
        agentCard="https://api.example.com/.well-known/agent.json"
        userId="user-123"
        userName="John Doe"
        placeholder="Ask me anything..."
        welcomeMessage="Hello! I'm here to help. What can I do for you today?"
      />
    </div>
  );
}
```

### ChatWidget Props

```typescript
interface ChatWidgetProps {
  // Required: Agent configuration
  agentCard: string | AgentCard;

  // User identification
  userId?: string;
  userName?: string;

  // UI customization
  placeholder?: string;
  welcomeMessage?: string;
  theme?: ChatTheme;

  // Features
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];

  // Session management
  sessionKey?: string;

  // Metadata
  metadata?: Record<string, unknown>;

  // Plugins
  plugins?: ChatPlugin[];

  // Event handlers
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}
```

### Full Example

```tsx
<ChatWidget
  agentCard={{
    url: 'https://api.example.com',
    name: 'Support Agent',
    description: '24/7 Customer Support',
    capabilities: {
      streaming: true,
      authentication: true,
      fileUploads: true,
      maxFileSize: 10485760, // 10MB
    },
  }}
  userId="user-123"
  userName="John Doe"
  placeholder="Type your message..."
  welcomeMessage="Welcome! How can I assist you today?"
  allowFileUpload={true}
  maxFileSize={5242880} // 5MB
  allowedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
  theme={{
    colors: {
      primary: '#0078d4',
      background: '#ffffff',
    },
  }}
  sessionKey="support-chat-session"
  metadata={{
    source: 'web-app',
    page: 'support',
  }}
  onMessage={(message) => {
    console.log('New message:', message);
  }}
  onError={(error) => {
    console.error('Chat error:', error);
  }}
/>
```

## ChatThemeProvider

Wrap your chat components with `ChatThemeProvider` to apply consistent theming:

```tsx
import { ChatThemeProvider, ChatWidget } from '@microsoft/a2achat-core/react';

const theme = {
  colors: {
    primary: '#6200ea',
    primaryText: '#ffffff',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
  },
};

function ThemedApp() {
  return (
    <ChatThemeProvider theme={theme}>
      <ChatWidget agentCard={agentCard} />
    </ChatThemeProvider>
  );
}
```

## Individual Components

### Message Component

Display individual messages with proper formatting:

```tsx
import { Message } from '@microsoft/a2achat-core/react';

function ChatMessage({ message, agentName }) {
  return (
    <Message
      message={message}
      agentName={agentName}
      showTimestamp={true}
      enableMarkdown={true}
      onRetry={() => console.log('Retry message')}
    />
  );
}
```

### MessageInput Component

A feature-rich input component:

```tsx
import { MessageInput } from '@microsoft/a2achat-core/react';

function ChatInput() {
  const handleSend = (content: string | MessageContent[]) => {
    console.log('Sending:', content);
  };

  return (
    <MessageInput
      onSend={handleSend}
      placeholder="Type a message..."
      disabled={false}
      allowFileUpload={true}
      maxFileSize={10485760}
      allowedFileTypes={['.pdf', '.docx', '.txt']}
      onTyping={(isTyping) => console.log('Typing:', isTyping)}
    />
  );
}
```

### MessageList Component

Efficiently render a list of messages:

```tsx
import { MessageList } from '@microsoft/a2achat-core/react';

function ChatMessages({ messages }) {
  return (
    <MessageList
      messages={messages}
      agentName="Assistant"
      showTypingIndicator={false}
      enableVirtualization={true}
      onMessageAction={(action, message) => {
        console.log(`Action ${action} on message:`, message);
      }}
    />
  );
}
```

### Header Component

Customizable chat header:

```tsx
import { ChatHeader } from '@microsoft/a2achat-core/react';

function Header() {
  return (
    <ChatHeader
      title="Customer Support"
      subtitle="Average response time: 30 seconds"
      avatar={{
        name: 'Support Bot',
        image: '/bot-avatar.png',
      }}
      actions={[
        {
          icon: 'Settings',
          onClick: () => console.log('Settings clicked'),
          tooltip: 'Chat settings',
        },
        {
          icon: 'Dismiss',
          onClick: () => console.log('Close chat'),
          tooltip: 'Close chat',
        },
      ]}
    />
  );
}
```

## Layout Components

### ChatContainer

A responsive container that handles layout:

```tsx
import {
  ChatContainer,
  ChatHeader,
  MessageList,
  MessageInput,
} from '@microsoft/a2achat-core/react';

function CustomChat() {
  return (
    <ChatContainer height="600px" width="400px">
      <ChatHeader title="AI Assistant" />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </ChatContainer>
  );
}
```

### SplitView for Multi-Session

```tsx
import { SplitView, SessionList, ChatWidget } from '@microsoft/a2achat-core/react';

function MultiSessionChat() {
  const [activeSession, setActiveSession] = useState('session-1');

  return (
    <SplitView
      sidebar={
        <SessionList
          sessions={sessions}
          activeSessionId={activeSession}
          onSessionSelect={setActiveSession}
          onNewSession={() => console.log('New session')}
        />
      }
      content={<ChatWidget key={activeSession} agentCard={agentCard} sessionKey={activeSession} />}
      sidebarWidth={300}
      collapsible={true}
    />
  );
}
```

## Utility Components

### LoadingIndicator

Show loading states:

```tsx
import { LoadingIndicator } from '@microsoft/a2achat-core/react';

<LoadingIndicator text="Agent is thinking..." size="medium" inline={false} />;
```

### ErrorBoundary

Handle errors gracefully:

```tsx
import { ErrorBoundary } from '@microsoft/a2achat-core/react';

<ErrorBoundary
  fallback={(error) => (
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  )}
>
  <ChatWidget agentCard={agentCard} />
</ErrorBoundary>;
```

### FileUploadButton

Standalone file upload:

```tsx
import { FileUploadButton } from '@microsoft/a2achat-core/react';

<FileUploadButton
  onFileSelect={(file) => {
    console.log('Selected file:', file);
  }}
  accept=".pdf,.doc,.docx"
  maxSize={5242880} // 5MB
  multiple={false}
/>;
```

## Composition Patterns

### Custom Chat Layout

```tsx
import { ChatHeader, MessageList, MessageInput, useA2A } from '@microsoft/a2achat-core/react';

function CustomChatLayout() {
  const { messages, sendMessage, isLoading } = useA2A({ agentCard });

  return (
    <div className="custom-chat">
      <ChatHeader title="Custom Chat" className="custom-header" />

      <div className="custom-messages">
        <MessageList messages={messages} className="custom-list" />
      </div>

      <div className="custom-input">
        <MessageInput onSend={sendMessage} disabled={isLoading} className="custom-input-field" />
      </div>
    </div>
  );
}
```

### Chat with Sidebar

```tsx
function ChatWithSidebar() {
  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <h3>Recent Conversations</h3>
        <SessionList sessions={sessions} />
      </aside>

      <main className="chat-main">
        <ChatWidget agentCard={agentCard} className="full-height" />
      </main>

      <aside className="chat-info">
        <h3>Agent Info</h3>
        <AgentCard agent={agentCard} />
      </aside>
    </div>
  );
}
```

## Styling Components

### Using CSS Modules

```tsx
import styles from './Chat.module.css';

<ChatWidget
  agentCard={agentCard}
  className={styles.customChat}
  messageClassName={styles.customMessage}
  inputClassName={styles.customInput}
/>;
```

### Using Styled Components

```tsx
import styled from 'styled-components';

const StyledChatWidget = styled(ChatWidget)`
  .message-list {
    background: #f0f0f0;
  }

  .message-input {
    border-top: 2px solid #e0e0e0;
  }
`;

<StyledChatWidget agentCard={agentCard} />;
```

### Using Emotion

```tsx
import { css } from '@emotion/react';

const chatStyles = css`
  height: 100vh;
  border: 1px solid #ddd;

  .message {
    padding: 12px;
    margin: 8px;
  }
`;

<div css={chatStyles}>
  <ChatWidget agentCard={agentCard} />
</div>;
```

## Accessibility

All components follow WCAG 2.1 guidelines:

```tsx
<ChatWidget
  agentCard={agentCard}
  // Accessibility props
  ariaLabel="Chat with AI assistant"
  announceMessages={true}
  keyboardNavigation={true}
  highContrast={false}
/>
```

### Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `Escape` - Clear input
- `Up/Down` - Navigate message history
- `Tab` - Navigate between elements

## Mobile Responsiveness

Components are mobile-first and responsive:

```tsx
<ChatWidget
  agentCard={agentCard}
  // Mobile-specific props
  mobileBreakpoint={768}
  mobileFullScreen={true}
  swipeToClose={true}
  virtualKeyboardOffset={true}
/>
```

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const ChatWidget = lazy(() =>
  import('@microsoft/a2achat-core/react').then((module) => ({
    default: module.ChatWidget,
  }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatWidget agentCard={agentCard} />
    </Suspense>
  );
}
```

### Memoization

```tsx
import { memo } from 'react';

const MemoizedMessage = memo(Message, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content
  );
});
```

## Next Steps

- [Theming Guide](../customization/theming) - Customize component appearance
- [Plugin System](../customization/plugins) - Extend component functionality
- [Examples](../examples/basic-chat) - See components in action
- [API Reference](../api/components) - Complete component API
