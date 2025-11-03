# @microsoft/a2achat-core

Framework-agnostic TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents.

## Features

- 🚀 **Small bundle size**: ~45KB limit with React as peer dependency
- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- ⚛️ **React 18+ compatible**: Works seamlessly with modern React applications
- 🤖 **A2A Protocol**: Built on the official A2A protocol specification
- 🔐 **Authentication**: Built-in support for Bearer, API Key, OAuth2, and custom auth
- 🌊 **Real-time Streaming**: Server-Sent Events for real-time agent responses
- 🔍 **Agent Discovery**: Automatic agent card resolution from domain names
- ✅ **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
# Using npm
npm install @microsoft/a2achat-core

# Using pnpm
pnpm add @microsoft/a2achat-core

# Using yarn
yarn add @microsoft/a2achat-core
```

## Usage

### React Components

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <ChatWindow
      agentCard="https://my-a2a-agent.example.com" // Agent domain
      auth={{
        type: 'bearer',
        token: 'your-api-token',
      }}
      theme={{
        colors: {
          primary: '#0066cc',
          primaryText: '#ffffff',
          background: '#f5f5f5',
        },
      }}
      welcomeMessage="Hello! How can I help you today?"
      allowFileUpload={true}
      maxFileSize={10 * 1024 * 1024} // 10MB
      allowedFileTypes={['image/*', 'application/pdf', '.doc', '.docx']}
      onMessage={(message) => console.log('New message:', message)}
      onConnectionChange={(connected) => console.log('Connected:', connected)}
    />
  );
}
```

### Direct Client Usage

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

// Create client instance
const client = new A2AClient({
  agentCard: 'https://my-a2a-agent.example.com',
  auth: {
    type: 'bearer',
    token: 'your-api-token',
  },
});

// Connect and send messages
await client.connect();

// Send a message
const response = await client.sendMessage('Hello, agent!');

// Handle streaming responses
client.on('message', (message) => {
  console.log('Received:', message);
});

// Clean up
client.disconnect();
```

### Authentication Options

```typescript
// Bearer token
const bearerAuth = {
  type: 'bearer',
  token: 'your-bearer-token',
};

// API Key
const apiKeyAuth = {
  type: 'apiKey',
  key: 'your-api-key',
  header: 'X-API-Key', // optional, defaults to 'X-API-Key'
};

// OAuth2
const oauth2Auth = {
  type: 'oauth2',
  accessToken: 'your-access-token',
};

// Custom authentication
const customAuth = {
  type: 'custom',
  handler: async (request) => {
    request.headers.set('Authorization', `Custom ${await getToken()}`);
    return request;
  },
};
```

## API Reference

### ChatWindow Props

| Prop                 | Type                           | Description                                  |
| -------------------- | ------------------------------ | -------------------------------------------- |
| `agentCard`          | `string \| AgentCard`          | Agent domain or agent card object (required) |
| `auth`               | `AuthConfig`                   | Authentication configuration                 |
| `theme`              | `Partial<ChatTheme>`           | Custom theme configuration                   |
| `userId`             | `string`                       | User identifier                              |
| `metadata`           | `Record<string, any>`          | Additional metadata                          |
| `placeholder`        | `string`                       | Input placeholder text                       |
| `welcomeMessage`     | `string`                       | Initial welcome message                      |
| `allowFileUpload`    | `boolean`                      | Enable file uploads                          |
| `maxFileSize`        | `number`                       | Max file size in bytes                       |
| `allowedFileTypes`   | `string[]`                     | Allowed file types                           |
| `onMessage`          | `(message: Message) => void`   | Message callback                             |
| `onConnectionChange` | `(connected: boolean) => void` | Connection status callback                   |

### A2AClient Methods

- `connect(): Promise<void>` - Establish connection to agent
- `disconnect(): void` - Close connection
- `sendMessage(content: string | MessageContent): Promise<void>` - Send a message
- `on(event: string, handler: Function): void` - Subscribe to events
- `off(event: string, handler: Function): void` - Unsubscribe from events

## License

MIT
