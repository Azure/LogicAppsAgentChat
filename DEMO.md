# A2A Chat Demo

This demo showcases the A2A Chat widget in both standalone and iframe integration modes.

## Development Mode

Run the demo in development mode with hot reloading:

```bash
npm run dev
```

The demo will be available at:
- Landing page: http://localhost:3000/demo/
- Chat demo: http://localhost:3000/demo/index.html
- iframe integration: http://localhost:3000/demo/iframe.html

## Production Build

### Building the Demo

Build the demo for production:

```bash
npm run build:demo
```

This creates an optimized production build in the `dist/demo` directory.

### Serving the Production Build

There are several ways to serve the production build:

#### Option 1: Using the custom server (recommended)

```bash
npm run serve:demo
```

This runs a simple Node.js server that properly handles routing for the demo pages.

#### Option 2: Using Vite preview

```bash
npm run preview:demo
```

This uses Vite's built-in preview server.

#### Option 3: Using a static file server

```bash
npm run serve:static
# or
npx serve dist/demo
```

## Build All

To build everything (library, iframe, and demo):

```bash
npm run build
```

## Environment Variables

- `PORT`: Set the port for the demo server (default: 3000)

## Demo Pages

1. **Landing Page** (`/`): Overview of available demos
2. **Chat Demo** (`/demo/index.html`): Interactive chat with configuration options
3. **iframe Integration** (`/demo/iframe.html`): Shows how to embed the chat in an iframe

## Features

- Real-time theme switching
- Multiple color themes
- A2A protocol integration
- Responsive design
- Production-optimized build