# Technology Stack & Build System

## Build System

- **Monorepo**: Turborepo for task orchestration and caching
- **Package Manager**: pnpm 10.12.4+ (required)
- **Bundler**: Vite 7.0+ with TypeScript support
- **Module Bundler**: tsup for library builds

## Core Technologies

- **TypeScript**: 5.3+ with strict mode enabled
- **React**: 18.2+ (peer dependency for React wrapper)
- **Node.js**: 18+ or 20+ required

## Key Dependencies

- **A2A Browser SDK**: Core integration for agent communication
- **Fluent UI**: `@fluentui/react-components` and `@fluentui/react-icons` for UI components
- **State Management**: Zustand for lightweight state management
- **Immutability**: Immer for immutable state updates
- **Markdown**: marked with syntax highlighting via prismjs
- **Validation**: Zod for runtime type validation
- **Events**: EventEmitter3 for event handling
- **Retry Logic**: p-retry for robust network operations

## Code Quality Tools

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (enforced via pre-commit hooks)
- **Testing**: Vitest with jsdom, React Testing Library
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky with lint-staged

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development mode (all packages)
pnpm run dev

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Format code
pnpm run format
```

### Package-Specific Commands

```bash
# Work with specific package
pnpm --filter @microsoft/a2achat-core build
pnpm --filter @microsoft/a2achat-core test

# Add dependency to specific package
pnpm --filter @microsoft/a2achat-core add some-package
```

### Release Management

```bash
# Create changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish to npm
pnpm release
```

## Bundle Requirements

- Library bundle size limit: ~45KB (excluding React)
- CSS bundle: ~5KB
- Bundle size monitoring in CI to prevent regression

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)
