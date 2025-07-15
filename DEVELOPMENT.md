# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start apps individually:
pnpm --filter @a2achat/iframe-app dev    # Iframe app on :3001
pnpm --filter @microsoft/a2achat-core dev # Core library in watch mode

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

## Migration Status

✅ **Completed:**

- Monorepo structure with TurboRepo and PNPM workspaces
- Migrated all existing functionality to `@microsoft/a2achat-core` package
- Framework-agnostic core library with React components
- Iframe app using the core library
- Full A2A SDK integration with authentication support
- Documentation site with Docusaurus

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
│   ├── iframe-app/         # Embeddable iframe widget
│   ├── demo-app/           # Demo application
│   └── docs-site/          # Documentation site (Docusaurus)
├── packages/
│   ├── a2a-core/          # Core library (@microsoft/a2achat-core)
│   └── a2a-react/         # React wrapper (skeleton)
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

## Next Steps

1. **Create framework-specific wrappers** - separate React/Vue/etc packages
2. **Enhance documentation** - add more examples and guides
3. **Performance optimization** - bundle size and runtime improvements
4. **Add E2E tests** - comprehensive integration testing
5. **Publish to npm** - release packages for public use

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run dev                    # All packages

# Building
pnpm run build                 # All packages
pnpm --filter @a2achat/iframe-app build
pnpm --filter @microsoft/a2achat-core build

# Type checking
pnpm run type-check            # All packages
pnpm --filter @a2achat/iframe-app type-check
pnpm --filter @microsoft/a2achat-core typecheck

# Testing
pnpm test                      # All packages
pnpm --filter @microsoft/a2achat-core test
pnpm --filter @microsoft/a2achat-core test:coverage

# Linting and formatting
pnpm lint
pnpm format
pnpm format:check

# Individual app commands
pnpm --filter @a2achat/iframe-app dev
pnpm --filter @microsoft/a2achat-core dev
```
