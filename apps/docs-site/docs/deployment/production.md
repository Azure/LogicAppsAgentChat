---
sidebar_position: 1
---

# Production Deployment

Guide for deploying A2A Chat applications to production environments.

## Pre-Deployment Checklist

### Security

- [ ] Agent card URL uses HTTPS
- [ ] Authentication is properly configured
- [ ] API keys are stored securely (environment variables)
- [ ] CORS is configured correctly
- [ ] Content Security Policy (CSP) headers are set
- [ ] Input validation is implemented
- [ ] XSS protection is enabled

### Performance

- [ ] Bundle size is optimized
- [ ] Code splitting is implemented
- [ ] Assets are minified
- [ ] Gzip/Brotli compression is enabled
- [ ] CDN is configured for static assets
- [ ] Lazy loading for chat widget
- [ ] Service worker for offline support (optional)

### Monitoring

- [ ] Error tracking is set up
- [ ] Analytics are configured
- [ ] Performance monitoring is enabled
- [ ] Logging is implemented
- [ ] Health checks are configured

## Build Configuration

### Optimized Production Build

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build for production
pnpm build

# The build output will be in:
# - packages/a2a-core/dist (library)
# - apps/iframe-app/dist (iframe widget)
```

### Environment Variables

Create a `.env.production` file:

```bash
# Agent Configuration
VITE_AGENT_CARD_URL=https://api.example.com/.well-known/agent.json

# API Configuration
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Security
VITE_ALLOWED_ORIGINS=https://example.com,https://app.example.com
VITE_CSP_NONCE=random-nonce-here

# Optional: CDN
VITE_CDN_URL=https://cdn.example.com
```

### Build Optimization

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Analyze bundle size
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'fluentui-vendor': ['@fluentui/react-components'],
          utils: ['date-fns', 'uuid'],
        },
      },
    },
    // Enable source maps for error tracking
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
});
```

## Deployment Options

### Static Hosting (Iframe Widget)

Deploy the iframe widget to static hosting services:

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/iframe-app
vercel --prod
```

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": null,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "ALLOWALL"
        },
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors *;"
        }
      ]
    }
  ]
}
```

#### Netlify

```toml
# netlify.toml
[build]
  command = "pnpm build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "ALLOWALL"
    Content-Security-Policy = "frame-ancestors *;"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### AWS S3 + CloudFront

```bash
# Build the app
pnpm build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

CloudFront configuration:

```json
{
  "Origins": [
    {
      "DomainName": "your-bucket.s3.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }
  ],
  "DefaultRootObject": "index.html",
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html"
    }
  ],
  "DefaultCacheBehavior": {
    "Compress": true,
    "ViewerProtocolPolicy": "redirect-to-https"
  }
}
```

### NPM Package Deployment

Deploy the core library to NPM:

```bash
# Build the library
cd packages/a2a-core
pnpm build

# Run tests
pnpm test

# Publish to NPM
npm publish --access public
```

```json
// package.json
{
  "name": "@microsoft/a2achat-core",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react.mjs",
      "require": "./dist/react.js",
      "types": "./dist/react.d.ts"
    },
    "./chat": {
      "import": "./dist/chat.mjs",
      "require": "./dist/chat.js",
      "types": "./dist/chat.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./

# Copy package files
COPY packages/a2a-core/package.json ./packages/a2a-core/
COPY apps/iframe-app/package.json ./apps/iframe-app/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm build

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/iframe-app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "ALLOWALL";
    add_header Content-Security-Policy "frame-ancestors *;";
    add_header X-Content-Type-Options "nosniff";

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Security Best Practices

### Content Security Policy

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.example.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com wss://api.example.com;
  frame-ancestors *;
"
/>
```

### Environment Variable Validation

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_AGENT_CARD_URL: z.string().url(),
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_TIMEOUT: z.string().transform(Number).default('30000'),
  VITE_ENABLE_ANALYTICS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  VITE_ALLOWED_ORIGINS: z.string().transform((v) => v.split(',')),
});

export const env = envSchema.parse(import.meta.env);
```

### API Key Management

```typescript
// Never expose API keys in client code
// Use a backend proxy for sensitive operations

// Bad ❌
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
  auth: {
    type: 'api-key',
    key: 'sk-1234567890', // Never do this!
    header: 'X-API-Key',
  },
});

// Good ✅
// Backend proxy endpoint
app.post('/api/chat', authenticate, async (req, res) => {
  const client = new A2AClient({
    agentCard: process.env.AGENT_CARD_URL,
    auth: {
      type: 'api-key',
      key: process.env.API_KEY, // Server-side only
      header: 'X-API-Key',
    },
  });

  // Forward request to A2A agent
  const response = await client.message.send(req.body);
  res.json(response);
});
```

## Performance Optimization

### Lazy Loading

```typescript
// Lazy load the chat widget
const ChatWidget = lazy(() =>
  import('@microsoft/a2achat-core/react').then(module => ({
    default: module.ChatWidget,
  }))
);

function App() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChat(true)}>
        Open Chat
      </button>

      {showChat && (
        <Suspense fallback={<div>Loading chat...</div>}>
          <ChatWidget agentCard="..." />
        </Suspense>
      )}
    </div>
  );
}
```

### Service Worker

```javascript
// sw.js
const CACHE_NAME = 'a2a-chat-v1';
const urlsToCache = ['/', '/static/css/main.css', '/static/js/main.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```

## Monitoring

### Error Tracking with Sentry

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Wrap your app
export default Sentry.withProfiler(App);
```

### Analytics

```typescript
// analytics.ts
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (!env.VITE_ENABLE_ANALYTICS) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', event, properties);
    }

    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.track(event, properties);
    }
  },
};

// Usage in chat
const { sendMessage } = useA2A({
  agentCard,
  onMessage: (message) => {
    analytics.track('message_sent', {
      role: message.role,
      contentLength: message.content[0]?.content?.length,
    });
  },
});
```

## Health Checks

```typescript
// health.ts
export async function checkHealth(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    checkAgentAvailability(),
    checkNetworkLatency(),
    checkStorageQuota(),
  ]);

  return {
    status: checks.every((c) => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    checks: checks.map((c, i) => ({
      name: ['agent', 'network', 'storage'][i],
      status: c.status === 'fulfilled' ? 'pass' : 'fail',
      message: c.status === 'rejected' ? c.reason.message : undefined,
    })),
    timestamp: new Date().toISOString(),
  };
}
```

## Rollback Strategy

1. **Version Tags**: Tag each release in git
2. **Database Migrations**: Use reversible migrations
3. **Feature Flags**: Enable gradual rollout
4. **Blue-Green Deployment**: Maintain two environments
5. **Monitoring**: Watch error rates after deployment

```bash
# Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Rollback if needed
git checkout v1.2.2
pnpm build
# Deploy previous version
```

## Next Steps

- [Integration Guide](./integration) - Integrate with existing apps
- [Scaling Guide](./scaling) - Handle high traffic
- [Security Guide](./security) - Security best practices
- [Monitoring Guide](./monitoring) - Set up monitoring
