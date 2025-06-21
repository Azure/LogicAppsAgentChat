# React Usage Guide

The @microsoft/a2achat library is built with React and provides seamless integration with React applications.

## Prerequisites

The library requires React 16.8 or higher (for hooks support).

## Installation

```bash
npm install @microsoft/a2achat
```

Note: React and React-DOM are peer dependencies, so make sure they're installed in your project:

```bash
npm install react react-dom
```

## Basic Usage

### As a Component

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import '@microsoft/a2achat/styles.css';

function App() {
  return (
    <div className="app">
      <ChatWindow
        serverUrl="wss://your-chat-server.com"
        theme={{
          colors: {
            primary: '#0066cc'
          }
        }}
      />
    </div>
  );
}

export default App;
```

### With State Management

```tsx
import React, { useState, useCallback } from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import type { Message } from '@microsoft/a2achat';

function ChatApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleMessage = useCallback((message: Message) => {
    console.log('New message:', message);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('Connection status:', connected);
    setIsConnected(connected);
  }, []);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <ChatWindow
        serverUrl="wss://your-chat-server.com"
        onMessage={handleMessage}
        onConnectionChange={handleConnectionChange}
        userId="user-123"
        metadata={{ source: 'web-app' }}
      />
    </div>
  );
}
```

### Custom Theming

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import type { ChatTheme } from '@microsoft/a2achat';

const customTheme: Partial<ChatTheme> = {
  colors: {
    primary: '#4a90e2',
    primaryText: '#ffffff',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    error: '#dc3545',
    success: '#28a745'
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: {
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem'
    }
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '16px'
  },
  branding: {
    logoUrl: '/logo.png',
    logoSize: 'medium',
    logoPosition: 'header'
  }
};

function ThemedChat() {
  return (
    <ChatWindow
      serverUrl="wss://your-chat-server.com"
      theme={customTheme}
      welcomeMessage="Welcome! How can I assist you today?"
    />
  );
}
```

### With File Upload

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';

function ChatWithFileUpload() {
  return (
    <ChatWindow
      serverUrl="wss://your-chat-server.com"
      allowFileUpload={true}
      maxFileSize={5 * 1024 * 1024} // 5MB
      allowedFileTypes={['.pdf', '.jpg', '.png', '.doc', '.docx']}
      onMessage={(message) => {
        if (message.attachments) {
          console.log('Message with attachments:', message.attachments);
        }
      }}
    />
  );
}
```

### Dynamic Mounting

```tsx
import React, { useEffect, useRef } from 'react';
import { mountChatWidget } from '@microsoft/a2achat';
import '@microsoft/a2achat/styles.css';

function DynamicChat() {
  const containerRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      unmountRef.current = mountChatWidget(containerRef.current, {
        serverUrl: 'wss://your-chat-server.com',
        theme: {
          colors: {
            primary: '#0066cc'
          }
        }
      });
    }

    return () => {
      unmountRef.current?.();
    };
  }, []);

  return <div ref={containerRef} style={{ height: '600px' }} />;
}
```

## Integration with A2A Agents

The chat widget has built-in support for A2A-compliant agents. Simply provide an `agentUrl` prop:

### Basic A2A Integration

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';

function A2AChat() {
  return (
    <ChatWindow
      agentUrl="https://my-a2a-agent.example.com"  // A2A agent URL
      serverUrl="wss://fallback-server.com"         // Fallback WebSocket URL
      theme={{
        colors: {
          primary: '#0066cc'
        }
      }}
    />
  );
}
```

### A2A Chat with Event Handling

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';

function A2AChatWithEvents() {
  const handleMessage = (message: Message) => {
    if (message.sender === 'user') {
      console.log('User said:', message.content);
    } else {
      console.log('Agent replied:', message.content);
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    console.log('A2A agent connection:', connected ? 'Connected' : 'Disconnected');
  };

  return (
    <ChatWindow
      agentUrl="https://my-a2a-agent.example.com"
      serverUrl="wss://fallback-server.com"
      onMessage={handleMessage}
      onConnectionChange={handleConnectionChange}
      welcomeMessage="Hello! I'm your A2A-powered assistant."
    />
  );
}
```

### How A2A Integration Works

When you provide an `agentUrl`:

1. The chat widget initializes an A2A client internally
2. It checks the agent's capabilities (SSE support, etc.)
3. Messages are sent using the A2A protocol
4. If SSE is supported, responses stream in real-time
5. If not, it falls back to simple request/response

### Direct A2A Client Usage

You can also use the A2A client directly:

```tsx
import React, { useState } from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import { A2AClient } from '@microsoft/a2achat';

function CustomA2AChat() {
  const [client] = useState(() => new A2AClient('https://agent.example.com'));

  // Custom logic with direct client access
  const checkAgentStatus = async () => {
    try {
      const card = await client.getAgentCard();
      console.log('Agent info:', card);
    } catch (error) {
      console.error('Agent not available:', error);
    }
  };

  return (
    <div>
      <button onClick={checkAgentStatus}>Check Agent Status</button>
      <ChatWindow
        agentUrl="https://agent.example.com"
        serverUrl="wss://fallback-server.com"
      />
    </div>
  );
}
```

## TypeScript Support

The library is written in TypeScript and provides full type definitions:

```tsx
import type { 
  ChatWidgetProps, 
  ChatWidgetPropsWithA2A,
  ChatTheme, 
  Message, 
  Attachment 
} from '@microsoft/a2achat';

// All types are available for your use
const config: ChatWidgetPropsWithA2A = {
  agentUrl: 'https://my-a2a-agent.example.com', // Optional A2A agent
  serverUrl: 'wss://your-chat-server.com',
  theme: {
    colors: {
      primary: '#0066cc'
    }
  }
};
```

## Styling

The library uses CSS variables for theming, making it easy to override styles:

```css
/* Override in your global CSS */
.chat-widget-container {
  --chat-color-primary: #your-color;
  --chat-font-family: 'Your Font', sans-serif;
  --chat-spacing-unit: 10px;
}
```

## Best Practices

1. **Always import the CSS file** when using as an NPM package
2. **Handle connection errors** using the `onConnectionChange` callback
3. **Validate file uploads** on your server even if using client-side restrictions
4. **Use TypeScript** for better type safety and autocomplete
5. **Test your theme** across different screen sizes

## Troubleshooting

### CSS not loading
Make sure to import the CSS file:
```tsx
import '@microsoft/a2achat/styles.css';
```

### Connection issues
Check that your WebSocket server URL is correct and supports the expected protocol.

### Theme not applying
Ensure your theme object follows the correct structure. Use TypeScript for validation.

### React version conflicts
This library requires React 16.8+. Check your React version:
```bash
npm list react
```