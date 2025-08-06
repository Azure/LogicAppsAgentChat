---
sidebar_position: 2
---

# Using React Hooks

The `useA2A` hook provides a powerful way to integrate A2A Chat into your React applications with complete control over the UI and behavior.

## Basic Usage

```tsx
import React from 'react';
import { useA2A } from '@microsoft/a2achat-core/react';

function ChatComponent() {
  const { messages, sendMessage, isLoading, error, clearMessages } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent-card.json',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = e.target.message as HTMLInputElement;
    sendMessage(input.value);
    input.value = '';
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input name="message" type="text" disabled={isLoading} placeholder="Type a message..." />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>

      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

## Hook Configuration

The `useA2A` hook accepts various configuration options:

```typescript
interface UseA2AConfig {
  // Required: Agent card URL or object
  agentCard: string | AgentCard;

  // Optional: User identification
  userId?: string;
  userName?: string;

  // Optional: Initial messages
  initialMessages?: Message[];

  // Optional: Welcome message
  welcomeMessage?: string;

  // Optional: Session key for persistence
  sessionKey?: string;

  // Optional: Metadata to send with messages
  metadata?: Record<string, unknown>;

  // Optional: Plugins
  plugins?: ChatPlugin[];

  // Optional: Error handler
  onError?: (error: Error) => void;

  // Optional: Message handler
  onMessage?: (message: Message) => void;
}
```

### Full Configuration Example

```tsx
const { messages, sendMessage, isLoading, error, clearMessages, retryLastMessage } = useA2A({
  agentCard: {
    url: 'https://api.example.com',
    name: 'Support Agent',
    description: 'Customer support assistant',
    capabilities: {
      streaming: true,
      authentication: true,
      fileUploads: true,
    },
  },
  userId: 'user-123',
  userName: 'John Doe',
  welcomeMessage: 'Hello! How can I help you today?',
  sessionKey: 'chat-session-1',
  metadata: {
    source: 'web-app',
    version: '1.0.0',
  },
  onError: (error) => {
    console.error('Chat error:', error);
    // Send to error tracking service
  },
  onMessage: (message) => {
    console.log('New message:', message);
    // Analytics tracking
  },
});
```

## Hook Return Values

The hook returns an object with the following properties:

```typescript
interface UseA2AReturn {
  // Current messages in the conversation
  messages: Message[];

  // Function to send a new message
  sendMessage: (content: string | MessageContent[]) => Promise<void>;

  // Loading state while agent is responding
  isLoading: boolean;

  // Current error, if any
  error: Error | null;

  // Clear all messages
  clearMessages: () => void;

  // Retry the last failed message
  retryLastMessage: () => Promise<void>;

  // The underlying A2A client instance
  client: A2AClient | null;

  // Current context ID for the conversation
  contextId: string | undefined;
}
```

## Advanced Message Sending

### Text Messages

```tsx
// Simple text
sendMessage('Hello, agent!');

