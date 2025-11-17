# A2A Chat Monorepo

[![CI](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/ci.yml/badge.svg)](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/ci.yml)
[![PR Checks](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/pr-checks.yml)
[![Security](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/security.yml/badge.svg)](https://github.com/Azure/LogicAppsAgentChat/actions/workflows/security.yml)

A TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents. Available as both a library and an embeddable iframe widget.

## 📦 What's Inside

This monorepo contains:

- **[@microsoft/a2achat-core](./packages/a2a-core)** - Core TypeScript SDK with framework-agnostic APIs and React components
- **[Iframe App](./apps/iframe-app)** - Embeddable iframe widget for easy integration
- **[Documentation Site](./apps/docs-site)** - Comprehensive Docusaurus documentation

## Structure

```
├── packages/
│   └── a2a-core/          # Core SDK with multiple entry points
│       ├── src/
│       │   ├── index.ts           # Main entry (core APIs)
│       │   ├── react/index.ts     # React entry (components & hooks)
│       │   └── chat/index.ts      # Chat entry (event-driven interface)
│       └── README.md
├── apps/
│   ├── iframe-app/        # Embeddable iframe widget
│   │   ├── src/
│   │   ├── docs/          # Iframe-specific documentation
│   │   └── README.md
│   └── docs-site/         # Documentation website
└── docs/                  # Architecture & design docs
```

## Quick Start

### Installation

```bash
npm install @microsoft/a2achat-core
# or
pnpm add @microsoft/a2achat-core
# or
yarn add @microsoft/a2achat-core
```

### Basic Usage

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <ChatWidget
      agentCard="https://my-agent.example.com"
      auth={{ type: 'bearer', token: 'your-token' }}
      welcomeMessage="Hello! How can I help you today?"
    />
  );
}
```

For detailed development instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## 📖 Examples

### Server-Side History with Multi-Session

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';

<ChatWidget
  agentCard="https://api.example.com"
  auth={{ type: 'bearer', token: 'token' }}
  storageConfig={{
    type: 'server',
    agentUrl: 'https://api.example.com',
    getAuthToken: () => getToken(),
  }}
  // Resume existing conversation
  initialContextId="conv-abc123"
  // Track context changes
  onContextIdChange={(contextId) => {
    console.log('Context changed:', contextId);
    // Optionally save to URL or localStorage
    history.pushState({}, '', `?contextId=${contextId}`);
  }}
/>;
```

### Custom UI with useA2A Hook

```tsx
import { useA2A } from '@microsoft/a2achat-core/react';
import { useState } from 'react';

function CustomChatUI() {
  const [input, setInput] = useState('');

  const { messages, isLoading, isConnected, sendMessage, clearMessages, authState } = useA2A({
    agentCard: 'https://api.example.com',
    auth: { type: 'bearer', token: 'token' },
    storageConfig: { type: 'indexeddb' },
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

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
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
      <button onClick={clearMessages}>Clear</button>
    </div>
  );
}
```

### Handling On-Behalf-Of (OBO) Authentication

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';

