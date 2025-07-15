---
sidebar_position: 4
---

# Iframe Widget

The A2A Chat iframe widget allows you to embed a chat interface into any website with just a few lines of code. It's perfect for adding chat functionality to existing websites without modifying your build process.

## Quick Start

Add this code to your website:

```html
<iframe
  src="https://your-domain.com/chat/iframe?agentCard=https://api.example.com/.well-known/agent.json"
  width="400"
  height="600"
  frameborder="0"
></iframe>
```

## Deployment Options

### Option 1: Use Our Hosted Widget

```html
<iframe
  src="https://a2achat.azurewebsites.net/iframe?agentCard=YOUR_AGENT_CARD_URL"
  width="400"
  height="600"
  frameborder="0"
></iframe>
```

### Option 2: Self-Host the Widget

1. Build the iframe app:

```bash
cd apps/iframe-app
npm run build
```

2. Deploy the `dist` folder to your server

3. Embed using your domain:

```html
<iframe src="https://your-domain.com/iframe.html?agentCard=..." />
```

## Configuration

### URL Parameters

Configure the widget using URL parameters:

```html
<iframe
  src="https://chat.example.com/iframe?
  agentCard=https://api.example.com/.well-known/agent.json&
  userId=user-123&
  userName=John%20Doe&
  theme=blue&
  multiSession=true&
  welcomeMessage=Hello!%20How%20can%20I%20help%3F"
/>
```

Available parameters:

| Parameter         | Type    | Description                                   |
| ----------------- | ------- | --------------------------------------------- |
| `agentCard`       | string  | Required. URL to agent card or agent endpoint |
| `userId`          | string  | User identifier                               |
| `userName`        | string  | User display name                             |
| `theme`           | string  | Color theme (default, blue, green, etc.)      |
| `placeholder`     | string  | Input placeholder text                        |
| `welcomeMessage`  | string  | Initial bot message                           |
| `multiSession`    | boolean | Enable multi-session support                  |
| `allowFileUpload` | boolean | Enable file uploads                           |
| `metadata`        | string  | JSON metadata object                          |

### Data Attributes

For static configuration, use data attributes:

```html
<iframe
  src="https://chat.example.com/iframe"
  data-agent-card="https://api.example.com/.well-known/agent.json"
  data-user-id="user-123"
  data-user-name="John Doe"
  data-theme-primary="#6200ea"
  data-theme-background="#ffffff"
  data-placeholder="Ask me anything..."
  data-welcome-message="Welcome! How can I help?"
  data-multi-session="true"
  width="400"
  height="600"
></iframe>
```

## Advanced Integration

### Dynamic Configuration with PostMessage

Send configuration dynamically using postMessage:

```html
<iframe id="chat-frame" src="https://chat.example.com/iframe?expectPostMessage=true"></iframe>

<script>
  const iframe = document.getElementById('chat-frame');

  // Wait for iframe to be ready
  window.addEventListener('message', (event) => {
    if (event.data.type === 'IFRAME_READY') {
      // Send agent card configuration
      iframe.contentWindow.postMessage(
        {
          type: 'SET_AGENT_CARD',
          agentCard: {
            url: 'https://api.example.com',
            name: 'Support Bot',
            description: 'Customer support assistant',
            capabilities: {
              streaming: true,
              authentication: true,
            },
          },
        },
        '*'
      );
    }

    if (event.data.type === 'AGENT_CARD_RECEIVED') {
      console.log('Configuration accepted');
    }
  });
</script>
```

### Responsive Iframe

Make the iframe responsive:

```html
<style>
  .chat-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    height: 600px;
  }

  .chat-iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .chat-container {
      position: fixed;
      bottom: 0;
      right: 0;
      left: 0;
      max-width: 100%;
      height: 100vh;
      z-index: 9999;
    }
  }
</style>

<div class="chat-container">
  <iframe class="chat-iframe" src="https://chat.example.com/iframe?agentCard=..."></iframe>
</div>
```

### Floating Chat Button

Create a floating chat button that opens the iframe:

```html
<style>
  .chat-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #6200ea;
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    z-index: 9998;
  }

  .chat-popup {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 380px;
    height: 600px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    display: none;
    z-index: 9999;
  }

  .chat-popup.open {
    display: block;
  }

  .chat-popup iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
</style>

<button class="chat-button" onclick="toggleChat()">💬</button>

<div class="chat-popup" id="chatPopup">
  <iframe src="https://chat.example.com/iframe?agentCard=..."></iframe>
</div>

<script>
  function toggleChat() {
    const popup = document.getElementById('chatPopup');
    popup.classList.toggle('open');
  }
</script>
```

## Theming

### Pre-defined Themes

Use the `theme` parameter for quick theming:

