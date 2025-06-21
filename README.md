# @microsoft/a2achat

A lightweight, customizable chat interface library that can be distributed via NPM and embedded as an iframe.

## Features

- 🚀 **Small bundle size**: React as peer dependency
- 📦 **Dual distribution**: NPM package + iframe embed
- 🎨 **Fully customizable**: CSS variables for runtime theming
- 📝 **Markdown support**: Rich text formatting for messages
- 📎 **File uploads**: Built-in file attachment support
- 🏢 **Company branding**: Add your logo to the chat interface
- ⚛️ **React compatible**: Works seamlessly with React applications
- 🤖 **A2A Protocol Support**: Built-in integration with A2A-compliant agents

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
      serverUrl="wss://chat.example.com"
      // Optional: Use A2A agent instead of WebSocket
      agentUrl="https://my-a2a-agent.example.com"
      theme={{
        colors: {
          primary: '#0066cc'
        },
        branding: {
          logoUrl: 'https://example.com/logo.png',
          logoSize: 'medium',
          logoPosition: 'header'
        }
      }}
      welcomeMessage="Hello! How can I help you today?"
      allowFileUpload={true}
    />
  );
}
```

### As iFrame

```html
<iframe 
  src="https://cdn.example.com/chat-widget/index.html"
  data-server-url="wss://chat.example.com"
  data-theme-primary="#0066cc"
  data-logo-url="https://example.com/logo.png"
  data-logo-position="header"
  style="width: 400px; height: 600px; border: none;"
/>
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build library
npm run build:lib

# Build iframe version
npm run build:iframe

# Build both
npm run build
```

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
| `serverUrl` | `string` | WebSocket server URL (required) |
| `agentUrl` | `string` | Optional A2A agent URL for AI-powered chat |
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

## License

MIT