---
sidebar_position: 4
---

# TypeScript Types

Complete reference for all TypeScript types and interfaces in A2A Chat.

## Core Types

### Message

The fundamental message type used throughout the library.

```typescript
interface Message {
  // Unique identifier
  id?: string;

  // Message sender
  role: 'user' | 'assistant' | 'system';

  // Message content parts
  content: MessageContent[];

  // Optional metadata
  metadata?: Record<string, unknown>;

  // Timestamps
  timestamp?: Date;

  // UI-specific properties
  status?: 'sending' | 'sent' | 'error';
  sender?: 'user' | 'assistant';
  attachments?: Attachment[];
}
```

### MessageContent

Content types that can be included in messages.

```typescript
type MessageContent = TextContent | FileContent | StructuredContent;

interface TextContent {
  type: 'text';
  content: string;
}

interface FileContent {
  type: 'file';
  filename: string;
  mimeType: string;
  data: string; // Base64 encoded
}

interface StructuredContent {
  type: 'structured';
  schema: object; // JSON Schema
  data: unknown;
}
```

### Task

Represents an A2A protocol task.

```typescript
interface Task {
  // Unique task identifier
  id: string;

  // Current state
  state: TaskState;

  // Conversation messages
  messages: Message[];

  // Generated artifacts
  artifacts?: Artifact[];

  // Timestamps
  createdAt: string;
  updatedAt?: string;

  // Context for conversation continuity
  contextId?: string;
}

type TaskState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

### AgentCard

Agent configuration and capabilities.

```typescript
interface AgentCard {
  // Base URL for agent endpoints
  url: string;

  // Display name
  name: string;

  // Description of agent's purpose
  description: string;

  // Agent capabilities
  capabilities: AgentCapabilities;

  // Optional metadata
  metadata?: Record<string, unknown>;
}

interface AgentCapabilities {
  // Core capabilities
  streaming: boolean;
  authentication: boolean;

  // File handling
  fileUploads?: boolean;
  maxFileSize?: number;
  supportedFileTypes?: string[];

  // Advanced features
  multiModal?: boolean;
  functionCalling?: boolean;
  contextWindows?: number;
}
```

### Artifact

Generated content or files from the agent.

```typescript
interface Artifact {
  // Unique identifier
  id: string;

  // Artifact type (e.g., 'code', 'document', 'image')
  type: string;

  // Display title
  title: string;

  // Artifact content
  content: string;

  // Additional metadata
  metadata?: {
    language?: string;
    mimeType?: string;
    size?: number;
    [key: string]: unknown;
  };
}
```

## Request/Response Types

### MessageSendRequest

Request structure for sending messages.

```typescript
interface MessageSendRequest {
  // The message to send
  message: Message;

  // Optional context
  context?: MessageContext;
}

interface MessageContext {
  // Conversation context ID
  contextId?: string;

  // Accepted output modes
  acceptedOutputModes?: string[];

  // Additional context data
  [key: string]: unknown;
}
```

## Authentication Types

### AuthConfig

Authentication configuration options.

```typescript
type AuthConfig = NoAuthConfig | BearerAuthConfig | OAuth2AuthConfig | ApiKeyAuthConfig;

interface NoAuthConfig {
  type: 'none';
}

interface BearerAuthConfig {
  type: 'bearer';
  token: string;
}

interface OAuth2AuthConfig {
  type: 'oauth2';
  accessToken: string;
  tokenType?: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface ApiKeyAuthConfig {
  type: 'api-key';
  key: string;
  header: string; // e.g., 'X-API-Key'
}
```

### Authentication Events

```typescript
interface AuthRequiredEvent {
  // Task ID requiring authentication
  taskId: string;

  // Context ID for resuming
  contextId: string;

  // Authentication requirements
  authParts: AuthRequiredPart[];

  // Message type identifier
  messageType: string;
}

interface AuthRequiredPart {
  // OAuth consent URL
  consentLink: string;

  // Current auth status
  status: string;

  // Service requiring auth
  serviceName: string;

  // Optional service icon
  serviceIcon?: string;

  // Description of required permissions
  description?: string;
}

type AuthRequiredHandler = (event: AuthRequiredEvent) => Promise<void>;
```

## UI Types

### ChatTheme

Theme configuration for chat components.

```typescript
interface ChatTheme {
  // Color palette
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
    warning?: string;
    info?: string;
  };

  // Border radius values
  borderRadius?: {
    small: string;
    medium: string;
    large: string;
  };

  // Spacing scale
  spacing?: {
    small: string;
    medium: string;
    large: string;
  };

