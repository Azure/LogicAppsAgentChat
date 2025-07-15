---
sidebar_position: 1
---

# Basic Chat Example

A complete example of implementing a basic chat interface with A2A Chat.

## Simple Chat Widget

The easiest way to add chat to your application:

```tsx
import React from 'react';
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <div className="app">
      <h1>My Application</h1>

      <div style={{ height: '600px', maxWidth: '800px', margin: '0 auto' }}>
        <ChatWidget
          agentCard="https://api.example.com/.well-known/agent.json"
          userName="John Doe"
          welcomeMessage="Hello! How can I help you today?"
        />
      </div>
    </div>
  );
}

export default App;
```

## Custom Chat with Hook

Build a custom UI using the `useA2A` hook:

```tsx
import React, { useState } from 'react';
import { useA2A } from '@microsoft/a2achat-core/react';
import './Chat.css';

function CustomChat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading, error, clearMessages } = useA2A({
    agentCard: 'https://api.example.com/.well-known/agent.json',
    welcomeMessage: 'Welcome! Ask me anything.',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="custom-chat">
      <div className="chat-header">
        <h2>AI Assistant</h2>
        <button onClick={clearMessages}>Clear</button>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-role">{message.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="message-content">
              {message.content.map((part, i) => (
                <span key={i}>{part.type === 'text' && part.content}</span>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {error && <div className="error-message">Error: {error.message}</div>}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default CustomChat;
```

### CSS for Custom Chat

```css
/* Chat.css */
.custom-chat {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fff;
}

.message {
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-in;
}

.message.user {
  text-align: right;
}

.message-role {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.message-content {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 16px;
  max-width: 70%;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #007bff;
  color: white;
}

.message.assistant .message-content {
  background: #f1f1f1;
  color: #333;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-input {
  display: flex;
  padding: 16px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
}

.chat-input input {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
}

.chat-input button {
  margin-left: 8px;
  padding: 8px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 8px 16px;
  border-radius: 4px;
  margin: 8px 0;
}
```

## Vanilla JavaScript Example

Using A2A Chat without React:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>A2A Chat Example</title>
    <style>
      #chat-container {
        max-width: 800px;
        height: 600px;
        margin: 50px auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
      }

      #messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f9f9f9;
      }

      .message {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 8px;
      }

      .user-message {
        background: #007bff;
        color: white;
        margin-left: 20%;
        text-align: right;
      }

      .assistant-message {
        background: #e9e9e9;
        margin-right: 20%;
      }

      #input-area {
        display: flex;
        padding: 10px;
        background: white;
        border-top: 1px solid #ddd;
      }

      #message-input {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-right: 10px;
      }

      #send-button {
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      #send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .loading {
        text-align: center;
        color: #666;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div id="chat-container">
      <div id="messages"></div>
      <div id="input-area">
        <input
          type="text"
          id="message-input"
          placeholder="Type your message..."
          autocomplete="off"
        />
        <button id="send-button">Send</button>
      </div>
    </div>

    <script type="module">
      import { A2AClient } from 'https://unpkg.com/@microsoft/a2achat-core/dist/index.js';

      // Initialize client
      const client = new A2AClient({
        agentCard: 'https://api.example.com/.well-known/agent.json',
      });

      // DOM elements
      const messagesDiv = document.getElementById('messages');
      const messageInput = document.getElementById('message-input');
      const sendButton = document.getElementById('send-button');

      // Add message to chat
      function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.textContent = content;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      // Show loading indicator
      function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.id = 'loading';
        loadingDiv.textContent = 'Assistant is typing...';
        messagesDiv.appendChild(loadingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      // Remove loading indicator
      function hideLoading() {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
          loadingDiv.remove();
        }
      }

      // Send message
      async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage('user', text);
        messageInput.value = '';

        // Disable input
        messageInput.disabled = true;
        sendButton.disabled = true;
        showLoading();

        try {
          // Create message
          const message = {
            role: 'user',
            content: [{ type: 'text', content: text }],
          };

          // Stream response
          for await (const task of client.message.stream({ message })) {
            // Remove loading on first update
            hideLoading();

            // Get latest assistant message
            const assistantMessages = task.messages.filter((m) => m.role === 'assistant');
            const latestMessage = assistantMessages[assistantMessages.length - 1];

            if (latestMessage) {
              // Update or add assistant message
              const existingMessage = document.querySelector('.assistant-message:last-child');
              const content = latestMessage.content
                .filter((c) => c.type === 'text')
                .map((c) => c.content)
                .join('');

              if (
                existingMessage &&
                !existingMessage.previousElementSibling?.classList.contains('user-message')
              ) {
                existingMessage.textContent = content;
              } else {
                addMessage('assistant', content);
              }
            }
          }
        } catch (error) {
          hideLoading();
          addMessage('assistant', `Error: ${error.message}`);
        } finally {
          // Re-enable input
          messageInput.disabled = false;
          sendButton.disabled = false;
          messageInput.focus();
        }
      }

      // Event listeners
      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Focus input on load
      messageInput.focus();

      // Add welcome message
      addMessage('assistant', 'Hello! How can I help you today?');
    </script>
  </body>
