# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the A2A Chat monorepo - a TypeScript SDK for building chat interfaces that connect to A2A (Agent-to-Agent) protocol agents. It uses pnpm workspaces and TurboRepo for monorepo management.

## Commands

### Development

```bash
pnpm install          # Install dependencies (use pnpm, not npm/yarn)
pnpm dev              # Start dev servers for all packages
pnpm build            # Build all packages
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking
pnpm format           # Format code with Prettier
```

### Testing

```bash
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with Vitest UI
pnpm test:coverage    # Run tests with coverage report

# Run specific test file
pnpm test src/path/to/test.spec.ts

# Run tests for specific package
pnpm --filter @microsoft/a2achat-core test
```

### Package-Specific Commands

```bash
# Work with specific packages
pnpm --filter @microsoft/a2achat-core dev

# Add dependencies to specific package
pnpm --filter @microsoft/a2achat-core add package-name
```

## Architecture

### Monorepo Structure

- **packages/a2a-core**: Core library with all business logic
  - Contains A2A client, SSE streaming, React components, and utilities
  - Exports separate entry points: `/`, `/react`, `/chat`
  - Package name: `@microsoft/a2achat-core`
- **apps/iframe-app**: Embeddable iframe widget implementation
- **apps/vue-demo**: Vue.js demo application showing SDK integration

### Key Technical Decisions

1. **SSE Streaming Protocol**: All A2A communication uses Server-Sent Events with JSON-RPC format
   - Messages are sent via POST with `text/event-stream` response
   - Authentication uses the same streaming protocol (not regular HTTP)

2. **Component Architecture**:
   - React components use Fluent UI v9 components
   - CSS Modules with `.module.css` files for custom styling
   - State management via Zustand store (`src/react/store/chatStore.ts`)
   - All components are fully typed with TypeScript strict mode

3. **Message Format**: A2A protocol uses specific message structures
   - Text content: `{ kind: 'text', text: '...' }`
   - Data content: `{ kind: 'data', data: {...} }` (NOT 'structured')
   - Messages include `contextId` at the message level for proper routing

4. **Authentication Flow (OBO)**:
   - Server sends `auth-required` event during streaming
   - Client opens consent URLs in popup windows
   - After auth completes, client sends `AuthenticationCompleted` message as data part
   - All auth communication uses SSE streaming, not HTTP POST

### Testing Approach

- Use Vitest with React Testing Library
- Tests go in `__tests__` directories next to source files
- Mock SSE connections with manual event dispatch
- Coverage requirements: 70% lines/branches, 85% functions
- Always test through public APIs, not implementation details

### Build System

- **tsup** for building the core package with multiple entry points
- **Vite** for building demo applications
- CSS is bundled separately and must be imported by consumers
- React and Fluent UI are peer dependencies, not bundled

### State Management

The React implementation uses Zustand with the following key stores:

- `chatStore.ts`: Main chat state (messages, loading, auth state)
- `configStore.ts`: Configuration and feature flags

### Plugin System

Extensible plugin architecture in `src/plugins/`:

- Analytics plugins for tracking events
- Logger plugins for custom logging
- Plugins receive chat lifecycle events

## Common Patterns

### Adding New Features

1. Implement in core package first (`packages/a2a-core/src/`)
2. Add TypeScript types to `types.ts` or create new type file
3. Export from appropriate entry point in `index.ts`
4. Add tests with full coverage
5. Update examples if needed

### Working with SSE Streaming

- Use `SSEClient` class for establishing connections
- Handle reconnection and error states
- Parse JSON-RPC responses from `data` field
- Check for `result.kind` to determine message type

### CSS and Styling

- Use CSS variables for theming (prefix with `--chat-`)
- Keep styles in `.module.css` files for components
- Global styles go in `src/react/styles/index.css`
- Support light/dark themes via CSS variables

## Recent Changes

### Fluent UI Migration

- Migrated from custom components to Fluent UI v9 components
- Updated all React components to use Fluent UI design system
- Maintained CSS Module support for custom styling needs

### Multi-Session Support

- Added support for multiple chat sessions in iframe app
- Implemented session management utilities
- Added session list component with session switching

## Important Context

- When working with authentication, remember ALL messages go through SSE, not regular HTTP
- The `contextId` is critical for maintaining conversation state
- Data parts in messages use `kind: 'data'`, not `kind: 'structured'`
- Always validate responses with Zod schemas for type safety
- The iframe app demonstrates secure cross-origin communication patterns
