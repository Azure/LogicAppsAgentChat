---
sidebar_position: 1
---

# Introduction

Welcome to **A2A Chat** - a TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents.

## What is A2A Chat?

A2A Chat is a comprehensive library that provides everything you need to integrate AI agents using the A2A protocol into your applications. Whether you're building a simple chatbot or a complex multi-agent system, A2A Chat offers flexible solutions:

- **Library-agnostic core** - Use the A2AClient directly in any JavaScript/TypeScript environment
- **React integration** - Leverage hooks and components for React applications
- **Pre-built widgets** - Drop-in chat interfaces that work out of the box
- **Full customization** - Theme, style, and extend every aspect

## Key Features

### 🚀 Easy to Get Started

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({ agentCard });
for await (const task of client.message.stream({ message })) {
  console.log(task.messages);
}
```

### ⚛️ React First-Class Support

```tsx
import { useA2A, ChatWidget } from '@microsoft/a2achat-core/react';

// Use the hook for custom UI
const { messages, sendMessage } = useA2A({ agentCard });

// Or drop in the pre-built widget
<ChatWidget agentCard={agentCard} />;
```

### 🎨 Fully Customizable

- Comprehensive theming system
- CSS variables and modules
- Plugin architecture
- Extensible components

### 🔒 Enterprise Ready

- TypeScript strict mode
- Comprehensive test coverage
- Built-in authentication flows
- Error handling and retry logic

## Architecture Overview

A2A Chat is built as a monorepo with clear separation of concerns:

```
@microsoft/a2achat-core
├── /client         # Core A2AClient implementation
├── /react          # React hooks and components
├── /streaming      # SSE streaming utilities
├── /types          # TypeScript type definitions
└── /plugins        # Plugin system
```

## Use Cases

A2A Chat is perfect for:

- **Customer Support** - Build AI-powered support agents
- **Virtual Assistants** - Create intelligent assistants for your apps
- **Documentation Bots** - Help users navigate complex documentation
- **Multi-Agent Systems** - Coordinate multiple AI agents
- **Custom Integrations** - Connect any A2A-compatible agent

## Next Steps

Ready to get started? Here are your next steps:

1. **[Installation Guide](./getting-started/installation)** - Set up A2A Chat in your project
2. **[Quick Start](./getting-started/quick-start)** - Build your first chat interface
3. **[Core Concepts](./getting-started/concepts)** - Understand the A2A protocol
4. **[Examples](./examples/basic-chat)** - See A2A Chat in action

## Community and Support

- **GitHub**: [microsoft/a2achat](https://github.com/microsoft/a2achat)
- **Discord**: [Join our community](https://discord.gg/a2achat)
- **Issues**: [Report bugs or request features](https://github.com/microsoft/a2achat/issues)

## License

A2A Chat is open source and available under the MIT license.
