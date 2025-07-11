# On-Behalf-Of (OBO) Authentication in A2A Chat

## Overview

The A2A protocol supports On-Behalf-Of (OBO) authentication, which allows agents to request user consent for performing actions on their behalf. This is typically used when an agent needs to access external services or APIs that require user authorization.

The A2A Chat SDK includes a built-in authentication UI that automatically handles OBO authentication flows, making it easy to integrate without custom implementation.

## How It Works

1. **Auth Required Event**: During a streaming session, the server may send an `auth-required` message containing a consent link.
2. **User Consent**: The application opens the consent link in a popup window where the user can authorize the action.
3. **Authentication Completed**: After the user completes the consent flow and the popup closes, the application sends an `AuthenticationCompleted` message.
4. **Stream Resumes**: The server receives the completion message and resumes the original task.

## Implementation

### Option 1: Use the Built-in UI (Recommended)

The easiest way to handle OBO authentication is to use the built-in UI that comes with ChatWidget and ChatWindow components:

```typescript
import { ChatWidget } from '@a2a/browser-sdk/react';

function App() {
  return (
    <ChatWidget
      agentCard="https://example.com/agent-card"
      // Authentication UI is automatically shown when needed
      // No additional configuration required!
    />
  );
}
```

The built-in UI features:

- Clean, integrated design that matches your chat theme
- Support for multiple service authentications
- Progress tracking for multi-service auth flows
- Automatic popup window management
- Clear error messages and retry capabilities

### Option 2: Custom Auth Handler

If you need custom behavior, you can provide your own auth handler:

```typescript
import { openPopupWindow } from '@a2a/browser-sdk';
import type { AuthRequiredHandler } from '@a2a/browser-sdk';

const handleAuthRequired: AuthRequiredHandler = async (event) => {
  console.log('Authentication required:', event);

  try {
    // Open consent link in popup
    const result = await openPopupWindow(event.consentLink, 'a2a-consent', {
      width: 800,
      height: 600,
    });

    if (result.error) {
      throw result.error;
    }

    console.log('Authentication completed');
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};
```

### 2. Configure the Client

Pass the auth handler when creating the A2A client:

```typescript
const client = new A2AClient({
  agentCard,
  onAuthRequired: handleAuthRequired,
});
```

### 3. Using with React Hooks

```typescript
import { useA2A } from '@a2a/browser-sdk';

function ChatComponent() {
  const { sendMessage, sendAuthenticationCompleted, contextId } = useA2A({
    onAuthRequired: async (event) => {
      try {
        // Open popup
        const result = await openPopupWindow(event.consentLink);

        if (result.closed && !result.error) {
          // Send completion message
          await sendAuthenticationCompleted();
        }
      } catch (error) {
        console.error('Auth failed:', error);
      }
    },
  });

  // Your component logic...
}
```

### 4. Using with ChatWidget

```typescript
import { useChatWidget } from '@a2a/browser-sdk';

function App() {
  const chatWidget = useChatWidget({
    agentCard: 'https://example.com/agent-card',
    onAuthRequired: async (event) => {
      // Handle authentication
      const result = await openPopupWindow(event.consentLink);

      if (result.closed && !result.error) {
        await chatWidget.sendAuthenticationCompleted();
      }
    },
  });

  return <ChatWidget {...chatWidget} />;
}
```

## Multiple Service Authentication

The OBO authentication system supports requiring authentication with multiple services in a single flow. The built-in UI handles this automatically:

1. **Multiple Auth Parts**: The server can send multiple authentication requirements in one message
2. **Progress Tracking**: The UI shows progress as users authenticate with each service
3. **All-or-Nothing**: The `AuthenticationCompleted` message is only sent after ALL services are authenticated
4. **Individual Service Info**: Each service can have its own name, icon, and description

Example of multiple services in the UI:

- Microsoft Teams - "Access your Teams channels and messages"
- SharePoint - "Read and write documents in your SharePoint sites"
- Outlook - "Send emails on your behalf"

The user must authenticate with all three services before the agent can proceed.

## Auth Required Message Format

The server sends an auth-required message in this format:

```json
{
  "jsonrpc": "2.0",
  "id": "1752215042384",
  "result": {
    "taskId": "08584493918424536088421696301_08584493918569303124972102841CU00",
    "contextId": "08584493918569303124972102841CU00",
    "status": {
      "state": "AuthRequired",
      "message": {
        "messageId": "3c03f5ad80af4ee881fde94426f6b4b9",
        "role": "Agent",
        "parts": [
          {
            "data": {
              "messageType": "InTaskAuthRequired",
              "consentLink": {
                "link": "https://example.com/consent?data=...",
                "status": "Unauthenticated"
              }
            },
            "kind": "Data"
          }
        ],
        "kind": "auth-required"
      },
      "timestamp": "2025-07-11T06:24:04.6701752Z"
    },
    "kind": "auth-required",
    "final": true
  }
}
```

## Authentication Completed Message

After successful authentication, the client sends a regular user message with a special data part. This is sent using the same SSE streaming method as normal messages:

```json
{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "kind": "message",
      "messageId": "5487beb8-2a3f-44db-991e-6e08d2099320",
      "role": "user",
      "parts": [
        {
          "kind": "data",
          "data": {
            "messageType": "AuthenticationCompleted"
          }
        }
      ],
      "contextId": "08584493918569303124972102841CU00"
    },
    "configuration": {
      "acceptedOutputModes": ["text"]
    }
  },
  "id": 1752215042384
}
```

## Best Practices

1. **Handle Popup Blockers**: Always check if the popup opened successfully and provide fallback UI.
2. **Timeout Handling**: Set a reasonable timeout (e.g., 10 minutes) for the authentication flow.
3. **Error Messages**: Provide clear error messages when authentication fails.
4. **Loading States**: Show appropriate loading indicators during the authentication process.
5. **Context Preservation**: Ensure the context ID is preserved throughout the authentication flow.

## Security Considerations

1. **Validate URLs**: Always validate that consent links come from trusted sources.
2. **HTTPS Only**: Ensure all authentication flows use HTTPS.
3. **Same-Origin Policy**: Be aware of browser security restrictions when dealing with popups.
4. **Token Handling**: Never log or expose authentication tokens in console output.

## Troubleshooting

### Popup Blocked

If the popup is blocked, catch the error and show a message:

```typescript
try {
  await openPopupWindow(url);
} catch (error) {
  if (error.message.includes('popup blocker')) {
    alert('Please allow popups for this site to continue with authentication.');
  }
}
```

### Authentication Timeout

If authentication times out, the popup is automatically closed:

```typescript
const result = await openPopupWindow(url, 'auth', {
  // 10 minute timeout
  timeout: 10 * 60 * 1000,
});

if (result.error?.message.includes('timeout')) {
  console.error('Authentication timed out');
}
```

### Cross-Origin Issues

The popup window utility handles cross-origin checks safely. You don't need to worry about accessing the popup's content - just wait for it to close.
