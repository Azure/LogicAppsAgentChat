---
sidebar_position: 1
---

# Using A2AClient Directly

The A2AClient is the core of A2A Chat and can be used in any JavaScript or TypeScript environment. This guide covers everything you need to know about using the client directly.

## Basic Setup

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

// Initialize with an agent card URL
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
});

// Or with an agent card object
const client = new A2AClient({
  agentCard: {
    url: 'https://api.example.com',
    name: 'My Agent',
    description: 'A helpful assistant',
    capabilities: {
      streaming: true,
      authentication: false,
    },
  },
});
```

## Sending Messages

### Simple Message

```typescript
const response = await client.message.send({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'Hello, how are you?' }],
  },
});

console.log('Task ID:', response.id);
console.log('State:', response.state);
console.log('Messages:', response.messages);
```

### Message with Context

```typescript
// First message
const firstResponse = await client.message.send({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'My name is Alice' }],
  },
});

// Follow-up message with context
const followUpResponse = await client.message.send({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'What is my name?' }],
  },
  context: {
    contextId: firstResponse.contextId,
  },
});
```

### Message with Files

```typescript
const fileContent = await readFile('data.csv');
const base64Data = Buffer.from(fileContent).toString('base64');

const response = await client.message.send({
  message: {
    role: 'user',
    content: [
      { type: 'text', content: 'Please analyze this data' },
      {
        type: 'file',
        filename: 'data.csv',
        mimeType: 'text/csv',
        data: base64Data,
      },
    ],
  },
});
```

## Streaming Responses

Streaming provides real-time updates as the agent processes your message:

```typescript
// Basic streaming
for await (const task of client.message.stream({ message })) {
  console.log('Current state:', task.state);

  // Get the latest assistant message
  const assistantMessages = task.messages.filter((m) => m.role === 'assistant');
  const latestMessage = assistantMessages[assistantMessages.length - 1];

  if (latestMessage) {
    console.log('Assistant:', latestMessage.content);
  }
}
```

### Progressive UI Updates

```typescript
const messageContainer = document.getElementById('messages');

