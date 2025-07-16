# Project Structure & Organization

## Monorepo Layout

```
├── packages/                 # Shared packages
│   └── a2a-core/            # Framework-agnostic core library
├── apps/                    # Applications
│   ├── docs-site/           # Documentation site
│   ├── iframe-app/          # Iframe embedding application
│   └── vue-demo/            # Vue.js demo application
├── docs/                    # Additional documentation
├── scripts/                 # Build and utility scripts
└── public/                  # Static assets
```

## Package Structure

### Core Package (`packages/a2a-core/`)

- **Main exports**: Framework-agnostic chat functionality
- **Sub-exports**:
  - `./chat` - Chat-specific functionality
  - `./react` - React wrapper components
  - `./react/styles.css` - Styling
- **Dependencies**: Fluent UI, Zustand, marked, A2A Browser SDK

### Applications (`apps/`)

- **iframe-app**: Standalone iframe application for embedding
- **docs-site**: Documentation and demo site
- **vue-demo**: Vue.js integration example

## Configuration Files

### Root Level

- `package.json` - Root package with workspace configuration
- `pnpm-workspace.yaml` - PNPM workspace definition
- `turbo.json` - Turborepo task configuration
- `tsconfig.json` - Base TypeScript configuration

### Code Quality

- `.eslintrc.json` - ESLint configuration with TypeScript rules
- `.prettierrc.json` - Prettier formatting rules
- `.husky/` - Git hooks for pre-commit formatting

## Naming Conventions

### Packages

- Core package: `@microsoft/a2achat-core`
- Scoped under `@microsoft` namespace
- Hyphenated naming (kebab-case)

### Files & Directories

- TypeScript files: `.ts`, `.tsx` extensions
- Test files: `*.test.ts`, `*.test.tsx`
- Component directories: PascalCase (e.g., `ChatWindow/`)
- Utility files: camelCase (e.g., `authHelpers.ts`)

## Import/Export Patterns

### Package Exports

```typescript
// Main entry point
export * from './chat';
export * from './react';

// Sub-module exports
export { ChatWindow } from './react/ChatWindow';
export type { ChatTheme } from './types';
```

### Internal Imports

- Relative imports for same package: `./components/ChatWindow`
- Absolute imports for cross-package: `@microsoft/a2achat-core`

## Build Outputs

### Library Build (`dist/`)

```
dist/
├── index.js              # Main entry point
├── index.d.ts            # Type definitions
├── chat/                 # Chat module
├── react/                # React components
│   ├── index.js
│   ├── index.d.ts
│   └── styles.css        # Bundled styles
└── types/                # Shared type definitions
```

### Development Structure

- Source code in `src/` directory
- Tests co-located with source files
- Styles in CSS modules or separate `.css` files
- Types in dedicated `types/` directory when shared

## Workspace Dependencies

### Dependency Management

- Use `pnpm --filter <package>` for package-specific operations
- Shared dev dependencies at root level
- Package-specific dependencies in individual `package.json`
- Peer dependencies for React (optional)

### Cross-Package References

- Internal packages reference each other via workspace protocol
- Build dependencies handled by Turborepo task orchestration
- Shared types exported from core package
