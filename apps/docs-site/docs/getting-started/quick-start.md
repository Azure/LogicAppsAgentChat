---
sidebar_position: 2
---

# Quick Start

Get up and running with A2A Chat in just a few minutes. This guide will walk you through creating your first chat interface using different approaches.

## Before You Begin

You'll need an A2A agent card - a JSON document that describes your agent's capabilities and endpoints. This can be:

- A URL to an agent card (e.g., `https://api.example.com/.well-known/agent-card.json`)
- A local agent card object

## Option 1: Pre-built React Widget

The fastest way to get started is using our pre-built chat widget:

```tsx
import React from 'react';
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <div style={{ height: '600px' }}>
      <ChatWidget
        agentCard="https://api.example.com/.well-known/agent-card.json"
        userId="user-123"
        userName="John Doe"
        welcomeMessage="Hello! How can I help you today?"
      />
    </div>
  );
}

export default App;
```

That's it! You now have a fully functional chat interface.

## Option 2: React Hook for Custom UI

If you want more control over the UI, use the `useA2A` hook:

```tsx
import React from 'react';
import { useA2A } from '@microsoft/a2achat-core/react';

function CustomChat() {
  const { messages, sendMessage, isLoading, error } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent-card.json',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = e.target.message;
    sendMessage(input.value);
    input.value = '';
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div>Agent is typing...</div>}
      </div>

      <form onSubmit={handleSubmit}>
        <input name="message" type="text" placeholder="Type a message..." disabled={isLoading} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>

      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

## Option 3: Direct Client Usage (Library Agnostic)

Use the A2AClient directly for maximum flexibility:

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

// Initialize the client
const client = new A2AClient({
  agentCard: {
    url: 'https://api.example.com',
    name: 'My Agent',
    description: 'A helpful AI assistant',
    capabilities: {
      streaming: true,
      authentication: false,
    },
  },
});

// Send a message and handle streaming response
async function chat() {
  const message = {
    role: 'user' as const,
    content: 'Hello, how are you?',
  };

  try {
    // Stream the response
    for await (const task of client.message.stream({ message })) {
      console.log('Task state:', task.state);

      // Display messages as they arrive
      task.messages.forEach((msg) => {
        console.log(`${msg.role}: ${msg.content}`);
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
  }
}

chat();
```

## Option 4: Vanilla JavaScript

A2A Chat works great with vanilla JavaScript too:

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://unpkg.com/@microsoft/a2achat-core/dist/index.js"></script>
  </head>
  <body>
    <div id="messages"></div>
    <input type="text" id="input" placeholder="Type a message..." />
    <button onclick="sendMessage()">Send</button>

    <script>
      const client = new A2AChat.A2AClient({
        agentCard: 'https://api.example.com/.well-known/agent-card.json',
      });

      async function sendMessage() {
        const input = document.getElementById('input');
        const messagesDiv = document.getElementById('messages');

        const message = {
          role: 'user',
          content: input.value,
        };

        // Display user message
        messagesDiv.innerHTML += `<div>You: ${input.value}</div>`;
        input.value = '';

        // Get agent response
        for await (const task of client.message.stream({ message })) {
          const lastMessage = task.messages[task.messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            messagesDiv.innerHTML += `<div>Agent: ${lastMessage.content}</div>`;
          }
        }
      }
    </script>
  </body>
</html>
```

## Next Steps

Now that you have a basic chat interface working:

1. **[Learn the Concepts](./concepts)** - Understand how A2A protocol works
2. **[Explore Authentication](../advanced/authentication)** - Add auth to your chat
3. **[Customize the UI](../customization/theming)** - Make it match your brand
4. **[Handle Files](../advanced/file-uploads)** - Enable file uploads
5. **[View More Examples](../examples/basic-chat)** - See advanced use cases

## Common Patterns

### Error Handling

Always handle errors gracefully:

```typescript
try {
  for await (const task of client.message.stream({ message })) {
    // Handle updates
  }
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    // Handle authentication
  } else if (error.code === 'RATE_LIMITED') {
    // Handle rate limiting
  } else {
    // Generic error handling
  }
}
```

### Loading States

Show loading indicators during streaming:

```tsx
const { messages, isLoading, sendMessage } = useA2A({ agentCard });

return (
  <>
    {messages.map((msg, i) => (
      <Message key={i} {...msg} />
    ))}
    {isLoading && <LoadingIndicator />}
  </>
);
```

### Message Formatting

Messages can contain rich content:

```typescript
const message = {
  role: 'user',
  content: [
    { type: 'text', content: 'Hello' },
    { type: 'file', filename: 'data.csv', mimeType: 'text/csv', data: '...' },
  ],
};
```

## Tips

- Always provide a container height for the ChatWidget
- Import styles when using React components
- Handle authentication requirements in production
- Use TypeScript for better type safety
- Test with different agent cards during development
