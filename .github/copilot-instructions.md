# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is @microsoft/a2achat - a lightweight, customizable chat interface library for web applications. It provides both an NPM package for React apps and a standalone iframe embed solution, with built-in support for A2A (Agent-to-Agent) protocol compliant AI agents.

## Essential Commands

### Development
- `npm run dev` - Start development server with hot reloading (port 3000)
- `npm run demo` - Start demo server with host access

### Building
- `npm run build` - Build all targets (lib, iframe, demo)
- `npm run build:lib` - Build the NPM library package only
- `npm run build:iframe` - Build the iframe embed version only

### Testing
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI interface

### Code Quality
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint code linting
- `npm run size` - Check bundle size (must be under 45KB)

## Architecture Overview

The codebase follows a component-based React architecture with:

- **State Management**: Zustand store in `src/store/chatStore.ts`
- **A2A Protocol**: Custom client implementation in `src/a2aclient/`
- **Component Structure**: Each component in `src/components/` has its own directory with component file, tests, styles, and barrel export
- **Styling**: CSS Modules with CSS variables for theming
- **Distribution**: Dual build targets - NPM package (`src/lib/index.tsx`) and iframe embed (`src/lib/iframe.tsx`)

Key architectural decisions:
- React and React-DOM are peer dependencies (not bundled)
- TypeScript strict mode is enabled
- Components are fully typed with comprehensive interfaces
- Markdown rendering with syntax highlighting via marked and prismjs

## Key Files and Their Purposes

- `vite.config.ts` - Multi-mode build configuration for lib/iframe/demo targets
- `src/lib/index.tsx` - Main entry point for NPM package export
- `src/lib/iframe.tsx` - Entry point for iframe embed version
- `src/store/chatStore.ts` - Central state management for chat functionality
- `src/a2aclient/A2AClient.ts` - A2A protocol implementation for AI agent communication
- `src/components/ChatWindow/ChatWindow.tsx` - Main container component that orchestrates the chat UI

## Testing Approach

Tests use Vitest with React Testing Library. Test files are co-located with components (e.g., `ChatWindow.test.tsx`). When writing tests:
- Use `@testing-library/react` utilities
- Mock the Zustand store when needed
- Test files should have `.test.ts` or `.test.tsx` extension
- Run a single test file: `npm run test path/to/file.test.tsx`

## Important Implementation Notes

1. **Bundle Size**: The library has a 45KB size limit. Check with `npm run size` before adding dependencies.

2. **Theme Customization**: Uses CSS variables defined in `src/styles/variables.css`. Components access theme via `useTheme` hook.

3. **A2A Protocol**: When working with the A2A client, refer to `src/a2aclient/README.md` for protocol details and event handling.

4. **File Uploads**: File upload functionality includes drag-and-drop support. Max file size and allowed types are configurable via props.

5. **Streaming Responses**: The library supports Server-Sent Events (SSE) for real-time streaming AI responses.

6. **TypeScript**: All new code must be properly typed. Avoid using `any` type. The codebase uses strict TypeScript settings.

## Additional Documentation

- `README.md` - Main project documentation with usage examples
- `REACT_USAGE.md` - Detailed React integration guide
- `DEMO.md` - Demo deployment instructions
- `src/a2aclient/README.md` - A2A client implementation details