</html>
```

## Node.js CLI Example

Create a command-line chat interface:

```javascript
// cli-chat.js
import { A2AClient } from '@microsoft/a2achat-core';
import readline from 'readline';
import chalk from 'chalk';

// Initialize client
const client = new A2AClient({
  agentCard: process.env.AGENT_CARD_URL || 'https://api.example.com/.well-known/agent.json',
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.blue('You> '),
});

// Welcome message
console.log(chalk.green('🤖 AI Assistant'));
console.log(chalk.gray('Type "exit" to quit, "clear" to clear screen\n'));

// Handle user input
rl.prompt();

rl.on('line', async (input) => {
  const text = input.trim();

  // Handle commands
  if (text === 'exit') {
    console.log(chalk.yellow('\nGoodbye!'));
    process.exit(0);
  }

  if (text === 'clear') {
    console.clear();
    rl.prompt();
    return;
  }

  if (!text) {
    rl.prompt();
    return;
  }

  try {
    // Show thinking indicator
    process.stdout.write(chalk.gray('\nAssistant is thinking'));

    const thinkingInterval = setInterval(() => {
      process.stdout.write(chalk.gray('.'));
    }, 500);

    // Create message
    const message = {
      role: 'user',
      content: [{ type: 'text', content: text }],
    };

    // Stream response
    let responseText = '';
    for await (const task of client.message.stream({ message })) {
      const assistantMessages = task.messages.filter((m) => m.role === 'assistant');
      const latestMessage = assistantMessages[assistantMessages.length - 1];

      if (latestMessage) {
        const newText = latestMessage.content
          .filter((c) => c.type === 'text')
          .map((c) => c.content)
          .join('');

        // Clear thinking indicator on first response
        if (responseText === '') {
          clearInterval(thinkingInterval);
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write('\n' + chalk.green('Assistant> '));
        }

        // Show incremental updates
        const increment = newText.slice(responseText.length);
        process.stdout.write(increment);
        responseText = newText;
      }
    }

    console.log('\n');
  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
  }

  rl.prompt();
});

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nGoodbye!'));
  process.exit(0);
});
```

## Integration Tips

### 1. Error Handling

Always handle errors gracefully:

```typescript
const { error, retryLastMessage } = useA2A({ agentCard });

if (error) {
  return (
    <div className="error-state">
      <p>Something went wrong: {error.message}</p>
      <button onClick={retryLastMessage}>Try Again</button>
    </div>
  );
}
```

### 2. Loading States

Show appropriate loading indicators:

```typescript
{isLoading && (
  <div className="loading-overlay">
    <Spinner size="large" />
    <p>Processing your request...</p>
  </div>
)}
```

### 3. Message Persistence

Enable message persistence across sessions:

```typescript
const { messages } = useA2A({
  agentCard,
  sessionKey: `chat-${userId}`, // Unique per user
});
```

### 4. Responsive Design

Make the chat responsive:

```css
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
}
```

## Next Steps

- [Custom UI Example](./custom-ui) - Build advanced custom interfaces
- [Multi-Session Example](./multi-session) - Handle multiple chat sessions
- [Vue Integration](./vue-integration) - Use with Vue.js
- [Authentication](../advanced/authentication) - Add authentication
