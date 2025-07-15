---
sidebar_position: 2
---

# React Hooks API

Complete API reference for A2A Chat React hooks.

## useA2A

The main hook for integrating A2A Chat into React applications.

```typescript
useA2A(config: UseA2AConfig): UseA2AReturn
```

### UseA2AConfig

```typescript
interface UseA2AConfig {
  // Required: Agent card URL or object
  agentCard: string | AgentCard;

  // User identification
  userId?: string;
  userName?: string;

  // Initial state
  initialMessages?: Message[];
  welcomeMessage?: string;

  // Session persistence
  sessionKey?: string;

  // Metadata for all messages
  metadata?: Record<string, unknown>;

  // Plugins
  plugins?: ChatPlugin[];

  // Event handlers
  onError?: (error: Error) => void;
  onMessage?: (message: Message) => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}
```

### UseA2AReturn

```typescript
interface UseA2AReturn {
  // State
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  contextId: string | undefined;

  // Actions
  sendMessage: (content: string | MessageContent[]) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;

  // Client instance
  client: A2AClient | null;
}
```

### Basic Example

```tsx
function Chat() {
  const { messages, sendMessage, isLoading, error } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent.json',
  });

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage('Hello')} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
```

### Advanced Example

```tsx
function AdvancedChat() {
  const { messages, sendMessage, isLoading, error, clearMessages, retryLastMessage, contextId } =
    useA2A({
      agentCard: {
        url: 'https://api.example.com',
        name: 'Assistant',
        description: 'AI Assistant',
        capabilities: {
          streaming: true,
          authentication: true,
          fileUploads: true,
        },
      },
      userId: 'user-123',
      userName: 'John Doe',
      welcomeMessage: 'Hello! How can I help?',
      sessionKey: 'chat-session',
      metadata: {
        source: 'web-app',
        version: '1.0.0',
      },
      plugins: [analyticsPlugin],
      onError: (error) => {
        console.error('Chat error:', error);
        trackError(error);
      },
      onMessage: (message) => {
        console.log('New message:', message);
        trackMessage(message);
      },
    });

  // Component implementation
}
```

## useA2AStore

Access the underlying Zustand store directly.

```typescript
useA2AStore(): A2AStore
useA2AStore<T>(selector: (state: A2AStore) => T): T
```

### Store Interface

```typescript
interface A2AStore {
  // State
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  contextId: string | undefined;
  client: A2AClient | null;

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, message: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setContextId: (contextId: string) => void;
  setClient: (client: A2AClient) => void;
}
```

### Example

```tsx
function MessageCount() {
  // Select only what you need
  const messageCount = useA2AStore((state) => state.messages.length);

  return <div>Messages: {messageCount}</div>;
}

function ChatActions() {
  const { clearMessages, isLoading } = useA2AStore();

  return (
    <button onClick={clearMessages} disabled={isLoading}>
      Clear Chat
    </button>
  );
}
```

## useA2AConfig

Access the current configuration.

```typescript
useA2AConfig(): UseA2AConfig | null
```

### Example

```tsx
function ConfigDisplay() {
  const config = useA2AConfig();

  if (!config) return null;

  return (
    <div>
      <p>Agent: {config.agentCard.name}</p>
      <p>User: {config.userName || 'Anonymous'}</p>
    </div>
  );
}
```

## useA2ATheme

Access and modify the chat theme.

```typescript
useA2ATheme(): {
  theme: ChatTheme;
  setTheme: (theme: Partial<ChatTheme>) => void;
}
```

### Example

```tsx
function ThemeToggle() {
  const { theme, setTheme } = useA2ATheme();

  const toggleDarkMode = () => {
    setTheme({
      colors: {
        ...theme.colors,
        background: theme.colors.background === '#fff' ? '#000' : '#fff',
        text: theme.colors.text === '#000' ? '#fff' : '#000',
      },
    });
  };

  return <button onClick={toggleDarkMode}>Toggle Dark Mode</button>;
}
```

## useA2APlugins

Manage plugins dynamically.

```typescript
useA2APlugins(): {
  plugins: ChatPlugin[];
  addPlugin: (plugin: ChatPlugin) => void;
  removePlugin: (name: string) => void;
}
```

### Example

```tsx
function PluginManager() {
  const { plugins, addPlugin, removePlugin } = useA2APlugins();

  const addAnalytics = () => {
    addPlugin({
      name: 'analytics',
      onMessageSent: (msg) => {
        analytics.track('message_sent', { role: msg.role });
      },
    });
  };

  return (
    <div>
      <h3>Active Plugins: {plugins.length}</h3>
      <button onClick={addAnalytics}>Add Analytics</button>
      {plugins.map((plugin) => (
        <div key={plugin.name}>
          {plugin.name}
          <button onClick={() => removePlugin(plugin.name)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

## Custom Hooks Examples

### useMessageHistory

```typescript
function useMessageHistory() {
  const messages = useA2AStore((state) => state.messages);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content[0]?.content || '');
    setHistory(userMessages);
  }, [messages]);

  const navigateHistory = (direction: 'up' | 'down') => {
    if (direction === 'up' && historyIndex < history.length - 1) {
      setHistoryIndex((i) => i + 1);
    } else if (direction === 'down' && historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
    }
  };

  return {
    currentMessage: history[historyIndex] || '',
    navigateHistory,
    hasHistory: history.length > 0,
  };
}
```

### useAutoScroll

```typescript
function useAutoScroll(dependency: any[]) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, dependency);

  return scrollRef;
}

// Usage
function ChatMessages() {
  const { messages } = useA2A({ agentCard });
  const scrollRef = useAutoScroll([messages]);

  return (
    <div ref={scrollRef} className="messages">
      {messages.map((msg, i) => (
        <Message key={i} {...msg} />
      ))}
    </div>
  );
}
```

### useTypingIndicator

```typescript
function useTypingIndicator(isLoading: boolean, delay = 500) {
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowTyping(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowTyping(false);
    }
  }, [isLoading, delay]);

  return showTyping;
}
```

## TypeScript Support

All hooks are fully typed. Import types as needed:

```typescript
import type {
  UseA2AConfig,
  UseA2AReturn,
  Message,
  MessageContent,
  ChatPlugin,
  ChatTheme,
  A2AStore,
} from '@microsoft/a2achat-core/react';
```

## Performance Tips

1. **Use selectors** with `useA2AStore` to avoid unnecessary re-renders
2. **Memoize callbacks** passed to event handlers
3. **Virtualize long message lists** for better performance
4. **Debounce user input** for real-time features
5. **Lazy load plugins** that aren't immediately needed

## See Also

- [React Hook Usage Guide](../usage/react-hook)
- [React Components](./components)
- [Plugin System](../customization/plugins)
- [TypeScript Types](./types)
