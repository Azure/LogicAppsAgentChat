# A2A Browser SDK Integration Guide

This guide will help you integrate the A2A Browser SDK into your React project for AI agent communication.

## What is the A2A Browser SDK?

The A2A Browser SDK is a TypeScript library that enables browser-based applications to interact with AI agents through the A2A (Agent-to-Agent) protocol. It provides a framework-agnostic core with React-specific hooks for easy integration.

## Installation

Install the SDK in your React project:

```bash
npm install a2a-browser-sdk
```

## Basic Setup

### 1. Core SDK Usage (Framework Agnostic)

```typescript
import { A2AClient, AgentDiscovery } from 'a2a-browser-sdk';

// Discover an agent
const discovery = new AgentDiscovery();
const agentCard = await discovery.fromWellKnownUri('your-agent-domain.com');

// Create client
const client = new A2AClient({
  agentCard,
  auth: {
    type: 'bearer',
    token: 'your-api-token'
  }
});

// Send a message
const task = await client.message.send({
  message: {
    role: 'user',
    content: [
      {
        type: 'text',
        content: 'Hello, agent!'
      }
    ]
  }
});

// Wait for response
const completed = await client.task.waitForCompletion(task.id);
console.log('Response:', completed.messages);
```

### 2. React Hook Usage (Recommended)

```typescript
import { useA2A } from 'a2a-browser-sdk/react';

function ChatComponent() {
  const {
    isConnected,
    isLoading,
    messages,
    agentCard,
    connect,
    disconnect,
    sendMessage,
    clearMessages
  } = useA2A({
    persistSession: true,
    sessionKey: 'my-chat-session'
  });

  const handleConnect = async () => {
    await connect('your-agent-domain.com', {
      type: 'bearer',
      token: 'your-api-token'
    });
  };

  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect to Agent</button>
      ) : (
        <div>
          <div>
            {messages.map((msg, index) => (
              <div key={index}>
                <strong>{msg.role}:</strong> {msg.content}
              </div>
            ))}
          </div>
          <input
            type="text"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage(e.target.value);
                e.target.value = '';
              }
            }}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
```

## Complete React Chat Example

Here's a complete example of a chat interface using the A2A SDK:

```typescript
import React, { useState } from 'react';
import { useA2A } from 'a2a-browser-sdk/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function A2AChat() {
  const [inputText, setInputText] = useState('');
  const [agentDomain, setAgentDomain] = useState('');
  const [apiToken, setApiToken] = useState('');
  
  const {
    isConnected,
    isLoading,
    messages,
    agentCard,
    connect,
    disconnect,
    sendMessage,
    clearMessages
  } = useA2A({
    persistSession: true,
    sessionKey: 'a2a-chat'
  });

  const handleConnect = async () => {
    if (!agentDomain || !apiToken) {
      alert('Please enter both agent domain and API token');
      return;
    }
    
    try {
      await connect(agentDomain, {
        type: 'bearer',
        token: apiToken
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to agent');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      await sendMessage(inputText);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>A2A Chat Interface</h1>
      
      {!isConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <h3>Connect to Agent</h3>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Agent domain (e.g., agent.example.com)"
              value={agentDomain}
              onChange={(e) => setAgentDomain(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <input
              type="password"
              placeholder="API Token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button 
              onClick={handleConnect}
              disabled={isLoading}
              style={{ padding: '10px 20px' }}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h3>Connected to: {agentCard?.name}</h3>
            <p>{agentCard?.description}</p>
            <button onClick={disconnect}>Disconnect</button>
            <button onClick={clearMessages} style={{ marginLeft: '10px' }}>
              Clear Messages
            </button>
          </div>
          
          <div 
            style={{ 
              border: '1px solid #ccc', 
              height: '400px', 
              overflowY: 'auto',
              padding: '10px',
              marginBottom: '20px',
              backgroundColor: '#f9f9f9'
            }}
          >
            {messages.map((message, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f3e5f5',
                  borderRadius: '8px'
                }}
              >
                <strong>{message.role === 'user' ? 'You' : 'Agent'}:</strong>
                <div style={{ marginTop: '5px' }}>
                  {message.content}
                </div>
                <small style={{ color: '#666' }}>
                  {message.timestamp?.toLocaleTimeString()}
                </small>
              </div>
            ))}
            {isLoading && (
              <div style={{ fontStyle: 'italic', color: '#666' }}>
                Agent is typing...
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '10px',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Agent Discovery Methods

The SDK supports three methods to discover agents:

### 1. Well-Known URI (Most Common)
```typescript
const discovery = new AgentDiscovery();
const agentCard = await discovery.fromWellKnownUri('agent.example.com');
```

### 2. Registry Lookup
```typescript
const agentCard = await discovery.fromRegistry(
  'https://registry.a2a.io',
  'agent-id-123'
);
```

### 3. Direct Configuration
```typescript
// From URL
const agentCard = await discovery.fromDirect('https://example.com/agent-card.json');

