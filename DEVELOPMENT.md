# Development Guide

This guide covers development workflows, tooling, testing, and contributing guidelines for the A2A Chat monorepo.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Initial Setup](#initial-setup)
  - [Development Mode](#development-mode)
- [Monorepo Structure](#monorepo-structure)
- [Development Commands](#development-commands)
  - [Building](#building)
  - [Testing](#testing)
  - [Code Quality](#code-quality)
  - [Working with Specific Packages](#working-with-specific-packages)
- [Testing Strategy](#testing-strategy)
  - [Unit Tests](#unit-tests)
  - [Writing Tests](#writing-tests)
  - [E2E Tests](#e2e-tests)
- [Publishing Packages](#publishing-packages)
  - [Using Changesets](#using-changesets)
  - [Changeset Types](#changeset-types)
- [Code Quality Standards](#code-quality-standards)
  - [TypeScript](#typescript)
  - [React Best Practices](#react-best-practices)
  - [CSS/Styling](#cssstyling)
  - [Testing Best Practices](#testing-best-practices)
- [Troubleshooting](#troubleshooting)
  - [pnpm-lock.yaml Issues](#pnpm-lockyaml-issues)
  - [Module Resolution Issues](#module-resolution-issues)
  - [Type Errors After Updates](#type-errors-after-updates)
- [Contributing](#contributing)
  - [Development Workflow](#development-workflow)
  - [Commit Message Format](#commit-message-format)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [CI/CD Pipeline](#cicd-pipeline)
- [Bundle Size Management](#bundle-size-management)
- [Debugging](#debugging)
  - [VS Code Configuration](#vs-code-configuration)
  - [Browser DevTools](#browser-devtools)
- [Performance Optimization](#performance-optimization)
  - [React Performance](#react-performance)
  - [Build Performance](#build-performance)
- [Security](#security)
- [Additional Resources](#additional-resources)
- [Migration Status](#migration-status)
- [Next Steps](#next-steps)

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 10.12.4

## Quick Start

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/a2achat.git
cd a2achat

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development Mode

```bash
# Start all packages in development mode with hot reloading
pnpm run dev

# Or start specific packages:
pnpm --filter @a2achat/iframe-app dev     # Iframe app on :3001
pnpm --filter @microsoft/a2achat-core dev # Core library in watch mode
```

## Monorepo Structure

```
├── apps/
│   ├── iframe-app/         # Embeddable iframe widget
│   ├── demo-app/           # Demo application
│   └── docs-site/          # Documentation site (Docusaurus)
├── packages/
│   ├── a2a-core/          # Core library (@microsoft/a2achat-core)
│   └── a2a-react/         # React wrapper (future)
├── docs/                  # Architecture & design documentation
└── e2e/                   # End-to-end tests
```

## Development Commands

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @microsoft/a2achat-core build
pnpm --filter @a2achat/iframe-app build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @microsoft/a2achat-core test

# Run tests in watch mode
pnpm --filter @microsoft/a2achat-core test:watch

# Run tests with UI
pnpm --filter @microsoft/a2achat-core test:ui

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Type checking (all packages)
pnpm run type-check

# Type checking (specific package)
pnpm --filter @microsoft/a2achat-core typecheck

# Linting
pnpm lint

# Format code with Prettier
pnpm format

# Check formatting (used in CI)
pnpm format:check

# Bundle size check (core package)
pnpm --filter @microsoft/a2achat-core size
```

### Working with Specific Packages

```bash
# Add a dependency to a package
pnpm --filter @microsoft/a2achat-core add lodash

# Add a dev dependency
pnpm --filter @microsoft/a2achat-core add -D @types/lodash

# Remove a dependency
pnpm --filter @microsoft/a2achat-core remove lodash

# Run any package script
pnpm --filter @microsoft/a2achat-core <script-name>
```

## Testing Strategy

### Unit Tests

- **Framework**: Vitest with React Testing Library
- **Location**: Co-located with components (`.test.tsx` files)
- **Coverage Requirements**:
  - Lines: 70%
  - Functions: 85%
  - Branches: 70%
  - Statements: 70%

### Writing Tests

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### E2E Tests

```bash
# Run Playwright E2E tests
pnpm --filter e2e test

# Run E2E tests in headed mode
pnpm --filter e2e test:headed

# Run E2E tests in debug mode
pnpm --filter e2e test:debug
```

## Publishing Packages

### Using Changesets

```bash
# Create a changeset (document your changes)
pnpm changeset

# Version packages based on changesets
pnpm version-packages

# Build and publish to npm
pnpm release
```

### Changeset Types

- **patch**: Bug fixes (0.0.X)
- **minor**: New features (0.X.0)
- **major**: Breaking changes (X.0.0)

## Code Quality Standards

### TypeScript

- **Strict mode** enabled
- No `any` types (use `unknown` if necessary)
- Properly typed interfaces and components
- No `@ts-ignore` without justification

### React Best Practices

- Functional components with hooks
- Proper dependency arrays for hooks
- Memoization where appropriate
- Accessible components (ARIA attributes)

### CSS/Styling

- CSS Modules for component styles
- CSS variables for theming
- Mobile-first responsive design
- Dark mode support

### Testing Best Practices

- Test behavior, not implementation
- Mock external dependencies
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility

## Troubleshooting

### pnpm-lock.yaml Issues

If you encounter CI failures related to `pnpm-lock.yaml` being out of sync:

```bash
# Run the fix-lockfile script
./scripts/fix-lockfile.sh

# Or manually fix:
rm -rf node_modules pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: update pnpm-lock.yaml"
```

### Module Resolution Issues

```bash
# Clear all build artifacts and node_modules
pnpm clean

# Reinstall dependencies
pnpm install

# Rebuild all packages
pnpm build
```

### Type Errors After Updates

```bash
# Clear TypeScript cache
pnpm --filter @microsoft/a2achat-core exec tsc --build --clean

# Rebuild types
pnpm run type-check
```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** with tests
4. **Run quality checks**: `pnpm type-check && pnpm lint && pnpm test`
5. **Create a changeset**: `pnpm changeset`
6. **Commit your changes**: `git commit -m "feat: add my feature"`
7. **Push to your fork**: `git push origin feature/my-feature`
8. **Create a Pull Request**

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

### Pre-commit Hooks

The project uses Husky and lint-staged for pre-commit checks:

- **Prettier** formatting
- **ESLint** linting
- **TypeScript** type checking

### CI/CD Pipeline

All PRs are automatically checked for:

- ✅ TypeScript type errors
- ✅ Prettier formatting
- ✅ ESLint violations
- ✅ Test failures
- ✅ Build errors
- ✅ Bundle size regression (45KB limit for core)

## Bundle Size Management

The core library has a **45KB** size limit (gzipped):

```bash
# Check bundle size
pnpm --filter @microsoft/a2achat-core size

# Analyze bundle composition
pnpm --filter @microsoft/a2achat-core analyze
```

**Tips for keeping bundle size small:**

- Use dynamic imports for large dependencies
- Tree-shakeable exports
- Peer dependencies instead of bundling
- Avoid large utility libraries

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@microsoft/a2achat-core", "test"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Browser DevTools

```tsx
// Add debug logging
import debug from 'debug';
const log = debug('a2achat:component');

log('Component rendered', props);
```

## Performance Optimization

### React Performance

- Use `React.memo` for expensive components
- Optimize re-renders with `useMemo` and `useCallback`
- Code-split large components with `React.lazy`

### Build Performance

- Use TurboRepo caching
- Parallel builds with `pnpm -w --parallel`
- Remote caching (optional)

## Security

For security issues, see [SECURITY.md](./SECURITY.md) for reporting guidelines.

## Additional Resources

- [Main README](./README.md) - Project overview and usage
- [Core Package README](./packages/a2a-core/README.md) - Core library documentation
- [Iframe App README](./apps/iframe-app/README.md) - Iframe widget documentation
- [Architecture Documentation](./docs/) - Design decisions and architecture
- [E2E Testing Plan](./E2E_TESTING_PLAN.md) - End-to-end testing strategy

## Migration Status

✅ **Completed:**

- Monorepo structure with TurboRepo and PNPM workspaces
- Framework-agnostic core library with React components
- Iframe app using the core library
- Full A2A SDK integration with authentication support
- Documentation site with Docusaurus
- CI/CD pipeline with GitHub Actions
- E2E testing infrastructure

🚧 **In Progress:**

- Additional framework wrappers (Vue, Angular, Svelte)
- Enhanced documentation and examples
- Performance optimizations
- Additional E2E test coverage

## Next Steps

1. **Create framework-specific wrappers** - Separate React/Vue/Angular packages
2. **Enhance documentation** - More examples and use cases
3. **Performance optimization** - Bundle size and runtime improvements
4. **Expand E2E tests** - Comprehensive integration testing
5. **Public npm release** - Publish packages for community use