```html
<!-- Blue theme -->
<iframe src="...?theme=blue" />

<!-- Green theme -->
<iframe src="...?theme=green" />

<!-- Purple theme -->
<iframe src="...?theme=purple" />
```

Available themes:

- `default` - Purple accent
- `blue` - Blue accent
- `green` - Green accent
- `red` - Red accent
- `purple` - Purple accent
- `teal` - Teal accent
- `orange` - Orange accent
- `pink` - Pink accent

### Custom Colors

Use data attributes for custom colors:

```html
<iframe
  src="https://chat.example.com/iframe"
  data-agent-card="..."
  data-theme-primary="#ff5722"
  data-theme-background="#fafafa"
  width="400"
  height="600"
></iframe>
```

### Complete Theme Object

Pass a complete theme via URL parameter:

```javascript
const theme = {
  colors: {
    primary: '#6200ea',
    primaryText: '#ffffff',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
  },
};

const themeParam = encodeURIComponent(JSON.stringify(theme));
const iframeSrc = `https://chat.example.com/iframe?agentCard=...&theme=${themeParam}`;
```

## Security Considerations

### Content Security Policy

Add appropriate CSP headers:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  frame-src https://chat.example.com https://api.example.com;
  connect-src https://api.example.com;
"
/>
```

### Sandbox Attributes

Use sandbox attributes for additional security:

```html
<iframe
  src="https://chat.example.com/iframe?agentCard=..."
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  width="400"
  height="600"
></iframe>
```

### CORS Configuration

Ensure your agent endpoint has proper CORS headers:

```
Access-Control-Allow-Origin: https://chat.example.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Multi-Session Support

Enable multi-session chat with session management:

```html
<iframe
  src="https://chat.example.com/iframe?agentCard=...&multiSession=true"
  width="600"
  height="700"
></iframe>
```

This enables:

- Multiple concurrent conversations
- Session switching
- Session history
- Persistent sessions

## Authentication

### Basic Authentication

Pass authentication tokens via metadata:

```javascript
const metadata = {
  authToken: 'user-auth-token',
  sessionId: 'unique-session-id',
};

const metadataParam = encodeURIComponent(JSON.stringify(metadata));
```

```html
<iframe src="...?metadata=${metadataParam}" />
```

### OAuth Flow

Handle OAuth authentication with popup windows:

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.data.type === 'AUTH_REQUIRED') {
      // Open OAuth popup
      const authWindow = window.open(event.data.authUrl, 'auth', 'width=600,height=700');

      // Check when auth is complete
      const checkAuth = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          // Notify iframe
          iframe.contentWindow.postMessage(
            {
              type: 'AUTH_COMPLETE',
            },
            '*'
          );
        }
      }, 500);
    }
  });
</script>
```

## Analytics Integration

Track chat events:

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://chat.example.com') return;

    switch (event.data.type) {
      case 'CHAT_STARTED':
        analytics.track('Chat Started', {
          agentName: event.data.agentName,
        });
        break;

      case 'MESSAGE_SENT':
        analytics.track('Message Sent', {
          messageType: event.data.messageType,
        });
        break;

      case 'CHAT_ENDED':
        analytics.track('Chat Ended', {
          duration: event.data.duration,
          messageCount: event.data.messageCount,
        });
        break;
    }
  });
</script>
```

## Troubleshooting

### Common Issues

1. **Iframe not loading**
   - Check agent card URL is accessible
   - Verify CORS headers
   - Check browser console for errors

2. **Styling issues**
   - Ensure iframe has explicit width/height
   - Check for CSS conflicts
   - Verify theme parameters

3. **Authentication errors**
   - Verify auth tokens are valid
   - Check CORS allows credentials
   - Ensure popup blockers are disabled

### Debug Mode

Enable debug logging:

```html
<iframe src="...?debug=true" />
```

View logs in browser console.

## Examples

### E-commerce Integration

```html
<!-- Product page chat -->
<div class="product-chat">
  <h3>Need help with this product?</h3>
  <iframe
    src="https://chat.example.com/iframe"
    data-agent-card="https://api.example.com/product-agent"
    data-metadata='{"productId": "12345", "category": "electronics"}'
    width="350"
    height="500"
  ></iframe>
</div>
```

### Support Portal

```html
<!-- Full-page support chat -->
<style>
  .support-chat {
    width: 100%;
    height: calc(100vh - 60px);
  }
</style>

<div class="support-container">
  <iframe
    class="support-chat"
    src="https://chat.example.com/iframe?
      agentCard=https://api.example.com/support-agent&
      multiSession=true&
      userName=<%= user.name %>&
      userId=<%= user.id %>"
  ></iframe>
</div>
```

## Next Steps

- [Examples](../examples/basic-chat) - See iframe implementations
- [Theming](../customization/theming) - Advanced theming options
- [Deployment](../advanced/deployment) - Production deployment guide
- [Security](../advanced/security) - Security best practices
