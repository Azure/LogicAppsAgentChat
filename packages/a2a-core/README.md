# @microsoft/a2achat-core

Framework-agnostic TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents.

## Features

- 🚀 **Small bundle size**: ~45KB with React as peer dependency
- 📦 **Multiple entry points**: Core APIs, React components, React hooks, and event-driven interface
- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- ⚛️ **React 19+ compatible**: Works seamlessly with modern React applications
- 🤖 **A2A Protocol**: Built on the official A2A protocol specification
- 🔐 **Authentication**: Bearer, API Key, OAuth2, Cookie, and custom handlers
- 🌊 **Real-time streaming**: Server-Sent Events (SSE) for real-time agent responses
- 💾 **Chat history**: Client-side (IndexedDB) or server-side storage
- 💬 **Multi-session**: Multiple concurrent conversations with sidebar UI
- 🔍 **Agent discovery**: Automatic agent card resolution
- 🔌 **Plugin system**: Extensible with custom analytics, logging, and more
- ✅ **TypeScript**: Full type safety with Zod schema validation

## Installation

```bash
npm install @microsoft/a2achat-core
# or
pnpm add @microsoft/a2achat-core
# or
yarn add @microsoft/a2achat-core
```

**Peer Dependencies:**

- `react` >= 19.2.0 (only required if using `/react` entry point)

## Package Exports

This package provides multiple entry points for different use cases:

### Main Entry (`@microsoft/a2achat-core`)

Framework-agnostic core APIs:

- `A2AClient` - Main client for agent communication
- `HttpClient`, `SSEClient` - HTTP and SSE communication
- `SessionManager` - Session management
- `AgentDiscovery` - Agent card resolution
- `PluginManager` - Plugin system
- Types, schemas, and utilities

### React Entry (`@microsoft/a2achat-core/react`)

React components and hooks:

- `ChatWidget`, `ChatWindow` - Full-featured chat components
- `useA2A` - Main React hook for chat functionality
- `useChatWidget`, `useTheme` - Additional hooks
- `useChatStore` - Zustand store for state management
- Individual components: `MessageList`, `MessageInput`, `Message`, etc.
- Theming utilities and storage helpers

**Styles:** `@microsoft/a2achat-core/react/styles.css`

### Chat Entry (`@microsoft/a2achat-core/chat`)

Event-driven chat interface:

- `ChatInterface` - Event-emitting chat abstraction
- Types: `ChatMessage`, `ChatRole`, `ChatOptions`, etc.

## Quick Start

### 1. React Components

Full-featured UI with built-in state management:

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

export default function App() {
  return (
    <ChatWidget
      agentCard="https://api.example.com"
      auth={{ type: 'bearer', token: 'your-token' }}
      welcomeMessage="Hello! How can I help you today?"
      allowFileUpload={true}
      theme={{
        colors: {
          primary: '#0066cc',
          primaryText: '#ffffff',
          background: '#f5f5f5',
        },
        branding: {
          logoUrl: 'https://example.com/logo.png',
          logoSize: 'medium',
          logoPosition: 'header',
        },
      }}
      onMessage={(message) => console.log('New message:', message)}
      onConnectionChange={(connected) => console.log('Connected:', connected)}
    />
  );
}
```

### 2. React Hooks

For custom UI implementations:

```tsx
import { useA2A } from '@microsoft/a2achat-core/react';

function CustomChat() {
  const { messages, isLoading, isConnected, sendMessage, clearMessages, authState } = useA2A({
    agentCard: 'https://api.example.com',
    auth: { type: 'bearer', token: 'token' },
  });

  return (
    <div>
      <div>{isConnected ? 'Connected' : 'Disconnected'}</div>

      {authState.isRequired && <div>Authentication required...</div>}

      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {isLoading && <div>Loading...</div>}

      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage((e.target as HTMLInputElement).value);
          }
        }}
      />
      <button onClick={clearMessages}>Clear</button>
    </div>
  );
}
```

### 3. Core Client API

Framework-agnostic for any JavaScript environment:

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

// Create client
const client = new A2AClient({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
});

// Send a message
const task = await client.message.send({
  message: {
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello, agent!' }],
  },
});

// Wait for completion
const completedTask = await client.task.waitForCompletion(task.id);
console.log('Result:', completedTask.result);

// Stream responses
const stream = await client.message.stream({
  message: {
    role: 'user',
    parts: [{ kind: 'text', text: 'Tell me a story' }],
  },
});

for await (const chunk of stream) {
  if (chunk.kind === 'text') {
    console.log('Text:', chunk.text);
  } else if (chunk.kind === 'data') {
    console.log('Data:', chunk.data);
  }
}
```

