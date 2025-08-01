# Server-Side Chat History

The A2A Chat SDK uses server-side chat history storage by default, allowing users to maintain their conversation history across devices and browser sessions. Browser-based storage (localStorage/IndexedDB) is no longer used.

## How It Works

Server-side history is automatically enabled for all chat instances:

- When the chat connects, it automatically calls `contexts/list` API with `includeLastTask=true`
- The most recent non-archived context is loaded with its message history
- All new messages are associated with the current context
- Context IDs are managed entirely by the server

## Using the Chat Widget

### Standard ChatWidget

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';

function App() {
  return (
    <ChatWidget
      agentCard="https://api.example.com/agent"
      auth={{ type: 'bearer', token: 'your-token' }}
    />
  );
}
```

### Multi-Session Chat

For applications that need conversation management UI:

```tsx
import { MultiSessionChat } from '@microsoft/a2achat-core/react';

function App() {
  return (
    <MultiSessionChat
      config={{
        apiUrl: 'https://api.example.com/agent',
        apiKey: 'your-api-key',
      }}
    />
  );
}
```

## Required Server APIs

Your server must implement these JSON-RPC 2.0 endpoints:

### 1. List Contexts

```json
// Request
POST /api/agents/YourAgent
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "contexts/list",
  "params": {
    "limit": 20,
    "includeLastTask": true
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": [
    {
      "id": "ctx_123",
      "name": "Weather Discussion",
      "isArchived": false,
      "lastTask": { /* task data */ }
    }
  ]
}
```

### 2. List Tasks

```json
// Request
POST /api/agents/YourAgent
{
  "jsonrpc": "2.0",
  "id": "124",
  "method": "tasks/list",
  "params": {
    "Id": "ctx_123"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "124",
  "result": [
    {
      "id": "task_456",
      "contextId": "ctx_123",
      "history": [ /* messages */ ]
    }
  ]
}
```

### 3. Update Context

```json
// Request
POST /api/agents/YourAgent
{
  "jsonrpc": "2.0",
  "id": "125",
  "method": "contexts/update",
  "params": {
    "Id": "ctx_123",
    "Name": "New Name",
    "IsArchived": false
  }
}
```

## Technical Details

1. **Automatic Loading**: The SDK uses `A2AClientWithAutoHistory` internally, which automatically calls `contexts/list` when the client is created.

2. **Context Management**: The SDK maintains the current context ID and includes it in all message requests:

   ```json
   {
     "message": {
       /* message content */
     },
     "context": {
       "contextId": "ctx_123"
     }
   }
   ```

3. **New Conversations**: If no context ID exists, the server should create a new context on the first message and return the `contextId` in the response.

4. **History Loading**: The SDK loads the most recent non-archived context and displays its messages in the chat window automatically.

## Benefits

- **Cross-Device Sync**: Users can continue conversations on different devices
- **No Browser Storage**: Eliminates dependency on localStorage/IndexedDB
- **Conversation Management**: Users can rename and archive conversations
- **Improved Privacy**: History is stored securely on the server

## Migration Notes

- Server-side history is now the default and only option
- localStorage/IndexedDB is no longer used for chat history
- Existing browser-stored data will not be migrated automatically
- The `contextId` must be returned by the server in message responses for proper association
- If the server doesn't support the history APIs, the chat will still function but without persistent history