<ChatWidget
  agentCard="https://api.example.com"
  auth={{
    type: 'bearer',
    token: 'your-api-token',
  }}
  // Handle authentication events
  onUnauthorized={async (event) => {
    console.log('Unauthorized:', event.url, event.statusText);

    // Refresh token
    try {
      const response = await fetch('/.auth/refresh', {
        credentials: 'same-origin',
      });

      if (response.ok) {
        // Token refreshed, retry will happen automatically
        console.log('Token refreshed');
      } else {
        // Redirect to login
        window.location.href = '/.auth/login/aad';
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }}
/>;
```

### Low-Level Client with Streaming

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
  onAuthRequired: (event) => {
    console.log('Auth required:', event.authParts);
    // Open consent URLs in popup
    event.authParts.forEach((part) => {
      if (part.url) {
        window.open(part.url, '_blank', 'width=600,height=700');
      }
    });
  },
});

// Stream messages
const stream = await client.message.stream({
  message: {
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello, how are you?' }],
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

## ✨ Features

### Core Features

- 🚀 **Small bundle size**: ~45KB with React as peer dependency
- 📦 **Dual distribution**: NPM package + iframe embed
- 🎨 **Fully customizable**: CSS variables for runtime theming
- ⚛️ **React 19+ compatible**: Modern React applications
- ✅ **TypeScript**: Full type safety and IntelliSense
- 🧪 **Well tested**: Comprehensive test suite with Vitest

### Chat Features

- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- 💬 **Multi-session**: Multiple concurrent conversations with sidebar UI
- 🔐 **Authentication**: Bearer, API Key, OAuth2, Cookie, and custom handlers
- 🌊 **Real-time streaming**: Server-Sent Events (SSE) for real-time agent responses
- 💾 **Chat history**: Client-side (IndexedDB) or server-side storage
- 🔍 **Agent discovery**: Automatic agent card resolution

### Integration

- 🖼️ **Iframe embeddable**: Easy no-code integration
- 📨 **PostMessage API**: Cross-origin communication
- 🪟 **Azure Portal**: Frame Blade protocol support
- 🔌 **Plugin system**: Extensible with custom analytics, logging, and more

## 📚 Documentation

### Entry Points

The `@microsoft/a2achat-core` package provides multiple entry points for different use cases:

#### 1. React Components (`/react`)

Full-featured React components with built-in UI and state management:

```tsx
import { ChatWidget, ChatWindow } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

// Single-session chat
<ChatWidget
  agentCard="https://api.example.com"
  auth={{ type: 'bearer', token: 'token' }}
  welcomeMessage="How can I help?"
  allowFileUpload={true}
/>

// Multi-session chat with server-side history
<ChatWidget
  agentCard="https://api.example.com"
  auth={{ type: 'bearer', token: 'token' }}
  storageConfig={{
    type: 'server',
    agentUrl: 'https://api.example.com',
  }}
  initialContextId="session-123"
/>
```

#### 2. React Hooks (`/react`)

For custom UI implementations:

```tsx
import { useA2A } from '@microsoft/a2achat-core/react';

function CustomChat() {
  const { messages, isLoading, isConnected, sendMessage, authState } = useA2A({
    agentCard: 'https://api.example.com',
    auth: { type: 'bearer', token: 'token' },
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') sendMessage(e.target.value);
        }}
      />
    </div>
  );
}
```

#### 3. Core Client API (main entry)

Framework-agnostic for any JavaScript environment:

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
});

// Send a message
const task = await client.message.send({
  message: {
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello' }],
  },
});

// Stream responses
for await (const chunk of await client.message.stream({
  message: {
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello' }],
  },
})) {
  console.log(chunk);
}
```

#### 4. Event-Driven Chat Interface (`/chat`)

For event-based architectures:

```typescript
import { ChatInterface } from '@microsoft/a2achat-core/chat';

const chat = new ChatInterface({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
});

chat.on('message-sent', (msg) => console.log('Sent:', msg));
chat.on('message-received', (msg) => console.log('Received:', msg));
chat.on('error', (err) => console.error('Error:', err));

await chat.sendMessage('Hello, agent!');
```

### Authentication Methods

```tsx
import { AuthConfig } from '@microsoft/a2achat-core';

// Bearer token
const bearerAuth: AuthConfig = {
  type: 'bearer',
  token: 'your-bearer-token',
};

// API Key
const apiKeyAuth: AuthConfig = {
  type: 'api-key',
  key: 'your-api-key',
  header: 'X-API-Key',
};

// OAuth2
const oauth2Auth: AuthConfig = {
  type: 'oauth2',
  accessToken: 'your-access-token',
  tokenType: 'Bearer',
};

// Cookie-based (for same-origin)
const cookieAuth: AuthConfig = {
  type: 'cookie',
};

// Custom handler
const customAuth: AuthConfig = {
  type: 'custom',
  handler: async (request) => {
    const token = await getTokenFromYourAuthService();
    request.headers.set('Authorization', `Custom ${token}`);
    return request;
  },
};

// No authentication
const noAuth: AuthConfig = {
  type: 'none',
};
```

### Iframe Widget Usage

The iframe app provides an easy way to embed chat without npm dependencies. See [apps/iframe-app](./apps/iframe-app) for full documentation.

#### Basic Embedding

```html
<!-- Via URL parameters -->
<iframe
  src="https://your-domain.com/iframe.html?agentCard=https://api.example.com&theme=blue&multiSession=false"
  width="400"
  height="600"
  style="border: none;"
></iframe>

<!-- Via data attributes -->
<iframe
  src="https://your-domain.com/iframe.html"
  data-agent-card="https://api.example.com"
  data-theme="blue"
  data-user-name="John Doe"
  data-welcome-message="Hello! How can I help?"
  data-allow-file-upload="true"
  data-max-file-size="10485760"
  data-multi-session="false"
  width="400"
  height="600"
  style="border: none;"
></iframe>
```

#### Configuration Options (URL Parameters or Data Attributes)

| Parameter/Attribute | Type    | Description                                   | Default   |
| ------------------- | ------- | --------------------------------------------- | --------- |
| `agentCard`         | string  | Agent card URL (required)                     | -         |
| `userId`            | string  | User identifier                               | -         |
| `userName`          | string  | Display name                                  | -         |
| `theme`             | string  | Preset theme (blue, green, red, purple, etc.) | 'default' |
| `mode`              | string  | Light or dark mode                            | 'light'   |
| `multiSession`      | boolean | Enable multi-session mode                     | false     |
| `singleSession`     | boolean | Force single-session mode                     | true      |
| `contextId`         | string  | Pre-populate session context ID               | -         |
| `allowFileUpload`   | boolean | Enable file uploads                           | true      |
| `maxFileSize`       | number  | Max file size in bytes                        | 10MB      |
| `allowedFileTypes`  | string  | Comma-separated MIME types                    | -         |
| `placeholder`       | string  | Input placeholder text                        | -         |
| `welcomeMessage`    | string  | Initial bot message                           | -         |
| `apiKey`            | string  | API key for authentication                    | -         |
| `oboUserToken`      | string  | On-behalf-of user token                       | -         |
| `logoUrl`           | string  | Branding logo URL                             | -         |
| `logoSize`          | string  | Logo size (small, medium, large)              | 'medium'  |
| `logoPosition`      | string  | Logo position (header, footer)                | 'header'  |
| `expectPostMessage` | boolean | Wait for postMessage configuration            | false     |
| `inPortal`          | boolean | Azure Portal context mode                     | false     |
| `trustedAuthority`  | string  | Portal's origin for auth                      | -         |
| `allowedOrigins`    | string  | Comma-separated allowed postMessage origins   | -         |

#### Multi-Session Mode

Enable multiple concurrent conversations with a sidebar UI:

```html
<iframe
  src="https://your-domain.com/iframe.html?agentCard=https://api.example.com&multiSession=true"
  width="600"
  height="700"
  style="border: none;"
></iframe>
```

Features:

- Multiple concurrent conversations
- Session persistence in localStorage
- Session renaming and deletion
- Last message preview
- Activity timestamps

#### PostMessage Protocol

For dynamic configuration or parent-iframe communication:

```html
<iframe id="chat" src="https://your-domain.com/iframe.html?expectPostMessage=true"></iframe>

<script>
  const iframe = document.getElementById('chat');

  // Listen for iframe ready
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'IFRAME_READY') {
      // Send configuration
      iframe.contentWindow.postMessage(
        {
          type: 'SET_AGENT_CARD',
          agentCard: {
            name: 'My Agent',
            url: 'https://api.example.com/rpc',
            capabilities: { streaming: true },
          },
        },
        '*'
      );
    }

    if (event.data?.type === 'AGENT_CARD_RECEIVED') {
      console.log('Configuration received by iframe');
    }
  });
</script>
```

#### Azure Portal Integration (Frame Blade)

For Azure Portal blade integration:

```html
<iframe
  src="https://your-domain.com/iframe.html?inPortal=true&trustedAuthority=https://portal.azure.com"
  width="100%"
  height="100%"
></iframe>
```

The iframe supports the Frame Blade protocol:

- `ready` - Iframe initialization
- `initializationcomplete` - Full setup done
- `revealcontent` - Ready to display
- `themeChanged` - Handle portal theme changes
- `authToken` - Receive authentication tokens
- `chatHistory` - Import chat history

#### Security

The iframe validates postMessage origins against:

1. Explicitly configured `allowedOrigins`
2. Document referrer origin
3. Current iframe origin
4. Development origins (localhost)

Wildcard subdomain matching supported: `*.example.com`

```html
<iframe
  src="https://your-domain.com/iframe.html?allowedOrigins=https://app.example.com,https://*.example.com"
></iframe>
```

## 🛠️ Development

For development setup, testing, publishing, and contributing guidelines, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## ⚙️ Configuration

### ChatWidget / ChatWindow Props

| Prop                 | Type                                 | Description                                   | Default |
| -------------------- | ------------------------------------ | --------------------------------------------- | ------- |
| `agentCard`          | `string \| AgentCard`                | Agent URL or agent card object (required)     | -       |
| `auth`               | `AuthConfig`                         | Authentication configuration                  | -       |
| `theme`              | `Partial<ChatTheme>`                 | Custom theme configuration                    | -       |
| `userId`             | `string`                             | User identifier                               | -       |
| `userName`           | `string`                             | Display name                                  | -       |
| `metadata`           | `Record<string, any>`                | Additional metadata                           | -       |
| `placeholder`        | `string`                             | Input placeholder text                        | -       |
| `welcomeMessage`     | `string`                             | Initial welcome message                       | -       |
| `allowFileUpload`    | `boolean`                            | Enable file uploads                           | true    |
| `maxFileSize`        | `number`                             | Max file size in bytes                        | 10MB    |
| `allowedFileTypes`   | `string[]`                           | Allowed file types (MIME types or extensions) | -       |
| `sessionKey`         | `string`                             | Unique key for session storage                | -       |
| `sessionId`          | `string`                             | Explicit session identifier                   | -       |
| `sessionName`        | `string`                             | Display name for session                      | -       |
| `agentUrl`           | `string`                             | Override agent endpoint URL                   | -       |
| `storageConfig`      | `StorageConfig`                      | Chat history storage configuration            | -       |
| `initialContextId`   | `string`                             | Resume existing conversation context          | -       |
| `onMessage`          | `(message: Message) => void`         | Message event callback                        | -       |
| `onConnectionChange` | `(connected: boolean) => void`       | Connection status callback                    | -       |
| `onToggleSidebar`    | `() => void`                         | Sidebar toggle callback (multi-session)       | -       |
| `onContextIdChange`  | `(contextId: string) => void`        | Context ID change callback                    | -       |
| `onRenameSession`    | `(newName: string) => Promise<void>` | Session rename callback                       | -       |
| `onUnauthorized`     | `(event: UnauthorizedEvent) => void` | 401 error handler for re-authentication       | -       |

### Theme Configuration

```typescript
interface ChatTheme {
  colors: {
    primary: string; // Primary accent color
    primaryText: string; // Text on primary color
    background: string; // Main background
    surface: string; // Card/container background
    text: string; // Primary text
    textSecondary: string; // Secondary text
    border: string; // Border color
    error: string; // Error states
    success: string; // Success states
    backgroundDark?: string; // Dark mode background
    surfaceDark?: string; // Dark mode surface
    textDark?: string; // Dark mode text
    textSecondaryDark?: string; // Dark mode secondary text
    borderDark?: string; // Dark mode border
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
    unit: number; // Base spacing unit (in pixels)
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

// Usage
import { createCustomTheme, defaultLightTheme } from '@microsoft/a2achat-core/react';

const myTheme = createCustomTheme({
  primaryColor: '#0066cc',
  backgroundColor: '#ffffff',
});
```

### Storage Configuration

```typescript
type StorageConfig =
  | { type: 'indexeddb' }  // Client-side IndexedDB storage
  | {
      type: 'server';       // Server-side storage
      agentUrl: string;
      getAuthToken?: () => string | Promise<string>;
    };

// Usage
<ChatWidget
  agentCard="https://api.example.com"
  storageConfig={{
    type: 'server',
    agentUrl: 'https://api.example.com',
    getAuthToken: () => localStorage.getItem('token') || '',
  }}
  initialContextId="existing-conversation-123"
/>
```

## 🔌 Plugin System

Extend functionality with custom plugins:

```typescript
import { A2AClient, Plugin, PluginManager } from '@microsoft/a2achat-core';

// Define a custom plugin
const analyticsPlugin: Plugin = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Track chat events',
  install: (context) => {
    console.log('Analytics plugin installed');
  },
  hooks: {
    beforeMessageSend: async (message) => {
      console.log('Sending message:', message);
      return message;
    },
    afterMessageReceive: async (message) => {
      console.log('Received message:', message);
      // Send to analytics service
      await trackEvent('message_received', { message });
      return message;
    },
    onError: async (error) => {
      console.error('Chat error:', error);
      // Send to error tracking service
      await trackError(error);
    },
  },
};

// Use with A2AClient
const client = new A2AClient({
  agentCard: 'https://api.example.com',
  auth: { type: 'bearer', token: 'token' },
});

const pluginManager = new PluginManager(client);
pluginManager.register(analyticsPlugin);
```

### Built-in Plugins

#### Analytics Plugin

```typescript
import { AnalyticsPlugin } from '@microsoft/a2achat-core';

const analyticsPlugin = new AnalyticsPlugin({
  trackEvent: (name, data) => {
    // Send to your analytics service
    analytics.track(name, data);
  },
});
```

#### Logger Plugin

```typescript
import { LoggerPlugin } from '@microsoft/a2achat-core';

const loggerPlugin = new LoggerPlugin({
  level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  logger: console, // or custom logger
});
```

### Plugin Hooks

Available lifecycle hooks:

- `beforeRequest` - Modify requests before sending
- `afterResponse` - Process responses after receiving
- `beforeMessageSend` - Transform messages before sending
- `afterMessageReceive` - Process messages after receiving
- `onTaskCreated` - Handle task creation events
- `onTaskCompleted` - Handle task completion events
- `onTaskFailed` - Handle task failure events
- `onError` - Handle error events
- `onStart` - Handle connection start events
- `onStop` - Handle connection stop events

## 📊 Bundle Size

The library is optimized for small bundle size:

- **Core Library**: ~45KB (gzipped, excluding React)
- **React Components**: ~5KB additional (gzipped)
- **Styles**: ~5KB (gzipped)
- **Total**: ~50-55KB with all features enabled

React is a peer dependency and not included in the bundle.

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

Requires support for:

- ES2020+
- Server-Sent Events (SSE)
- IndexedDB (for client-side storage)
- Web Workers (optional, for background tasks)

## 🤝 Contributing

Contributions are welcome! For detailed contribution guidelines, code quality standards, development workflow, and testing requirements, see [DEVELOPMENT.md](./DEVELOPMENT.md).

**Quick Summary:**

- TypeScript strict mode, comprehensive test coverage required
- Follow Conventional Commits format
- All PRs require passing CI checks (types, lint, tests, build)

## 📚 Additional Resources

- [Core Package Documentation](./packages/a2a-core/README.md)
- [Iframe App Documentation](./apps/iframe-app/README.md)
- [Development Guide](./DEVELOPMENT.md)
- [Architecture Documentation](./docs/)
- [API Testing Findings](./docs/api-testing-findings.md)
- [OBO Authentication Guide](./docs/OBO_AUTHENTICATION.md)

## 🔒 Security

For security issues, please see [SECURITY.md](./SECURITY.md) for reporting guidelines.

## 📝 License

MIT License - see [LICENSE.md](./LICENSE.md) for details

---

Built with ❤️ by the A2A Chat team
