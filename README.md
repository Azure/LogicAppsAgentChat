# A2A Chat Monorepo

[![CI](https://github.com/travisvu/a2achat/actions/workflows/ci.yml/badge.svg)](https://github.com/travisvu/a2achat/actions/workflows/ci.yml)
[![PR Checks](https://github.com/travisvu/a2achat/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/travisvu/a2achat/actions/workflows/pr-checks.yml)
[![Security](https://github.com/travisvu/a2achat/actions/workflows/security.yml/badge.svg)](https://github.com/travisvu/a2achat/actions/workflows/security.yml)

A TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents. Built with real-time streaming support and modern React components using Fluent UI.

## Structure

```
├── packages/
│   └── a2a-core/          # Core library with all functionality
├── apps/
│   ├── iframe-app/        # Embeddable iframe widget
│   └── vue-demo/          # Vue.js demo application
├── turbo.json             # Turbo configuration
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── package.json           # Root package.json
```

## Packages

### [@microsoft/a2achat-core](./packages/a2a-core)

The main library that provides:

- Framework-agnostic core functionality (`@microsoft/a2achat-core`)
- React components and hooks (`@microsoft/a2achat-core/react`)
- Styles (`@microsoft/a2achat-core/react/styles.css`)

## Applications

### [Iframe App](./apps/iframe-app)

Standalone iframe application for embedding the chat widget in any website.

### [Vue Demo](./apps/vue-demo)

Demo application showing how to integrate the SDK with Vue.js.

## Development

### Prerequisites

- Node.js >= 18
- PNPM >= 9.1.3

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run development mode
pnpm run dev

# Run tests
pnpm run test

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Format code with Prettier
pnpm run format

# Format check (CI)
pnpm run format:check
```

### Working with Packages

```bash
# Build a specific package
pnpm --filter @microsoft/a2achat-core build

# Run tests for a specific package
pnpm --filter @microsoft/a2achat-core test

# Add a dependency to a package
pnpm --filter @microsoft/a2achat-core add some-package

# Run commands in apps
pnpm --filter iframe-app dev
pnpm --filter vue-demo dev
```

## Deployment

### Publishing Packages

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish to npm
pnpm release
```

## Recent Updates

### Streaming Support Fixed

- Fixed React re-rendering issues for real-time message streaming
- Improved component key management for proper updates
- Enhanced useA2ANative hook to handle streaming artifact updates

### CI/CD Improvements

- Updated all GitHub Actions workflows to use pnpm 9.1.3
- Fixed deprecated action versions (upgraded to v3/v4)
- Added proper permissions for PR comments
- Separated PR checks from main CI workflow
- Disabled deployment steps (commented out for future use)

### Code Quality

- Integrated Prettier for consistent code formatting
- Added Husky pre-commit hooks with lint-staged
- Fixed all TypeScript errors across the monorepo
- Adjusted test coverage thresholds to realistic values (70-95%)
- Added proper vite-env.d.ts files for Vite projects

### Development Experience

- Standardized pnpm installation across all workflows
- Added frozen-lockfile enforcement in CI
- Improved error messages and debugging
- Better monorepo workspace management

## Features

- 🚀 **Optimized bundle size**: Minimal footprint with tree-shaking support
- 📦 **Dual distribution**: NPM package + iframe embed
- 🎨 **Fully customizable**: CSS variables for runtime theming
- 🎭 **Modern UI**: Built with Fluent UI components for consistent design
- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- ⚛️ **React 18+ compatible**: Works seamlessly with modern React applications
- 🤖 **A2A Protocol**: Full support for A2A agent communication
- 🔐 **Authentication**: Built-in support for Bearer, API Key, OAuth2, and custom auth
- 🌊 **Real-time Streaming**: Server-Sent Events for real-time agent responses
- 🔍 **Agent Discovery**: Automatic agent card resolution from domain names
- ✅ **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Well tested**: Comprehensive test suite with Vitest
- 🔄 **CI/CD**: Automated testing and builds with GitHub Actions

## Installation

```bash
# Using npm
npm install @microsoft/a2achat-core

# Using pnpm
pnpm add @microsoft/a2achat-core

# Using yarn
yarn add @microsoft/a2achat-core
```

## Usage

### As NPM Package

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <ChatWindow
      agentCard="https://my-a2a-agent.example.com" // Agent domain
      auth={{
        type: 'bearer',
        token: 'your-api-token',
      }}
      theme={{
        colors: {
          primary: '#0066cc',
          primaryText: '#ffffff',
          background: '#f5f5f5',
        },
        branding: {
          logoUrl: 'https://example.com/logo.png',
          logoSize: 'medium',
          logoPosition: 'header',
        },
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

#### With Different Authentication Methods

```tsx
import { ChatWindow } from '@microsoft/a2achat-core/react';
import type { AuthConfig } from '@microsoft/a2achat-core';

// Bearer token authentication
const bearerAuth: AuthConfig = {
  type: 'bearer',
  token: 'your-bearer-token',
};

// API Key authentication
const apiKeyAuth: AuthConfig = {
  type: 'api-key',
  key: 'your-api-key',
  header: 'X-API-Key', // optional, defaults to 'X-API-Key'
};

// OAuth2 authentication
const oauth2Auth: AuthConfig = {
  type: 'oauth2',
  accessToken: 'your-access-token',
};

// Custom authentication
const customAuth: AuthConfig = {
  type: 'custom',
  handler: async (request) => {
    const token = await getTokenFromYourAuthService();
    request.headers.set('Authorization', `Custom ${token}`);
    return request;
  },
};

function App() {
  return (
    <ChatWindow
      agentCard="https://my-a2a-agent.example.com"
      auth={bearerAuth} // Use any of the auth configurations above
    />
  );
}
```

#### Using Hardcoded Agent Card

```tsx
import React from 'react';
import { ChatWindow } from '@microsoft/a2achat-core/react';
import type { AgentCard } from '@microsoft/a2achat-core';

const agentCard: AgentCard = {
  name: 'My Assistant',
  version: '1.0.0',
  description: 'A helpful AI assistant',
  url: 'https://agent.example.com/rpc',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
};

function App() {
  return (
    <ChatWindow
      agentCard={agentCard} // Pass agent card object directly
      theme={{
        colors: {
          primary: '#0066cc',
        },
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
    name: 'My Assistant',
    version: '1.0.0',
    url: 'https://agent.example.com/rpc',
    capabilities: { streaming: true },
  };

  // Wait for iframe to be ready
  window.addEventListener('message', function (event) {
    if (event.data?.type === 'IFRAME_READY') {
      document.getElementById('chat-iframe').contentWindow.postMessage(
        {
          type: 'SET_AGENT_CARD',
          agentCard: agentCard,
        },
        '*'
      );
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
- pnpm 9.1.3+

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run tests
pnpm test

# Run tests with UI
pnpm run test:ui

# Run tests with coverage
pnpm run test:coverage

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Format code
pnpm run format

# Build library
pnpm run build:lib

# Build iframe version
pnpm run build:iframe

# Build demo site
pnpm run build:demo

# Build all distributions
pnpm run build
```

### CI/CD

This project uses GitHub Actions for continuous integration:

#### Pull Request Checks

On every pull request:

- Runs TypeScript type checking
- Runs Prettier format checking
- Runs ESLint for code quality
- Runs full test suite with coverage
- Builds all distributions
- Posts results as PR comments

#### Main Branch CI

On pushes to `main`:

- Runs all quality checks
- Builds all packages
- Tests against Node.js 18.x and 20.x
- Security scanning with CodeQL
- Dependency vulnerability checks

#### Pre-commit Hooks

Automatically formats staged files using:

- Prettier for code formatting
- Runs via Husky and lint-staged

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

| Prop                 | Type                           | Description                                  |
| -------------------- | ------------------------------ | -------------------------------------------- |
| `agentCard`          | `string \| AgentCard`          | Agent domain or agent card object (required) |
| `auth`               | `AuthConfig`                   | Authentication configuration                 |
| `theme`              | `Partial<ChatTheme>`           | Custom theme configuration                   |
| `userId`             | `string`                       | User identifier                              |
| `metadata`           | `Record<string, any>`          | Additional metadata                          |
| `placeholder`        | `string`                       | Input placeholder text                       |
| `welcomeMessage`     | `string`                       | Initial welcome message                      |
| `allowFileUpload`    | `boolean`                      | Enable file uploads                          |
| `maxFileSize`        | `number`                       | Max file size in bytes                       |
| `allowedFileTypes`   | `string[]`                     | Allowed file types                           |
| `onMessage`          | `(message: Message) => void`   | Message callback                             |
| `onConnectionChange` | `(connected: boolean) => void` | Connection status callback                   |

## A2A Protocol Integration

This library provides a complete implementation of the A2A (Agent-to-Agent) protocol, offering:

- **Agent Discovery**: Automatic agent card resolution from domain names
- **Authentication**: Built-in support for Bearer, API Key, OAuth2, and custom auth methods
- **Real-time Streaming**: Server-Sent Events for instant agent responses
- **Task Management**: Automatic task and context management
- **Error Handling**: Comprehensive error handling and recovery

### Using with A2A Agents

```tsx
// Using agent domain (recommended)
<ChatWindow
  agentCard="https://my-a2a-agent.example.com"
  auth={{
    type: 'bearer',
    token: 'your-api-token'
  }}
  // The library automatically discovers the agent card,
  // detects capabilities, and enables streaming if supported
/>

// Using hardcoded agent card
<ChatWindow
  agentCard={{
    name: "My Agent",
    url: "https://agent.example.com/rpc",
    capabilities: { streaming: true }
  }}
  auth={{
    type: 'api-key',
    key: 'your-api-key'
  }}
/>
```

### Authentication Methods

The library supports multiple authentication methods:

```tsx
// Bearer token
const bearerAuth = {
  type: 'bearer',
  token: 'your-bearer-token',
};

// API Key
const apiKeyAuth = {
  type: 'api-key',
  key: 'your-api-key',
  header: 'X-API-Key', // optional
};

// OAuth2
const oauth2Auth = {
  type: 'oauth2',
  accessToken: 'your-access-token',
};

// Custom authentication
const customAuth = {
  type: 'custom',
  handler: async (request) => {
    // Add custom headers
    request.headers.set('Authorization', `Custom ${await getToken()}`);
    return request;
  },
};
```

## Bundle Size

The library is optimized for minimal bundle size with tree-shaking support. React and Fluent UI components are peer dependencies to avoid duplication in your bundle.

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
pnpm test

# Run specific test file
pnpm test src/components/ChatWindow/ChatWindow.test.tsx

# Run with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch
```

### Code Quality

- All code must pass TypeScript type checking (strict mode)
- Prettier formatting is enforced via pre-commit hooks
- ESLint rules must be followed
- Tests must pass with 100% success rate
- Test coverage thresholds:
  - Lines: 70%
  - Functions: 85%
  - Branches: 70%
  - Statements: 70%
- New features should include comprehensive tests
- No `any` types or `@ts-ignore` comments without justification

## License

MIT