  // Typography settings
  typography?: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
    };
    fontWeight?: {
      normal: number;
      medium: number;
      bold: number;
    };
    lineHeight?: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };

  // Shadow definitions
  shadows?: {
    small: string;
    medium: string;
    large: string;
  };

  // Animation durations
  transitions?: {
    fast: string;
    normal: string;
    slow: string;
  };
}
```

### Attachment

File attachment type for messages.

```typescript
interface Attachment {
  // Unique identifier
  id: string;

  // File name
  name: string;

  // File size in bytes
  size: number;

  // MIME type
  type: string;

  // Upload status
  status: 'uploading' | 'uploaded' | 'error';

  // Download URL (if uploaded)
  url?: string;

  // Error message (if failed)
  error?: string;

  // Upload progress (0-100)
  progress?: number;
}
```

## Plugin Types

### ChatPlugin

Plugin interface for extending functionality.

```typescript
interface ChatPlugin {
  // Unique plugin name
  name: string;

  // Plugin version
  version?: string;

  // Lifecycle hooks
  onInit?: (context: PluginContext) => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;

  // Message events
  onMessageSent?: (message: Message) => void | Promise<void>;
  onMessageReceived?: (message: Message) => void | Promise<void>;
  onMessageError?: (error: Error, message: Message) => void | Promise<void>;

  // Session events
  onSessionStart?: (sessionId: string) => void | Promise<void>;
  onSessionEnd?: (sessionId: string) => void | Promise<void>;

  // UI events
  onRender?: (element: HTMLElement) => void | Promise<void>;

  // Message transformation
  transformOutgoing?: (message: Message) => Message | Promise<Message>;
  transformIncoming?: (message: Message) => Message | Promise<Message>;
}

interface PluginContext {
  // Current configuration
  config: UseA2AConfig;

  // Store access
  store: A2AStore;

  // Client instance
  client: A2AClient | null;

  // UI helpers
  ui: {
    showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
    showModal: (content: React.ReactNode) => void;
  };
}
```

## Error Types

### A2AError

Custom error types for the library.

```typescript
class A2AError extends Error {
  name: 'A2AError';
  code: ErrorCode;
  details?: unknown;
}

type ErrorCode =
  | 'NETWORK_ERROR'
  | 'INVALID_MESSAGE'
  | 'INVALID_AGENT_CARD'
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';
```

## Configuration Types

### A2AClientConfig

Configuration for creating an A2A client.

```typescript
interface A2AClientConfig {
  // Agent configuration
  agentCard: string | AgentCard;

  // Authentication
  auth?: AuthConfig;

  // HTTP options
  httpOptions?: HttpClientOptions;

  // Event handlers
  onAuthRequired?: AuthRequiredHandler;
}

interface HttpClientOptions {
  // Request timeout in milliseconds
  timeout?: number;

  // Additional headers
  headers?: Record<string, string>;

  // Retry configuration
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: Error) => boolean;
  };

  // Request interceptors
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: (response: Response) => Response | Promise<Response>;
}
```

### UseA2AConfig

Configuration for the useA2A React hook.

```typescript
interface UseA2AConfig {
  // Required: Agent configuration
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

  // Advanced options
  enableAnalytics?: boolean;
  debugMode?: boolean;
}
```

## Utility Types

### DeepPartial

Make all properties optional recursively.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### ValueOf

Get the type of object values.

```typescript
type ValueOf<T> = T[keyof T];
```

### Branded Types

For type-safe IDs.

```typescript
type UserId = string & { readonly brand: unique symbol };
type SessionId = string & { readonly brand: unique symbol };
type TaskId = string & { readonly brand: unique symbol };
type MessageId = string & { readonly brand: unique symbol };
```

## Type Guards

Useful type guard functions.

```typescript
// Check if value is a Message
function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'role' in value &&
    'content' in value &&
    Array.isArray((value as any).content)
  );
}

// Check if value is an AgentCard
function isAgentCard(value: unknown): value is AgentCard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    'name' in value &&
    'capabilities' in value
  );
}

// Check if error is A2AError
function isA2AError(error: unknown): error is A2AError {
  return error instanceof Error && error.name === 'A2AError' && 'code' in error;
}
```

## Importing Types

All types can be imported from the main package:

```typescript
import type {
  Message,
  MessageContent,
  Task,
  AgentCard,
  ChatTheme,
  ChatPlugin,
  // ... etc
} from '@microsoft/a2achat-core';

// React-specific types
import type {
  UseA2AConfig,
  UseA2AReturn,
  ChatWidgetProps,
  // ... etc
} from '@microsoft/a2achat-core/react';
```

## See Also

- [TypeScript Configuration](../getting-started/installation#typescript-configuration)
- [API Reference](./client)
- [Examples](../examples/basic-chat)
