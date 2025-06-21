# A2A Client Library

A TypeScript client library for interacting with A2A-compliant agents. This client supports both Server-Sent Events (SSE) streaming and regular HTTP request/response modes, automatically detecting the agent's capabilities.

## Features

- **Automatic Mode Detection**: Automatically detects if an agent supports SSE by checking the AgentCard capabilities
- **Simple Request/Response**: Standard HTTP request/response mode for all agents via `sendMessage()`
- **SSE Streaming**: For agents with SSE support, enables real-time streaming via `sendMessageStream()`
- **No Polling**: When SSE is not supported, the client uses simple request/response without any polling
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Debug Mode**: Built-in debug logging for troubleshooting
- **Clear Error Messages**: Throws descriptive errors when trying to use streaming features with non-SSE agents

## Installation

```bash
npm install @microsoft/a2achat
```

## Quick Start

```typescript
import { A2AClient } from '@microsoft/a2achat';

// Create client - works with both SSE and non-SSE agents
const client = new A2AClient('https://agent.example.com');

// Send a simple message
const response = await client.sendMessage({
  message: {
    kind: 'message',
    messageId: 'msg-123',
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello, how can you help me today?' }]
  },
  configuration: {
    acceptedOutputModes: ['text']
  }
});

console.log('Response:', response);
```

## Configuration

The client accepts an optional configuration object:

```typescript
const client = new A2AClient('https://agent.example.com', {
  debug: true  // Enable debug logging (default: false)
});
```

## Usage Examples

### Basic Message Send

```typescript
// Send a message and wait for response
const response = await client.sendMessage({
  message: {
    kind: 'message',
    messageId: `msg-${Date.now()}`,
    role: 'user',
    parts: [{ 
      kind: 'text', 
      text: 'What is the weather like today?' 
    }]
  },
  configuration: {
    acceptedOutputModes: ['text'],
    blocking: true  // Wait for complete response
  }
});

if ('result' in response) {
  console.log('Success:', response.result);
} else if ('error' in response) {
  console.error('Error:', response.error);
}
```

### Streaming Updates (Only for SSE-Enabled Agents)

```typescript
// Stream updates - only works if agent supports SSE
async function streamChat() {
  // First check if streaming is supported
  const supportsSSE = await client.supportsStreaming();
  if (!supportsSSE) {
    console.log('This agent does not support streaming. Use sendMessage() instead.');
    return;
  }
  const messageStream = client.sendMessageStream({
    message: {
      kind: 'message',
      messageId: `msg-${Date.now()}`,
      role: 'user',
      parts: [{ 
        kind: 'text', 
        text: 'Write a short story about a robot' 
      }]
    },
    configuration: {
      acceptedOutputModes: ['text']
    }
  });

  for await (const update of messageStream) {
    switch (update.kind) {
      case 'message':
        console.log('New message:', update.parts[0]);
        break;
      
      case 'task':
        console.log('Task created:', update.id);
        console.log('Status:', update.status.state);
        break;
      
      case 'status-update':
        console.log('Status changed to:', update.status.state);
        if (update.final) {
          console.log('Task completed!');
        }
        break;
      
      case 'artifact-update':
        console.log('New artifact:', update.artifact.name);
        break;
    }
  }
}

streamChat().catch(console.error);
```

### Working with Files

```typescript
// Send a message with file attachment
const response = await client.sendMessage({
  message: {
    kind: 'message',
    messageId: `msg-${Date.now()}`,
    role: 'user',
    parts: [
      { 
        kind: 'text', 
        text: 'Can you analyze this image?' 
      },
      {
        kind: 'file',
        file: {
          uri: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg',
          name: 'image.jpg'
        }
      }
    ]
  },
  configuration: {
    acceptedOutputModes: ['text', 'image']
  }
});
```

### Task Management

