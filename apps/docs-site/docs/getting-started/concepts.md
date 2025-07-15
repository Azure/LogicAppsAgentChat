---
sidebar_position: 3
---

# Core Concepts

Understanding the core concepts of A2A Chat will help you build better integrations. This guide covers the fundamental building blocks of the library.

## The A2A Protocol

A2A (Agent-to-Agent) is a protocol for communication between AI agents and applications. It defines:

- How agents describe their capabilities
- Message formats and streaming
- Authentication flows
- Error handling

### Key Principles

1. **Agent Cards** - Self-describing agent metadata
2. **Streaming First** - Real-time responses via Server-Sent Events (SSE)
3. **Task-Based** - Operations are tracked as tasks
4. **Protocol Agnostic** - Works over HTTP with JSON-RPC

## Agent Cards

An agent card is a JSON document that describes an agent's capabilities:

```typescript
interface AgentCard {
  // Base URL for agent endpoints
  url: string;

  // Human-readable name
  name: string;

  // Description of what the agent does
  description: string;

  // Agent capabilities
  capabilities: {
    streaming: boolean;
    authentication: boolean;
    fileUploads?: boolean;
    maxFileSize?: number;
  };

  // Optional metadata
  metadata?: Record<string, unknown>;
}
```

### Example Agent Card

```json
{
  "url": "https://api.example.com/agent",
  "name": "Customer Support Agent",
  "description": "AI assistant for customer inquiries",
  "capabilities": {
    "streaming": true,
    "authentication": true,
    "fileUploads": true,
    "maxFileSize": 10485760
  },
  "metadata": {
    "version": "1.0.0",
    "languages": ["en", "es", "fr"]
  }
}
```

## Messages

Messages are the core communication unit:

```typescript
interface Message {
  // Who sent the message
  role: 'user' | 'assistant' | 'system';

  // Message content (text, files, or structured data)
  content: MessageContent[];

  // Optional metadata
  metadata?: Record<string, unknown>;
}

type MessageContent =
  | { type: 'text'; content: string }
  | { type: 'file'; filename: string; mimeType: string; data: string }
  | { type: 'structured'; schema: object; data: unknown };
```

### Message Examples

```typescript
// Simple text message
const textMessage: Message = {
  role: 'user',
  content: [{ type: 'text', content: 'What is the weather today?' }],
};

// Message with file
const fileMessage: Message = {
  role: 'user',
  content: [
    { type: 'text', content: 'Please analyze this data' },
    {
      type: 'file',
      filename: 'sales.csv',
      mimeType: 'text/csv',
      data: 'base64-encoded-content',
    },
  ],
};

// Structured data message
const structuredMessage: Message = {
  role: 'user',
  content: [
    {
      type: 'structured',
      schema: { type: 'object' },
      data: { command: 'search', query: 'documentation' },
    },
  ],
};
```

## Tasks

Every interaction creates a task that tracks the conversation state:

```typescript
interface Task {
  // Unique task identifier
  id: string;

  // Current state
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  // Conversation messages
  messages: Message[];

  // Optional artifacts (generated files, etc.)
  artifacts?: Artifact[];

  // Timestamps
  createdAt: string;
  updatedAt?: string;

  // Context for maintaining conversation state
  contextId?: string;
}
```

### Task Lifecycle

1. **Created** - Task is initialized
2. **Running** - Agent is processing
3. **Streaming** - Updates arrive via SSE
4. **Completed** - Task finished successfully
5. **Failed** - An error occurred

## Streaming

A2A Chat uses Server-Sent Events (SSE) for real-time streaming:

```typescript
// Streaming responses
for await (const task of client.message.stream({ message })) {
  // Each iteration provides an updated task
  console.log('Current state:', task.state);
  console.log('Messages so far:', task.messages.length);

  // Access the latest message
  const latestMessage = task.messages[task.messages.length - 1];
  if (latestMessage?.role === 'assistant') {
    console.log('Assistant says:', latestMessage.content);
  }
}
```

### Streaming Benefits

- Real-time feedback
- Progressive rendering
- Better UX for long responses
- Ability to cancel mid-stream

## Authentication

A2A supports dynamic authentication flows:

```typescript
const client = new A2AClient({
  agentCard,
  onAuthRequired: async (event) => {
    // Handle authentication request
    console.log('Auth needed for:', event.serviceName);
    console.log('Consent URL:', event.authParts[0].consentLink);

    // Open consent flow
    window.open(event.authParts[0].consentLink);

    // Signal completion
    await client.sendAuthenticationCompleted(event.contextId);
  },
});
```

### Authentication Flow

1. Agent requests authentication
2. Client receives `auth-required` event
3. User completes consent flow
4. Client sends completion signal
5. Agent continues processing

## Error Handling

A2A Chat provides structured error handling:

```typescript
try {
  await client.message.send({ message });
} catch (error) {
  if (error instanceof A2AError) {
    switch (error.code) {
      case 'INVALID_MESSAGE':
        console.error('Message format error:', error.details);
        break;
      case 'RATE_LIMITED':
        console.error('Too many requests');
        break;
      case 'AUTH_REQUIRED':
        console.error('Authentication needed');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Context Management

Maintain conversation context across messages:

```typescript
// First message creates context
const response1 = await client.message.send({
  message: { role: 'user', content: 'My name is Alice' },
});

// Subsequent messages use the same context
const response2 = await client.message.send({
  message: { role: 'user', content: 'What is my name?' },
  context: { contextId: response1.contextId },
});
// Agent remembers: "Your name is Alice"
```

## Plugins

Extend functionality with plugins:

```typescript
const analyticsPlugin = {
  name: 'analytics',

  onMessageSent: (message) => {
    analytics.track('message_sent', {
      role: message.role,
      length: message.content.length
    });
  },

  onMessageReceived: (message) => {
    analytics.track('message_received', {
      role: message.role
    });
  }
};

// Use with React
<ChatWidget
  agentCard={agentCard}
  plugins={[analyticsPlugin]}
/>
```

## Best Practices

### 1. Always Handle Errors

```typescript
const { messages, error } = useA2A({ agentCard });
if (error) return <ErrorDisplay error={error} />;
```

### 2. Show Loading States

```typescript
const { isLoading } = useA2A({ agentCard });
if (isLoading) return <LoadingSpinner />;
```

### 3. Validate Agent Cards

```typescript
import { validateAgentCard } from '@microsoft/a2achat-core';

if (!validateAgentCard(agentCard)) {
  throw new Error('Invalid agent card');
}
```

### 4. Use TypeScript

```typescript
import type { Message, Task } from '@microsoft/a2achat-core';
```

### 5. Handle Streaming Properly

```typescript
// Always use try-catch with streaming
try {
  for await (const task of stream) {
    // Handle updates
  }
} catch (error) {
  // Handle streaming errors
}
```

## Next Steps

Now that you understand the core concepts:

1. [Use the Client Directly](../usage/client-direct) - Library-agnostic integration
2. [Try React Hooks](../usage/react-hook) - Build custom UIs
3. [Explore Components](../usage/react-components) - Use pre-built UI
4. [Learn Authentication](../advanced/authentication) - Implement auth flows
