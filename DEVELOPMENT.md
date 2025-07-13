# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start apps individually:
pnpm --filter iframe-app dev              # Iframe app
pnpm --filter vue-demo dev                # Vue demo app

# Or start all packages in dev mode:
pnpm run dev
```

## Troubleshooting

### Fixing pnpm-lock.yaml Issues

If you encounter CI failures related to `pnpm-lock.yaml` being out of sync or missing:

```bash
# Run the fix-lockfile script
./scripts/fix-lockfile.sh

# Or manually fix:
rm -rf node_modules pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: update pnpm-lock.yaml"
```

The CI workflows will automatically handle missing lockfiles during the transition period.

## Project Structure

### Packages

- **@microsoft/a2achat-core** (`packages/a2a-core/`): Core SDK with all functionality
  - Framework-agnostic core at root export
  - React components at `/react` export
  - Chat functionality at `/chat` export

### Applications

- **iframe-app** (`apps/iframe-app/`): Embeddable iframe widget
- **vue-demo** (`apps/vue-demo/`): Vue.js demo application

### Key Technologies

- **TypeScript**: Strict mode enabled across all packages
- **React 18+**: For component library
- **Fluent UI v9**: Design system for consistent UI
- **Vite**: Build tool for applications
- **tsup**: Build tool for library package
- **Vitest**: Testing framework
- **pnpm**: Package manager with workspace support
- **TurboRepo**: Monorepo orchestration

## Applications

### Iframe App (`apps/iframe-app`)

The actual chat widget for iframe embedding:

- **URL**: http://localhost:3001
- **Features**:
  - All original chat functionality
  - URL parameter configuration
  - Data attribute configuration
  - PostMessage API
  - Theme support
  - File upload
  - A2A agent integration

## Current Structure

```
├── apps/
│   ├── iframe-app/        # Embeddable chat widget
│   └── vue-demo/          # Vue.js demo application
├── packages/
│   └── a2a-core/          # Core SDK with all functionality
│       ├── src/           # Source code
│       ├── dist/          # Built output
│       └── tsup.config.ts # Build configuration
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── turbo.json            # TurboRepo configuration
```

## Usage Examples

### Basic Iframe

```html
<iframe
  src="http://localhost:3001/?agentCard=https://example.com/agent&theme=blue"
  style="width: 400px; height: 600px; border: none;"
></iframe>
```

### Available URL Parameters

- `agentCard`: Agent URL (required)
- `theme`: Theme name (default, blue, green, red, purple, teal, orange, pink)
- `welcomeMessage`: Welcome message text
- `logoUrl`: Company logo URL
- `allowFileUpload`: Enable file uploads (true/false)
- `expectPostMessage`: Wait for agent card via postMessage (true/false)

## Testing

```bash
# Run tests
pnpm test                      # All packages
pnpm test:watch               # Watch mode
pnpm test:ui                  # Vitest UI
pnpm test:coverage            # Coverage report

# Test specific package
pnpm --filter @microsoft/a2achat-core test
```

### Test Coverage Requirements

- Lines: 70%
- Functions: 85%
- Branches: 70%
- Statements: 70%

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run dev                    # All packages

# Building
pnpm run build                 # All packages
pnpm --filter @microsoft/a2achat-core build
pnpm --filter iframe-app build

# Type checking
pnpm run typecheck             # All packages
pnpm --filter @microsoft/a2achat-core typecheck

# Linting & Formatting
pnpm run lint                  # ESLint
pnpm run format               # Prettier formatting
pnpm run format:check         # Check formatting
```
