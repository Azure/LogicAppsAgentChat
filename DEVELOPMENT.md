# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start apps individually:
pnpm --filter @a2achat/demo-app dev      # Demo app on :3000
pnpm --filter @a2achat/iframe-app dev    # Iframe app on :3001

# Or start all packages in dev mode:
pnpm run dev
```

## Migration Status

✅ **Completed:**
- Monorepo structure with TurboRepo and PNPM workspaces
- Migrated existing iframe functionality to `apps/iframe-app`
- Created interactive demo at `apps/demo-app`
- Skeleton packages for framework-agnostic core and wrappers

🚧 **In Progress:**
- All existing React components, hooks, and utilities are now in `apps/iframe-app/src`
- Complete A2A SDK integration preserved
- All original functionality maintained

## Applications

### Demo App (`apps/demo-app`)

Interactive demo showcasing the iframe integration:
- **URL**: http://localhost:3000
- **Features**: 
  - Live iframe preview (embeds iframe app from :3001)
  - Theme customization
  - Embed code generation
  - Configuration examples

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
│   ├── demo-app/           # Interactive demo
│   └── iframe-app/         # Chat widget (migrated from src/)
│       └── src/            # All original components/hooks/utils
├── packages/               # Framework packages (skeleton)
│   ├── a2a-core/          # Framework-agnostic core
│   ├── a2a-react/         # React wrapper
│   ├── a2a-vue/           # Vue wrapper
│   └── a2a-svelte/        # Svelte wrapper
└── src/                   # Original source (can be removed after testing)
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

1. **Test the migrated functionality** - verify all features work
2. **Implement the core library** - extract common functionality
3. **Create framework wrappers** - build React/Vue/Svelte packages
4. **Set up CI/CD** - automated testing and deployment
5. **Add proper build configurations** - optimize for production

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run dev                    # All packages

# Building
pnpm run build                 # All packages
pnpm --filter @a2achat/iframe-app build
pnpm --filter @a2achat/demo-app build

# Type checking
pnpm run type-check            # All packages
pnpm --filter @a2achat/iframe-app type-check

# Individual app commands
pnpm --filter @a2achat/demo-app dev
pnpm --filter @a2achat/iframe-app dev
```