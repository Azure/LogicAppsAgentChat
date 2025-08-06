---
sidebar_position: 1
---

# A2AClient API

Complete API reference for the A2AClient class.

## Constructor

```typescript
new A2AClient(config: A2AClientConfig)
```

### A2AClientConfig

```typescript
interface A2AClientConfig {
  // Required: Agent card URL or object
  agentCard: string | AgentCard;

  // Optional: Authentication configuration
  auth?: AuthConfig;

  // Optional: HTTP client options
  httpOptions?: HttpClientOptions;

  // Optional: Authentication required handler
  onAuthRequired?: AuthRequiredHandler;
}
```

### Example

```typescript
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent-card.json',
  auth: {
    type: 'bearer',
    token: 'your-api-token',
  },
  onAuthRequired: async (event) => {
    // Handle authentication
  },
});
```

## Methods

### message.send()

Send a message and wait for the complete response.

```typescript
message.send(request: MessageSendRequest): Promise<Task>
```

#### Parameters

- `request: MessageSendRequest` - The message request object

```typescript
interface MessageSendRequest {
  message: Message;
  context?: MessageContext;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent[];
  metadata?: Record<string, unknown>;
}

type MessageContent =
  | { type: 'text'; content: string }
  | { type: 'file'; filename: string; mimeType: string; data: string }
  | { type: 'structured'; schema: object; data: unknown };
```

#### Returns

`Promise<Task>` - The completed task with all messages

#### Example

```typescript
const task = await client.message.send({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'Hello!' }],
  },
});

console.log('Response:', task.messages);
```

### message.stream()

Send a message and stream the response in real-time.

```typescript
message.stream(request: MessageSendRequest): AsyncIterable<Task>
```

#### Parameters

- `request: MessageSendRequest` - The message request object

#### Returns

`AsyncIterable<Task>` - An async iterable that yields task updates

#### Example

```typescript
for await (const task of client.message.stream({ message })) {
  console.log('State:', task.state);
  console.log('Messages:', task.messages.length);

  // Get latest assistant message
  const lastMessage = task.messages[task.messages.length - 1];
  if (lastMessage?.role === 'assistant') {
    console.log('Assistant:', lastMessage.content);
  }
}
```

### sendAuthenticationCompleted()

Notify the agent that authentication has been completed.

```typescript
sendAuthenticationCompleted(contextId: string): Promise<void>
```

#### Parameters

- `contextId: string` - The context ID from the auth required event

#### Example

```typescript
client.onAuthRequired = async (event) => {
  // Open auth window
  const authWindow = window.open(event.authParts[0].consentLink);

  // Wait for completion
  await waitForAuthWindow(authWindow);

  // Notify agent
  await client.sendAuthenticationCompleted(event.contextId);
};
```

### task.get()

Get details of a specific task.

```typescript
task.get(taskId: string): Promise<Task>
```

#### Parameters

- `taskId: string` - The task ID to retrieve

#### Returns

`Promise<Task>` - The task details

### task.cancel()

Cancel a running task.

```typescript
task.cancel(taskId: string, reason?: string): Promise<void>
```

#### Parameters

- `taskId: string` - The task ID to cancel
- `reason?: string` - Optional cancellation reason

### task.waitForCompletion()

Wait for a task to complete with polling.

```typescript
task.waitForCompletion(
  taskId: string,
  options?: WaitForCompletionOptions
): Promise<Task>
```

#### Parameters

- `taskId: string` - The task ID to wait for
- `options?: WaitForCompletionOptions` - Polling options

```typescript
interface WaitForCompletionOptions {
  pollingInterval?: number; // Default: 1000ms
  timeout?: number; // Default: 300000ms (5 minutes)
}
```

### Agent Card Methods

#### getAgentCard()

Get the agent card configuration.

```typescript
getAgentCard(): AgentCard
```

#### getCapabilities()

Get agent capabilities.

```typescript
getCapabilities(): AgentCapabilities
```

#### getServiceEndpoint()

Get the agent's service endpoint URL.

```typescript
getServiceEndpoint(): string
```

#### hasCapability()

Check if agent has a specific capability.

```typescript
hasCapability(capabilityName: keyof AgentCapabilities): boolean
```

#### Example

```typescript
if (client.hasCapability('fileUploads')) {
  // Enable file upload UI
}

const endpoint = client.getServiceEndpoint();
console.log('Agent endpoint:', endpoint);
```

## Types

### Task

```typescript
interface Task {
  id: string;
  state: TaskState;
  messages: Message[];
  artifacts?: Artifact[];
  createdAt: string;
  updatedAt?: string;
  contextId?: string;
}

type TaskState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

### AgentCard

```typescript
interface AgentCard {
  url: string;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  metadata?: Record<string, unknown>;
}

interface AgentCapabilities {
  streaming: boolean;
  authentication: boolean;
  fileUploads?: boolean;
  maxFileSize?: number;
  supportedFileTypes?: string[];
}
```

### AuthConfig

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | {
      type: 'oauth2';
      accessToken: string;
      tokenType?: string;
    }
  | {
      type: 'api-key';
      key: string;
      header: string;
    };
```

### MessageContext

```typescript
interface MessageContext {
  contextId?: string;
  acceptedOutputModes?: string[];
  [key: string]: unknown;
}
```

### Artifact

```typescript
interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}
```

### AuthRequiredHandler

```typescript
type AuthRequiredHandler = (event: AuthRequiredEvent) => Promise<void>;

interface AuthRequiredEvent {
  taskId: string;
  contextId: string;
  authParts: AuthRequiredPart[];
  messageType: string;
}

interface AuthRequiredPart {
  consentLink: string;
  status: string;
  serviceName: string;
  serviceIcon?: string;
  description?: string;
}
```

## Error Handling

The client throws typed errors that can be caught and handled:

```typescript
try {
  await client.message.send({ message });
} catch (error) {
  if (error.name === 'A2AError') {
    switch (error.code) {
      case 'NETWORK_ERROR':
        // Handle network error
        break;
      case 'INVALID_MESSAGE':
        // Handle validation error
        break;
      case 'AUTH_REQUIRED':
        // Handle auth requirement
        break;
      case 'RATE_LIMITED':
        // Handle rate limiting
        break;
    }
  }
}
```

## Advanced Options

### HTTP Client Options

```typescript
interface HttpClientOptions {
  timeout?: number; // Request timeout in ms
  headers?: Record<string, string>; // Additional headers
  retryConfig?: {
    maxRetries?: number; // Max retry attempts
    retryDelay?: number; // Delay between retries
  };
}
```

### Example with Advanced Options

```typescript
const client = new A2AClient({
  agentCard,
  httpOptions: {
    timeout: 30000,
    headers: {
      'X-Custom-Header': 'value',
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
    },
  },
});
```

## Best Practices

1. **Reuse client instances** - Create once and reuse
2. **Handle errors gracefully** - Always wrap in try-catch
3. **Use streaming for real-time UX** - Better user experience
4. **Implement retry logic** - For network reliability
5. **Clean up resources** - Cancel requests when needed

## See Also

- [Core Concepts](../getting-started/concepts)
- [Using the Client](../usage/client-direct)
- [Authentication Guide](../advanced/authentication)
- [Error Handling](../advanced/error-handling)