// Or inline configuration
const agentCard = await discovery.fromDirect({
  protocolVersion: '0.2.9',
  name: 'My Agent',
  description: 'Custom agent',
  version: '1.0.0',
  url: 'https://api.my-agent.com',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: []
});
```

## Authentication Methods

The SDK supports multiple authentication methods:

### Bearer Token
```typescript
const auth = {
  type: 'bearer',
  token: 'your-bearer-token'
};
```

### API Key
```typescript
const auth = {
  type: 'api-key',
  key: 'your-api-key',
  header: 'X-API-Key' // optional, defaults to 'X-API-Key'
};
```

### OAuth2
```typescript
const auth = {
  type: 'oauth2',
  accessToken: 'your-access-token'
};
```

### Custom Authentication
```typescript
const auth = {
  type: 'custom',
  handler: async (request) => {
    // Add custom auth headers
    request.headers.set('Authorization', `Custom ${await getToken()}`);
    return request;
  }
};
```

## Advanced Features

### Real-time Streaming
```typescript
const stream = client.message.stream({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'Write a story' }]
  }
});

for await (const task of stream) {
  console.log(`Status: ${task.state}`);
  if (task.messages.length > 1) {
    const lastMessage = task.messages[task.messages.length - 1];
    console.log('Latest response:', lastMessage.content);
  }
}
```

### File Upload
```typescript
const fileData = await fileToBase64(file);
const task = await client.message.send({
  message: {
    role: 'user',
    content: [
      {
        type: 'text',
        content: 'Please analyze this image:'
      },
      {
        type: 'file',
        mimeType: file.type,
        data: fileData,
        filename: file.name
      }
    ]
  }
});
```

### Session Persistence
```typescript
import { SessionManager } from 'a2a-browser-sdk';

const session = new SessionManager({
  storage: 'local', // or 'session'
  storageKey: 'my-app-session',
  autoSave: true,
  ttl: 86400000 // 24 hours
});

// Store data
session.set('userId', 'user-123');
session.set('preferences', { theme: 'dark' });

// Retrieve data
const userId = session.get('userId');
```

## Error Handling

```typescript
try {
  const task = await client.message.send({
    message: {
      role: 'user',
      content: [{ type: 'text', content: 'Hello' }]
    }
  });
} catch (error) {
  if (error.message.includes('Invalid message')) {
    // Handle validation error
    console.error('Message validation failed');
  } else if (error.message.includes('HTTP error')) {
    // Handle network error
    console.error('Network error occurred');
  } else {
    // Handle other errors
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Support

The SDK is fully typed. Import types as needed:

```typescript
import type { 
  AgentCard, 
  Task, 
  Message, 
  Capability,
  AuthConfig 
} from 'a2a-browser-sdk';
```

## Common Integration Patterns

### 1. Environment-based Configuration
```typescript
const AGENT_DOMAIN = process.env.REACT_APP_AGENT_DOMAIN || 'localhost:3000';
const API_TOKEN = process.env.REACT_APP_API_TOKEN || 'dev-token';
```

### 2. Custom Hook with Configuration
```typescript
function useConfiguredA2A() {
  return useA2A({
    persistSession: true,
    sessionKey: 'app-chat',
    defaultAuth: {
      type: 'bearer',
      token: process.env.REACT_APP_API_TOKEN
    }
  });
}
```

### 3. Context Provider Pattern
```typescript
const A2AContext = createContext(null);

export function A2AProvider({ children }) {
  const a2a = useA2A({ persistSession: true });
  
  return (
    <A2AContext.Provider value={a2a}>
      {children}
    </A2AContext.Provider>
  );
}

export function useA2AContext() {
  return useContext(A2AContext);
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check agent domain and API token
2. **CORS Errors**: Ensure the agent server has proper CORS configuration
3. **Authentication Errors**: Verify the auth method matches the agent's requirements
4. **Message Format Errors**: Ensure message content follows the A2A protocol schema

### Debug Mode
```typescript
const client = new A2AClient({
  agentCard,
  auth,
  httpOptions: {
    timeout: 30000, // Increase timeout
    retries: 3      // Retry failed requests
  }
});
```

This guide should help you integrate the A2A Browser SDK into any React project. The library provides both low-level SDK access and high-level React hooks for easy integration with AI agents.