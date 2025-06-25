# @microsoft/a2achat

A lightweight, customizable chat interface library that can be distributed via NPM and embedded as an iframe.

## Features

- 🚀 **Small bundle size**: ~45KB limit with React as peer dependency
- 📦 **Dual distribution**: NPM package + iframe embed
- 🎨 **Fully customizable**: CSS variables for runtime theming
- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- ⚛️ **React 18+ compatible**: Works seamlessly with modern React applications
- 🤖 **A2A Protocol Support**: Built-in integration with A2A-compliant agents
- ✅ **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Well tested**: Comprehensive test suite with Vitest
- 🔄 **CI/CD**: Automated testing and builds with GitHub Actions

## Installation

```bash
npm install @microsoft/a2achat
```

## Usage

### As NPM Package

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import '@microsoft/a2achat/styles.css';

function App() {
  return (
    <ChatWindow
      agentCard="https://my-a2a-agent.example.com/agent.json"  // URL to agent card
      theme={{
        colors: {
          primary: '#0066cc',
          primaryText: '#ffffff',
          background: '#f5f5f5'
        },
        branding: {
          logoUrl: 'https://example.com/logo.png',
          logoSize: 'medium',
          logoPosition: 'header'
        }
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

#### Using Hardcoded Agent Card

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat';
import type { AgentCard } from '@microsoft/a2achat';

const agentCard: AgentCard = {
  name: "My Assistant",
  version: "1.0.0",
  description: "A helpful AI assistant",
  url: "https://agent.example.com/rpc",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true
  },
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"]
};

function App() {
  return (
    <ChatWindow
      agentCard={agentCard}  // Pass agent card object directly
      theme={{
        colors: {
          primary: '#0066cc'
        }
      }}
    />
  );
}
```

### As iFrame

```html
<iframe 
  src="https://cdn.example.com/chat-widget/index.html"
  data-agent-card="https://my-a2a-agent.example.com/agent.json"
  data-theme-primary="#0066cc"
  data-theme-background="#f5f5f5"
  data-logo-url="https://example.com/logo.png"
  data-logo-size="medium"
  data-logo-position="header"
  data-welcome-message="Hello! How can I help you today?"
  data-allow-file-upload="true"
  data-max-file-size="10485760"
  style="width: 400px; height: 600px; border: none;"
/>
```

#### iFrame with Hardcoded Agent Card

For hardcoded agent card configurations, use postMessage:

```html
<iframe 
  id="chat-iframe"
  src="https://cdn.example.com/chat-widget/index.html?expectPostMessage=true"
  style="width: 400px; height: 600px; border: none;"
/>

<script>
const agentCard = {
  name: "My Assistant",
  version: "1.0.0",
  url: "https://agent.example.com/rpc",
  capabilities: { streaming: true }
};

// Wait for iframe to be ready
window.addEventListener('message', function(event) {
  if (event.data?.type === 'IFRAME_READY') {
    document.getElementById('chat-iframe').contentWindow.postMessage({
      type: 'SET_AGENT_CARD',
      agentCard: agentCard
    }, '*');
  }
});
</script>
```

#### iFrame Data Attributes

All configuration options can be passed via `data-*` attributes:

- `data-agent-card`: Agent card URL (required unless using postMessage)
- `data-theme-*`: Theme customization (e.g., `data-theme-primary`, `data-theme-background`)
- `data-logo-url`: Company logo URL
- `data-logo-size`: Logo size (small, medium, large)
- `data-logo-position`: Logo position (header, footer)
- `data-welcome-message`: Initial welcome message
- `data-allow-file-upload`: Enable file uploads (true/false)
- `data-max-file-size`: Maximum file size in bytes
- `data-placeholder`: Input placeholder text

## Development

### Prerequisites

- Node.js 18+ or 20+
- npm 7+

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint

# Build library
npm run build:lib

# Build iframe version
npm run build:iframe

# Build demo site
npm run build:demo

# Build all distributions
npm run build
```

### CI/CD

This project uses GitHub Actions for continuous integration. On every push to `main` and on pull requests:

- Runs TypeScript type checking
- Runs ESLint for code quality
- Runs full test suite
- Builds all distributions
- Checks bundle size limits

The CI workflow tests against Node.js 18.x and 20.x to ensure compatibility.

## Configuration

### Theme Options

```typescript
interface ChatTheme {
  colors: {
    primary: string;
    primaryText: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
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
    unit: number;
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
  };
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `agentCard` | `string \| AgentCard` | Agent card URL or object (required) |
| `theme` | `Partial<ChatTheme>` | Custom theme configuration |
| `userId` | `string` | User identifier |
| `metadata` | `Record<string, any>` | Additional metadata |
| `placeholder` | `string` | Input placeholder text |
| `welcomeMessage` | `string` | Initial welcome message |
| `allowFileUpload` | `boolean` | Enable file uploads |
| `maxFileSize` | `number` | Max file size in bytes |
| `allowedFileTypes` | `string[]` | Allowed file types |
| `onMessage` | `(message: Message) => void` | Message callback |
| `onConnectionChange` | `(connected: boolean) => void` | Connection status callback |

## A2A Protocol Support

This library includes built-in support for the A2A (Agent-to-Agent) protocol, enabling seamless integration with AI agents. When using an A2A agent:

- **Streaming Support**: Real-time message streaming with Server-Sent Events (SSE)
- **Task Management**: Track and manage long-running tasks
- **Artifact Support**: Handle code snippets and structured data from agents
- **Status Updates**: Real-time progress updates for agent operations

### Using with A2A Agents

```tsx
// Using agent card URL
<ChatWindow
  agentCard="https://my-a2a-agent.example.com/agent.json"
  // The library automatically fetches the agent card,
  // detects capabilities, and enables streaming if supported
/>

// Using hardcoded agent card
<ChatWindow
  agentCard={{
    name: "My Agent",
    url: "https://agent.example.com/rpc",
    capabilities: { streaming: true }
  }}
/>
```

## Bundle Size

The library is optimized for small bundle size:

- **Library**: ~45KB (gzipped, excluding React)
- **Styles**: ~5KB (gzipped)
- **Total**: ~50KB with all features enabled

Bundle size is monitored in CI to prevent regression.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/components/ChatWindow/ChatWindow.test.tsx

# Run with coverage
npm run test:coverage
```

### Code Quality

- All code must pass TypeScript type checking
- ESLint rules must be followed
- Tests must pass with 100% success rate
- New features should include tests

## License

MIT