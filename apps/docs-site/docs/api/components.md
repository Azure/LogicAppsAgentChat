---
sidebar_position: 3
---

# Components API

Complete API reference for A2A Chat React components.

## ChatWidget

The complete chat interface component.

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface ChatWidgetProps {
  // Required
  agentCard: string | AgentCard;

  // User identification
  userId?: string;
  userName?: string;

  // UI customization
  placeholder?: string;
  welcomeMessage?: string;
  theme?: ChatTheme;
  className?: string;
  style?: React.CSSProperties;

  // Features
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];

  // Session
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

  // Accessibility
  ariaLabel?: string;
  announceMessages?: boolean;
  keyboardNavigation?: boolean;
  highContrast?: boolean;

  // Mobile
  mobileBreakpoint?: number;
  mobileFullScreen?: boolean;
  swipeToClose?: boolean;
  virtualKeyboardOffset?: boolean;
}
```

### Example

```tsx
<ChatWidget
  agentCard="https://api.example.com/.well-known/agent.json"
  userId="user-123"
  userName="John Doe"
  placeholder="Type your message..."
  welcomeMessage="Welcome! How can I help you today?"
  allowFileUpload={true}
  maxFileSize={5242880} // 5MB
  allowedFileTypes={['.pdf', '.doc', '.docx']}
  theme={{
    colors: {
      primary: '#0078d4',
      background: '#ffffff',
    },
  }}
  onMessage={(message) => {
    console.log('New message:', message);
  }}
  onError={(error) => {
    console.error('Chat error:', error);
  }}
/>
```

## Message

Individual message component with Fluent UI styling.

```tsx
import { Message } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface MessageProps {
  message: Message;
  agentName?: string;
  showTimestamp?: boolean;
  enableMarkdown?: boolean;
  onRetry?: () => void;
  className?: string;
  style?: React.CSSProperties;
}
```

### Example

```tsx
<Message
  message={{
    id: '123',
    role: 'assistant',
    content: [{ type: 'text', content: 'Hello!' }],
    timestamp: new Date(),
  }}
  agentName="AI Assistant"
  showTimestamp={true}
  enableMarkdown={true}
  onRetry={() => console.log('Retry message')}
/>
```

## MessageInput

Input component with file upload support.

```tsx
import { MessageInput } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface MessageInputProps {
  onSend: (content: string | MessageContent[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onTyping?: (isTyping: boolean) => void;
  className?: string;
  style?: React.CSSProperties;

  // Advanced
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  showCharCount?: boolean;
  suggestions?: string[];
}
```

### Example

```tsx
<MessageInput
  onSend={(content) => {
    console.log('Sending:', content);
  }}
  placeholder="Type a message..."
  allowFileUpload={true}
  maxFileSize={10485760} // 10MB
  allowedFileTypes={['.pdf', '.docx', '.txt']}
  multiline={true}
  maxLength={1000}
  showCharCount={true}
  suggestions={['Help', 'Status', 'Cancel']}
  onTyping={(isTyping) => {
    console.log('User typing:', isTyping);
  }}
/>
```

## MessageList

Efficiently renders a list of messages.

```tsx
import { MessageList } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface MessageListProps {
  messages: Message[];
  agentName?: string;
  showTypingIndicator?: boolean;
  enableVirtualization?: boolean;
  onMessageAction?: (action: string, message: Message) => void;
  className?: string;
  style?: React.CSSProperties;

  // Virtualization options
  itemHeight?: number;
  overscan?: number;

  // Message actions
  messageActions?: MessageAction[];
}

interface MessageAction {
  label: string;
  icon?: string;
  action: (message: Message) => void;
  condition?: (message: Message) => boolean;
}
```

### Example

```tsx
<MessageList
  messages={messages}
  agentName="Assistant"
  showTypingIndicator={isLoading}
  enableVirtualization={true}
  itemHeight={100}
  messageActions={[
    {
      label: 'Copy',
      icon: 'Copy',
      action: (msg) => navigator.clipboard.writeText(msg.content),
    },
    {
      label: 'Retry',
      icon: 'Refresh',
      action: (msg) => retryMessage(msg.id),
      condition: (msg) => msg.status === 'error',
    },
  ]}
  onMessageAction={(action, message) => {
    console.log(`Action ${action} on message:`, message);
  }}
/>
```

## ChatHeader

Customizable header component.

```tsx
import { ChatHeader } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: {
    name: string;
    image?: string;
    status?: 'online' | 'offline' | 'busy';
  };
  actions?: HeaderAction[];
  className?: string;
  style?: React.CSSProperties;
}

interface HeaderAction {
  icon: string;
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
}
```

### Example

```tsx
<ChatHeader
  title="Customer Support"
  subtitle="Average response time: 30 seconds"
  avatar={{
    name: 'Support Bot',
    image: '/bot-avatar.png',
    status: 'online',
  }}
  actions={[
    {
      icon: 'Settings',
      onClick: () => setShowSettings(true),
      tooltip: 'Chat settings',
    },
    {
      icon: 'Download',
      onClick: () => downloadTranscript(),
      tooltip: 'Download transcript',
    },
    {
      icon: 'Dismiss',
      onClick: () => closeChat(),
      tooltip: 'Close chat',
    },
  ]}
/>
```

## ChatContainer

Responsive container for chat layout.

```tsx
import { ChatContainer } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface ChatContainerProps {
  children: React.ReactNode;
  height?: string | number;
  width?: string | number;
  maxHeight?: string | number;
  maxWidth?: string | number;
  className?: string;
  style?: React.CSSProperties;
  responsive?: boolean;
}
```

### Example

```tsx
<ChatContainer height="600px" width="400px" maxHeight="90vh" responsive={true}>
  <ChatHeader title="AI Assistant" />
  <MessageList messages={messages} />
  <MessageInput onSend={sendMessage} />
</ChatContainer>
```

## ChatThemeProvider

Provides theme context to child components.

```tsx
import { ChatThemeProvider } from '@microsoft/a2achat-core/react';
```

### Props

```typescript
interface ChatThemeProviderProps {
  theme: ChatTheme;
  children: React.ReactNode;
}

interface ChatTheme {
  colors: {
    primary: string;
    primaryText: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
  borderRadius?: {
    small: string;
    medium: string;
    large: string;
  };
  spacing?: {
    small: string;
    medium: string;
    large: string;
  };
  typography?: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
    };
  };
}
```

### Example

```tsx
<ChatThemeProvider
  theme={{
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
  }}