```typescript
// Get task details
const taskResponse = await client.getTask({
  id: 'task-123',
  historyLength: 10  // Get last 10 messages
});

if ('result' in taskResponse) {
  const task = taskResponse.result;
  console.log('Task status:', task.status.state);
  console.log('Messages:', task.history);
}

// Cancel a task
const cancelResponse = await client.cancelTask({
  id: 'task-123'
});

// Resubscribe to task updates (if connection was lost)
const resubscribeStream = client.resubscribeTask({
  id: 'task-123'
});

for await (const update of resubscribeStream) {
  console.log('Task update:', update);
}
```

### Push Notifications

```typescript
// Set up push notifications for a task
const pushConfig = await client.setTaskPushNotificationConfig({
  taskId: 'task-123',
  pushNotificationConfig: {
    url: 'https://myapp.com/webhook',
    token: 'secret-token',
    authentication: {
      schemes: ['Bearer'],
      credentials: 'my-auth-token'
    }
  }
});

// Get current push notification config
const currentConfig = await client.getTaskPushNotificationConfig({
  id: 'task-123'
});
```

### Error Handling

```typescript
try {
  const response = await client.sendMessage({
    message: {
      kind: 'message',
      messageId: `msg-${Date.now()}`,
      role: 'user',
      parts: [{ kind: 'text', text: 'Hello' }]
    },
    configuration: {
      acceptedOutputModes: ['text']
    }
  });
  
  // Handle response
} catch (error) {
  if (error.message.includes('Agent does not support streaming')) {
    console.log('Agent does not support SSE, use sendMessage() instead');
  } else {
    console.error('Error:', error);
  }
}
```

### Checking Agent Capabilities

```typescript
// Get agent information
const agentCard = await client.getAgentCard();
console.log('Agent name:', agentCard.name);
console.log('Agent version:', agentCard.version);
console.log('Supports SSE:', agentCard.capabilities?.streaming);
console.log('Supports push notifications:', agentCard.capabilities?.pushNotifications);

// Check if streaming is supported
const supportsSSE = await client.supportsStreaming();
console.log('This agent supports SSE:', supportsSSE);
```

## How It Works

### SSE Support Detection

When the client is initialized, it fetches the agent's card from `/.well-known/agent.json` and checks the `capabilities.streaming` field:

- **If SSE is supported**: Streaming methods (`sendMessageStream`, `resubscribeTask`) are available
- **If SSE is not supported**: Streaming methods will throw an error. Use `sendMessage()` for simple request/response

### Request/Response Mode

Available for all agents:
- Use `sendMessage()` for sending messages and receiving responses
- The method returns a complete response immediately
- No polling or background updates

### Streaming Mode

For agents with SSE support only:
- Use `sendMessageStream()` for real-time updates
- Returns an async generator that yields events as they arrive
- Supports task status updates, messages, and artifacts
- Throws an error if the agent doesn't support SSE

## Best Practices

1. **Always handle errors**: Both network errors and A2A protocol errors
2. **Check capabilities first**: Use `supportsStreaming()` before attempting to use streaming methods
3. **Use appropriate methods**: Use `sendMessage()` for non-SSE agents, `sendMessageStream()` for SSE agents
4. **Enable debug mode during development**: Helps understand what's happening under the hood
5. **Handle both response types**: Your application should work with both streaming and non-streaming agents

## API Reference

### Constructor

```typescript
new A2AClient(agentBaseUrl: string, config?: A2AClientConfig)
```

### Methods

- `getAgentCard(agentBaseUrl?: string): Promise<AgentCard>`
- `sendMessage(params: MessageSendParams): Promise<SendMessageResponse>`
- `sendMessageStream(params: MessageSendParams): AsyncGenerator<A2AStreamEventData>`
- `getTask(params: TaskQueryParams): Promise<GetTaskResponse>`
- `cancelTask(params: TaskIdParams): Promise<CancelTaskResponse>`
- `resubscribeTask(params: TaskIdParams): AsyncGenerator<A2AStreamEventData>`
- `setTaskPushNotificationConfig(params: TaskPushNotificationConfig): Promise<SetTaskPushNotificationConfigResponse>`
- `getTaskPushNotificationConfig(params: TaskIdParams): Promise<GetTaskPushNotificationConfigResponse>`
- `supportsStreaming(): Promise<boolean>`

## License

MIT