### 4. Event-Driven Interface

For event-based architectures:

```typescript
import { ChatInterface } from '@microsoft/a2achat-core/chat';

const chat = new ChatInterface({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
});

// Subscribe to events
chat.on('message-sent', (msg) => console.log('Sent:', msg));
chat.on('message-received', (msg) => console.log('Received:', msg));
chat.on('error', (err) => console.error('Error:', err));

// Send a message
await chat.sendMessage('Hello, agent!');

// Export conversation
const exportData = await chat.exportConversation();
console.log('Conversation:', exportData);
```

## API Reference

### Core APIs

#### A2AClient

Main client for communicating with A2A agents:

```typescript
class A2AClient {
  constructor(config: A2AClientConfig);

  // Agent information
  getAgentCard(): AgentCard;
  getCapabilities(): AgentCapabilities;
  getServiceEndpoint(): string;
  hasCapability(capabilityName: keyof AgentCapabilities): boolean;

  // Message operations
  message: {
    send(request: MessageSendRequest): Promise<Task>;
    stream(request: MessageStreamRequest): Promise<AsyncIterable<StreamMessage>>;
  };

  // Task operations
  task: {
    get(taskId: string): Promise<Task>;
    cancel(taskId: string): Promise<void>;
    waitForCompletion(taskId: string, options?: WaitForCompletionOptions): Promise<Task>;
  };
}

interface A2AClientConfig {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  httpOptions?: HttpClientOptions;
  onAuthRequired?: (event: AuthRequiredEvent) => void;
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  onTokenRefreshRequired?: () => void | Promise<void>;
  apiKey?: string;
  oboUserToken?: string;
}
```

#### Authentication

```typescript
type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'oauth2'; accessToken: string; tokenType?: string }
  | { type: 'api-key'; key: string; header: string }
  | { type: 'cookie' }
  | { type: 'custom'; handler: (request: Request) => Promise<Request> | Request }
  | { type: 'none' };
```

#### Agent Discovery

```typescript
class AgentDiscovery {
  static async resolve(agentUrl: string): Promise<AgentCard>;
}

// Automatically resolves agent cards from URLs
const agentCard = await AgentDiscovery.resolve('https://api.example.com');
```

#### Session Management

```typescript
class SessionManager extends EventEmitter<SessionEventMap> {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;
}

// Events
sessionManager.on('session:set', (key, value) => {});
sessionManager.on('session:remove', (key) => {});
sessionManager.on('session:clear', () => {});
```

### React Components

#### ChatWidget / ChatWindow

Full-featured chat interface with built-in UI:

```typescript
interface ChatWidgetProps {
  // Agent configuration
  agentCard: string | AgentCard; // Agent URL or object (required)
  auth?: AuthConfig; // Authentication
  agentUrl?: string; // Override agent endpoint

  // UI content
  welcomeMessage?: string;
  placeholder?: string;
  userName?: string;

  // Features
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  theme?: Partial<ChatTheme>;

  // Session management
  sessionKey?: string;
  sessionId?: string;
  sessionName?: string;
  storageConfig?: StorageConfig;
  initialContextId?: string;

  // User data
  userId?: string;
  metadata?: Record<string, any>;

  // Callbacks
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  onToggleSidebar?: () => void;
  onContextIdChange?: (contextId: string) => void;
  onRenameSession?: (newName: string) => void | Promise<void>;
  onUnauthorized?: (event: UnauthorizedEvent) => void | Promise<void>;
}
```

#### Individual Components