// Rich content
sendMessage([
  { type: 'text', content: 'Please analyze this data:' },
  { type: 'text', content: '- Q1: $1.2M\n- Q2: $1.5M\n- Q3: $1.8M' },
]);
```

### File Uploads

```tsx
function FileUploadChat() {
  const { sendMessage, isLoading } = useA2A({ agentCard });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;

      // Send file with message
      await sendMessage([
        { type: 'text', content: `Please analyze ${file.name}` },
        {
          type: 'file',
          filename: file.name,
          mimeType: file.type,
          data: base64,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={isLoading}
        accept=".csv,.xlsx,.pdf,.txt"
      />
    </div>
  );
}
```

### Structured Data

```tsx
// Send structured commands
sendMessage([
  {
    type: 'structured',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        parameters: { type: 'object' },
      },
    },
    data: {
      command: 'search',
      parameters: {
        query: 'latest reports',
        limit: 10,
        sortBy: 'date',
      },
    },
  },
]);
```

## State Management

### Message Persistence

```tsx
function PersistentChat() {
  // Messages are automatically persisted with sessionKey
  const { messages } = useA2A({
    agentCard,
    sessionKey: 'user-chat-session',
  });

  // Messages will be restored on component remount
  return <MessageList messages={messages} />;
}
```

### Custom State Management

```tsx
function ChatWithRedux() {
  const dispatch = useDispatch();
  const { sendMessage } = useA2A({
    agentCard,
    onMessage: (message) => {
      // Sync with Redux store
      dispatch(addMessage(message));
    },
  });

  return <Chat onSend={sendMessage} />;
}
```

## Error Handling

### Automatic Retry

```tsx
function ChatWithRetry() {
  const { error, retryLastMessage, isLoading } = useA2A({ agentCard });

  if (error) {
    return (
      <div className="error-state">
        <p>Failed to send message: {error.message}</p>
        <button onClick={retryLastMessage} disabled={isLoading}>
          Retry
        </button>
      </div>
    );
  }

  return <Chat />;
}
```

### Custom Error Handling

```tsx
function ChatWithErrorBoundary() {
  const [errorCount, setErrorCount] = useState(0);

  const { sendMessage } = useA2A({
    agentCard,
    onError: (error) => {
      setErrorCount((prev) => prev + 1);

      if (errorCount >= 3) {
        // Show fallback UI after 3 errors
        console.error('Too many errors, showing fallback');
      } else if (error.code === 'NETWORK_ERROR') {
        // Handle network errors
        toast.error('Connection lost. Please check your internet.');
      } else {
        // Generic error handling
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  return <Chat onSend={sendMessage} />;
}
```

## Authentication Integration

```tsx
function AuthenticatedChat() {
  const [authToken, setAuthToken] = useState<string | null>(null);

  const { messages, sendMessage } = useA2A({
    agentCard,
    auth: authToken
      ? {
          type: 'bearer',
          token: authToken,
        }
      : undefined,
    onError: async (error) => {
      if (error.code === 'AUTH_REQUIRED') {
        // Trigger authentication flow
        const token = await authenticateUser();
        setAuthToken(token);
      }
    },
  });

  return <Chat messages={messages} onSend={sendMessage} />;
}
```

## UI Patterns

### Message Status Indicators

```tsx
function MessageWithStatus({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-content">{message.content}</div>
      <div className="message-status">
        {message.status === 'sending' && <Spinner />}
        {message.status === 'sent' && <CheckIcon />}
        {message.status === 'error' && <ErrorIcon />}
      </div>
    </div>
  );
}
```

### Typing Indicators

```tsx
function ChatWithTypingIndicator() {
  const { messages, isLoading } = useA2A({ agentCard });

  return (
    <div className="chat">
      <MessageList messages={messages} />
      {isLoading && (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
          Agent is typing...
        </div>
      )}
    </div>
  );
}
```

### Message Actions

```tsx
function InteractiveMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    navigator.share({
      text: message.content,
      title: 'Chat Message',
    });
  };

  return (
    <div className="message">
      <div className="message-content">{message.content}</div>
      <div className="message-actions">
        <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
        <button onClick={handleShare}>Share</button>
      </div>
    </div>
  );
}
```

## Plugin Integration

```tsx
const analyticsPlugin: ChatPlugin = {
  name: 'analytics',
  onMessageSent: (message) => {
    analytics.track('message_sent', {
      role: message.role,
      hasFiles: message.content.some((c) => c.type === 'file'),
    });
  },
  onMessageReceived: (message) => {
    analytics.track('message_received', {
      role: message.role,
      length: message.content.length,
    });
  },
};

function ChatWithAnalytics() {
  const { messages, sendMessage } = useA2A({
    agentCard,
    plugins: [analyticsPlugin],
  });

  return <Chat messages={messages} onSend={sendMessage} />;
}
```

## Performance Optimization

### Message Virtualization

```tsx
import { FixedSizeList } from 'react-window';

function VirtualizedChat() {
  const { messages } = useA2A({ agentCard });

  const Row = ({ index, style }) => (
    <div style={style}>
      <Message message={messages[index]} />
    </div>
  );

  return (
    <FixedSizeList height={600} itemCount={messages.length} itemSize={100} width="100%">
      {Row}
    </FixedSizeList>
  );
}
```

### Debounced Input

```tsx
import { useDebouncedCallback } from 'use-debounce';

function ChatWithDebounce() {
  const { sendMessage } = useA2A({ agentCard });
  const [input, setInput] = useState('');

  const debouncedSend = useDebouncedCallback((value: string) => {
    if (value.trim()) {
      sendMessage(value);
      setInput('');
    }
  }, 500);

  return (
    <input
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        debouncedSend(e.target.value);
      }}
      placeholder="Type and message sends automatically..."
    />
  );
}
```

## Testing

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useA2A } from '@microsoft/a2achat-core/react';

describe('useA2A', () => {
  it('should send messages', async () => {
    const { result } = renderHook(() =>
      useA2A({
        agentCard: mockAgentCard,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.messages[1].role).toBe('assistant');
  });
});
```

## Next Steps

- [Pre-built Components](./react-components) - Ready-to-use UI components
- [Theming Guide](../customization/theming) - Customize appearance
- [Plugin Development](../customization/plugins) - Extend functionality
- [Examples](../examples/custom-ui) - Complete implementations
