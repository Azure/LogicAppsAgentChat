---
sidebar_position: 1
---

# Installation

A2A Chat can be installed via npm, yarn, or pnpm. The library is published as `@microsoft/a2achat-core` and includes all necessary TypeScript types.

## Prerequisites

Before installing A2A Chat, ensure you have:

- Node.js 18.0 or higher
- npm, yarn, or pnpm package manager
- TypeScript 5.0+ (for TypeScript projects)

## Package Installation

### npm

```bash
npm install @microsoft/a2achat-core
```

### yarn

```bash
yarn add @microsoft/a2achat-core
```

### pnpm

```bash
pnpm add @microsoft/a2achat-core
```

## Peer Dependencies

If you're using the React components, you'll need to ensure you have the following peer dependencies installed:

```bash
npm install react react-dom
```

The React components also use Microsoft's Fluent UI v9, which is bundled with the library, so no additional installation is required.

## TypeScript Configuration

A2A Chat is written in TypeScript with strict mode enabled. For the best experience, we recommend using these TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "node",
    "jsx": "react-jsx"
  }
}
```

## Import Styles

The React components require CSS to be imported. Add this to your application's entry point:

```typescript
// If using React components
import '@microsoft/a2achat-core/react/styles.css';
```

## Verify Installation

You can verify the installation by creating a simple test file:

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

console.log('A2A Chat installed successfully!');
console.log('Client available:', typeof A2AClient);
```

## Module Formats

A2A Chat provides multiple module formats:

- **ESM** (ECMAScript Modules) - Default for modern bundlers
- **CommonJS** - For Node.js compatibility
- **TypeScript** - Full TypeScript definitions included

### Importing Specific Modules

The library provides multiple entry points for different use cases:

```typescript
// Core client only
import { A2AClient } from '@microsoft/a2achat-core';

// React hooks and utilities
import { useA2A } from '@microsoft/a2achat-core/react';

// Pre-built chat components
import { ChatWidget } from '@microsoft/a2achat-core/react';

// TypeScript types
import type { AgentCard, Message } from '@microsoft/a2achat-core';
```

## Browser Support

A2A Chat supports all modern browsers:

- Chrome/Edge (Chromium) 90+
- Firefox 88+
- Safari 14+

Note: Internet Explorer is not supported.

## CDN Usage

For quick prototyping, you can use A2A Chat via CDN:

```html
<!-- Development -->
<script src="https://unpkg.com/@microsoft/a2achat-core/dist/index.js"></script>

<!-- Production -->
<script src="https://unpkg.com/@microsoft/a2achat-core/dist/index.min.js"></script>
```

However, we recommend using a bundler for production applications.

## Next Steps

Now that you have A2A Chat installed, you can:

1. Follow the [Quick Start Guide](./quick-start) to build your first chat interface
2. Learn about [Core Concepts](./concepts) of the A2A protocol
3. Explore [Usage Examples](../usage/client-direct) for different integration patterns

## Troubleshooting

### Module Resolution Issues

If you encounter module resolution issues, ensure your bundler is configured to handle the package.json `exports` field:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "import": "./dist/react.js",
      "require": "./dist/react.cjs"
    }
  }
}
```

### TypeScript Path Mapping

For better IntelliSense, you can add path mappings to your tsconfig.json:

```json
{
  "compilerOptions": {
    "paths": {
      "@microsoft/a2achat-core": ["node_modules/@microsoft/a2achat-core/dist/index.d.ts"],
      "@microsoft/a2achat-core/react": ["node_modules/@microsoft/a2achat-core/dist/react.d.ts"]
    }
  }
}
```