for await (const task of client.message.stream({ message })) {
  // Clear and re-render all messages
  messageContainer.innerHTML = '';

  task.messages.forEach((msg) => {
    const div = document.createElement('div');
    div.className = msg.role;
    div.textContent = msg.content.map((c) => (c.type === 'text' ? c.content : '[File]')).join('');
    messageContainer.appendChild(div);
  });

  // Show loading indicator while streaming
  if (task.state === 'running') {
    const loading = document.createElement('div');
    loading.textContent = 'Agent is typing...';
    messageContainer.appendChild(loading);
  }
}
```

## Authentication

Handle authentication requirements dynamically:

```typescript
const client = new A2AClient({
  agentCard,
  onAuthRequired: async (event) => {
    console.log('Authentication required for:', event.serviceName);

    // Show auth UI to user
    const userConsent = await showAuthDialog({
      service: event.serviceName,
      description: event.authParts[0].description,
      consentUrl: event.authParts[0].consentLink,
    });

    if (userConsent) {
      // Open consent URL in popup
      const authWindow = window.open(
        event.authParts[0].consentLink,
        'auth',
        'width=600,height=700'
      );

      // Wait for auth completion
      await waitForAuthWindow(authWindow);

      // Notify agent that auth is complete
      await client.sendAuthenticationCompleted(event.contextId);
    }
  },
});
```

### Auth Flow Helper

```typescript
async function waitForAuthWindow(authWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });
}
```

## Error Handling

Comprehensive error handling for production use:

```typescript
try {
  for await (const task of client.message.stream({ message })) {
    // Process updates
  }
} catch (error) {
  if (error.name === 'A2AError') {
    switch (error.code) {
      case 'NETWORK_ERROR':
        console.error('Network issue:', error.message);
        // Retry logic
        break;

      case 'INVALID_AGENT_CARD':
        console.error('Invalid agent configuration');
        // Fallback to default agent
        break;

      case 'RATE_LIMITED':
        console.error('Too many requests');
        // Show rate limit message
        break;

      case 'AUTH_REQUIRED':
        console.error('Authentication needed');
        // Trigger auth flow
        break;

      default:
        console.error('Unexpected error:', error);
    }
  } else {
    // Non-A2A errors
    console.error('System error:', error);
  }
}
```

## Advanced Usage

### Custom HTTP Configuration

```typescript
const client = new A2AClient({
  agentCard,
  httpOptions: {
    timeout: 30000, // 30 seconds
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

### Using with Node.js

```typescript
import { A2AClient } from '@microsoft/a2achat-core';
import fetch from 'node-fetch';

// Polyfill for Node.js
global.fetch = fetch;

const client = new A2AClient({
  agentCard: process.env.AGENT_CARD_URL,
  auth: {
    type: 'bearer',
    token: process.env.API_TOKEN,
  },
});

// Use in a CLI tool
async function chatCLI() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const input = await new Promise((resolve) => readline.question('You: ', resolve));

    if (input === 'exit') break;

    console.log('Agent: Thinking...');

    for await (const task of client.message.stream({
      message: { role: 'user', content: [{ type: 'text', content: input }] },
    })) {
      const lastMsg = task.messages[task.messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        console.log('Agent:', lastMsg.content[0].content);
      }
    }
  }

  readline.close();
}
```

### Canceling Requests

```typescript
const abortController = new AbortController();

// Start streaming
const streamPromise = (async () => {
  try {
    for await (const task of client.message.stream({
      message,
      signal: abortController.signal,
    })) {
      // Process updates
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request canceled');
    }
  }
})();

// Cancel after 5 seconds
setTimeout(() => {
  abortController.abort();
}, 5000);
```

### Working with Tasks

```typescript
// Get task details
const task = await client.task.get('task-123');
console.log('Task state:', task.state);

// Cancel a running task
await client.task.cancel('task-123', 'User requested cancellation');

// Wait for task completion
const completedTask = await client.task.waitForCompletion('task-123', {
  pollingInterval: 1000, // Check every second
  timeout: 60000, // Wait up to 1 minute
});
```

## Best Practices

### 1. Reuse Client Instances

```typescript
// Good - create once, reuse many times
const client = new A2AClient({ agentCard });
app.locals.a2aClient = client;

// Bad - creating new instance for each request
app.post('/chat', (req, res) => {
  const client = new A2AClient({ agentCard }); // Don't do this
});
```

### 2. Handle Connection Lifecycle

```typescript
class ChatService {
  private client: A2AClient;

  constructor(agentCard: AgentCard) {
    this.client = new A2AClient({ agentCard });
  }

  async sendMessage(content: string): Promise<void> {
    try {
      await this.client.message.send({
        message: { role: 'user', content: [{ type: 'text', content }] },
      });
    } catch (error) {
      // Handle errors
    }
  }

  destroy(): void {
    // Clean up if needed
  }
}
```

### 3. Implement Retry Logic

```typescript
async function sendWithRetry(client: A2AClient, message: Message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.message.send({ message });
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import { A2AClient } from '@microsoft/a2achat-core';

const app = express();
const client = new A2AClient({ agentCard: process.env.AGENT_CARD });

app.post('/api/chat', express.json(), async (req, res) => {
  const { message } = req.body;

  try {
    const response = await client.message.send({ message });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Streaming endpoint
app.post('/api/chat/stream', express.json(), async (req, res) => {
  const { message } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    for await (const task of client.message.stream({ message })) {
      res.write(`data: ${JSON.stringify(task)}\n\n`);
    }
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});
```

### WebSocket Integration

```typescript
import { WebSocketServer } from 'ws';
import { A2AClient } from '@microsoft/a2achat-core';

const wss = new WebSocketServer({ port: 8080 });
const client = new A2AClient({ agentCard });

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const { message } = JSON.parse(data.toString());

    try {
      for await (const task of client.message.stream({ message })) {
        ws.send(JSON.stringify({ type: 'update', task }));
      }
      ws.send(JSON.stringify({ type: 'complete' }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });
});
```

## Next Steps

- [React Hook Integration](./react-hook) - Use with React applications
- [Pre-built Components](./react-components) - Ready-to-use UI components
- [API Reference](../api/client) - Complete API documentation
- [Advanced Examples](../examples/custom-ui) - More integration patterns