```typescript
// Message list display
<MessageList messages={messages} isLoading={isLoading} />

// Message input
<MessageInput
  onSend={sendMessage}
  placeholder="Type a message..."
  disabled={isLoading}
  allowFileUpload={true}
/>

// Individual message
<MessageComponent message={message} />

// Typing indicator
<TypingIndicator visible={isTyping} />

// Company logo
<CompanyLogo
  logoUrl="https://example.com/logo.png"
  logoSize="medium"
  position="header"
/>

// File upload
<FileUpload
  onFileSelect={handleFile}
  maxSize={10 * 1024 * 1024}
  allowedTypes={['image/*', 'application/pdf']}
/>

// Session list (multi-session)
<SessionList
  sessions={sessions}
  activeSessionId={activeId}
  onSelectSession={handleSelect}
  onRenameSession={handleRename}
  onDeleteSession={handleDelete}
/>

// Authentication message
<AuthenticationMessage authEvent={authEvent} />
```

### React Hooks

#### useA2A

Main hook for chat functionality:

```typescript
interface UseA2AOptions {
  agentCard?: string | AgentCard;
  auth?: AuthConfig;
  storageConfig?: StorageConfig;
  initialContextId?: string;
  autoConnect?: boolean;
}

interface UseA2AReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  agentCard: AgentCard | undefined;
  error: Error | undefined;
  contextId: string | undefined;
  authState: {
    isRequired: boolean;
    authEvent?: AuthRequiredEvent;
  };

  // Actions
  connect: (agentCard: AgentCard) => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  sendAuthenticationCompleted: () => Promise<void>;
}

function useA2A(options: UseA2AOptions = {}): UseA2AReturn;
```

#### useChatWidget

Widget-specific behavior:

```typescript
function useChatWidget(options: ChatWidgetOptions) {
  // Returns chat state and handlers specific to widget UI
}
```

#### useTheme

Theme management:

```typescript
function useTheme() {
  return {
    theme: currentTheme,
    setTheme: (theme: Partial<ChatTheme>) => void,
    isDarkMode: boolean,
    toggleDarkMode: () => void,
  };
}
```

#### useChatStore

Direct access to Zustand store:

```typescript
function useChatStore(): ChatStore & ChatActions;
```

### Chat History Storage

#### StorageConfig

```typescript
type StorageConfig =
  | { type: 'indexeddb' } // Client-side IndexedDB
  | {
      type: 'server'; // Server-side storage
      agentUrl: string;
      getAuthToken?: () => string | Promise<string>;
    };
```

#### ChatHistoryStorage Interface

```typescript
interface ChatHistoryStorage {
  saveMessage(message: Message, options?: SaveMessageOptions): Promise<void>;
  getMessages(sessionId: string): Promise<Message[]>;
  deleteMessage(messageId: string): Promise<void>;
  listSessions(options?: ListSessionsOptions): Promise<ChatSession[]>;
  deleteSession(sessionId: string): Promise<void>;
  exportSession(sessionId: string): Promise<ExportData>;
  importSession(sessionId: string, data: ExportData): Promise<void>;
}
```

#### Usage

```typescript
import { createHistoryStorage, ServerHistoryStorage } from '@microsoft/a2achat-core/react';

// Client-side (IndexedDB)
const clientStorage = createHistoryStorage({ type: 'indexeddb' });

// Server-side
const serverStorage = new ServerHistoryStorage({
  agentUrl: 'https://api.example.com',
  getAuthToken: () => localStorage.getItem('token') || '',
});

// Use with ChatWidget
<ChatWidget
  agentCard="https://api.example.com"
  storageConfig={{
    type: 'server',
    agentUrl: 'https://api.example.com',
  }}
  initialContextId="conv-123"
/>
```

### Theming

#### ChatTheme Interface

```typescript
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
    // Dark mode variants
    backgroundDark?: string;
    surfaceDark?: string;
    textDark?: string;
    textSecondaryDark?: string;
    borderDark?: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
    };
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  branding?: {
    logoUrl?: string;
    logoSize?: 'small' | 'medium' | 'large';
    logoPosition?: 'header' | 'footer';
    name?: string;
  };
}
```

#### Theme Utilities