>
  <ChatWidget agentCard={agentCard} />
</ChatThemeProvider>
```

## Utility Components

### LoadingIndicator

```tsx
import { LoadingIndicator } from '@microsoft/a2achat-core/react';

<LoadingIndicator
  text="Agent is thinking..."
  size="small" | "medium" | "large"
  inline={false}
/>
```

### ErrorBoundary

```tsx
import { ErrorBoundary } from '@microsoft/a2achat-core/react';

<ErrorBoundary
  fallback={(error, retry) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    console.error('Chat error:', error, errorInfo);
  }}
>
  <ChatWidget agentCard={agentCard} />
</ErrorBoundary>;
```

### FileUploadButton

```tsx
import { FileUploadButton } from '@microsoft/a2achat-core/react';

<FileUploadButton
  onFileSelect={(file) => {
    console.log('Selected:', file);
  }}
  accept=".pdf,.doc,.docx"
  maxSize={5242880}
  multiple={false}
  disabled={false}
/>;
```

### SessionList

```tsx
import { SessionList } from '@microsoft/a2achat-core/react';

<SessionList
  sessions={[
    { id: '1', name: 'Chat 1', lastMessage: 'Hello', timestamp: new Date() },
    { id: '2', name: 'Chat 2', lastMessage: 'Hi there', timestamp: new Date() },
  ]}
  activeSessionId="1"
  onSessionSelect={(sessionId) => {
    console.log('Selected session:', sessionId);
  }}
  onNewSession={() => {
    console.log('Create new session');
  }}
  onDeleteSession={(sessionId) => {
    console.log('Delete session:', sessionId);
  }}
  onRenameSession={(sessionId, newName) => {
    console.log('Rename session:', sessionId, newName);
  }}
/>;
```

## Component Composition

### Custom Chat Layout

```tsx
import {
  ChatContainer,
  ChatHeader,
  MessageList,
  MessageInput,
  useA2A,
} from '@microsoft/a2achat-core/react';

function CustomChat() {
  const { messages, sendMessage, isLoading } = useA2A({ agentCard });

  return (
    <ChatContainer height="100vh">
      <ChatHeader title="Custom Chat" actions={[{ icon: 'Settings', onClick: () => {} }]} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <MessageList messages={messages} showTypingIndicator={isLoading} />
      </div>

      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </ChatContainer>
  );
}
```

## Styling

All components accept `className` and `style` props for custom styling:

```tsx
<ChatWidget
  agentCard={agentCard}
  className="my-custom-chat"
  style={{
    border: '2px solid #ddd',
    borderRadius: '12px',
  }}
/>
```

## Accessibility

All components follow WCAG 2.1 guidelines:

- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus management

## See Also

- [React Components Guide](../usage/react-components)
- [Theming](../customization/theming)
- [TypeScript Types](./types)
- [Examples](../examples/custom-ui)