```typescript
import {
  createCustomTheme,
  defaultLightTheme,
  defaultDarkTheme,
  ChatThemeProvider,
} from '@microsoft/a2achat-core/react';

// Create custom theme
const myTheme = createCustomTheme({
  primaryColor: '#0066cc',
  backgroundColor: '#ffffff',
});

// Use theme provider
<ChatThemeProvider theme={myTheme}>
  <ChatWidget agentCard="https://api.example.com" />
</ChatThemeProvider>
```

### Plugin System

#### Plugin Interface

```typescript
interface Plugin {
  name: string;
  version: string;
  description?: string;
  install: (context: PluginContext) => void;
  uninstall?: () => void;
  hooks?: PluginHooks;
}

interface PluginHooks {
  beforeRequest?: (request: any) => any | Promise<any>;
  afterResponse?: (response: any) => any | Promise<any>;
  beforeMessageSend?: (message: Message) => Message | Promise<Message>;
  afterMessageReceive?: (message: Message) => Message | Promise<Message>;
  onTaskCreated?: (task: Task) => void | Promise<void>;
  onTaskCompleted?: (task: Task) => void | Promise<void>;
  onTaskFailed?: (task: Task) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
}
```

#### PluginManager

```typescript
class PluginManager {
  constructor(client: A2AClient);

  register(plugin: Plugin): void;
  unregister(pluginName: string): void;
  getPlugin(pluginName: string): Plugin | undefined;
  getAllPlugins(): Plugin[];
}
```

#### Built-in Plugins

```typescript
// Analytics plugin
import { AnalyticsPlugin } from '@microsoft/a2achat-core';

const analyticsPlugin = new AnalyticsPlugin({
  trackEvent: (name, data) => {
    // Send to your analytics service
    analytics.track(name, data);
  },
});

// Logger plugin
import { LoggerPlugin } from '@microsoft/a2achat-core';

const loggerPlugin = new LoggerPlugin({
  level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  logger: console,
});

// Register plugins
const client = new A2AClient({
  /* config */
});
const pluginManager = new PluginManager(client);
pluginManager.register(analyticsPlugin);
pluginManager.register(loggerPlugin);
```

### Utilities

#### Message Utilities

```typescript
import { generateMessageId, createMessage, formatCodeContent } from '@microsoft/a2achat-core/react';

// Generate unique message ID
const id = generateMessageId();

// Create message object
const message = createMessage({
  content: 'Hello',
  sender: 'user',
});

// Format code with syntax highlighting
const formatted = formatCodeContent(code, 'typescript');
```

#### File Utilities

```typescript
import { downloadFile, getMimeType } from '@microsoft/a2achat-core/react';

// Download file
downloadFile(blob, 'filename.txt');

// Get MIME type from file extension
const mimeType = getMimeType('.pdf'); // 'application/pdf'
```

#### Popup Window

```typescript
import { openPopupWindow } from '@microsoft/a2achat-core/react';

// Open popup for OAuth or consent
const popup = openPopupWindow({
  url: 'https://auth.example.com',
  title: 'Authentication',
  width: 600,
  height: 700,
});
```

## TypeScript Support

Full TypeScript support with comprehensive types and schemas:

```typescript
import type {
  // Core types
  AgentCard,
  AgentCapabilities,
  Task,
  Message,
  Part,
  AuthConfig,
  AuthRequiredEvent,

  // React types
  ChatMessage,
  MessageRole,
  MessageStatus,
  ChatTheme,
  StorageConfig,
  ChatSession,

  // Plugin types
  Plugin,
  PluginHooks,
  PluginContext,

  // Storage types
  ChatHistoryStorage,
  SaveMessageOptions,
  ListSessionsOptions,
} from '@microsoft/a2achat-core';
```

All types are derived from Zod schemas for runtime validation:

```typescript
import { MessageSchema, AgentCardSchema } from '@microsoft/a2achat-core';

// Validate at runtime
const result = MessageSchema.safeParse(data);
if (result.success) {
  const message = result.data; // Fully typed
}
```

## Examples

See the [main repository README](../../README.md) for comprehensive examples including:

- Server-side history with multi-session
- Custom UI with useA2A hook
- Handling OBO authentication
- Low-level client with streaming
- Plugin usage

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

Requires:

- ES2020+
- Server-Sent Events (SSE)
- IndexedDB (for client-side storage)

## License

MIT - see [LICENSE.md](../../LICENSE.md)
