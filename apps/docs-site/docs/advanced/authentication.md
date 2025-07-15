---
sidebar_position: 2
---

# Authentication

Secure your A2A Chat implementation with various authentication methods.

## Overview

A2A Chat supports multiple authentication strategies:

- **No Auth**: Public agents
- **API Key**: Simple key-based auth
- **Bearer Token**: JWT or OAuth tokens
- **OAuth 2.0**: Full OAuth flow with consent
- **Custom Auth**: Implement your own

## Authentication Flow

### Standard Flow

1. Client attempts to send message
2. Agent returns `auth-required` event if authentication needed
3. Client handles authentication (shows consent UI, gets token, etc.)
4. Client sends `AuthenticationCompleted` message
5. Agent continues with authenticated context

### SSE Authentication Protocol

All authentication happens through the SSE stream:

```typescript
// 1. Initial message attempt
POST /message
Accept: text/event-stream

// 2. Server responds with auth-required event
event: message
data: {"jsonrpc":"2.0","method":"auth.required","params":{"taskId":"123","authParts":[{"consentLink":"https://...","serviceName":"GitHub"}]}}

// 3. After user completes auth, send completion message
POST /message
Accept: text/event-stream
{
  "message": {
    "role": "user",
    "content": [{
      "type": "data",
      "data": {
        "type": "AuthenticationCompleted",
        "authParts": [{"serviceName": "GitHub", "status": "completed"}]
      }
    }]
  },
  "context": {
    "contextId": "original-context-id"
  }
}
```

## Configuration

### API Key Authentication

```typescript
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
  auth: {
    type: 'api-key',
    key: process.env.API_KEY,
    header: 'X-API-Key', // or 'Authorization' for "ApiKey YOUR_KEY"
  },
});
```

### Bearer Token

```typescript
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
  auth: {
    type: 'bearer',
    token: 'eyJhbGciOiJIUzI1NiIs...', // JWT or OAuth token
  },
});
```

### OAuth 2.0

```typescript
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
  auth: {
    type: 'oauth2',
    accessToken: 'access_token_here',
    refreshToken: 'refresh_token_here',
    expiresIn: 3600,
  },
});
```

## Handling Auth Required Events

### React Implementation

```typescript
function AuthenticatedChat() {
  const [authRequired, setAuthRequired] = useState<AuthRequiredEvent | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const client = new A2AClient({
    agentCard: process.env.REACT_APP_AGENT_CARD_URL!,
    onAuthRequired: async (event) => {
      setAuthRequired(event);
      setIsAuthenticating(true);
    },
  });

  const handleAuthentication = async (authPart: AuthRequiredPart) => {
    // Open consent window
    const authWindow = window.open(
      authPart.consentLink,
      'oauth-consent',
      'width=600,height=700'
    );

    // Wait for completion
    return new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        authWindow?.close();
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  };

  const completeAuthentication = async () => {
    if (!authRequired) return;

    try {
      // Handle each auth requirement
      const completedParts = [];

      for (const authPart of authRequired.authParts) {
        await handleAuthentication(authPart);
        completedParts.push({
          serviceName: authPart.serviceName,
          status: 'completed',
        });
      }

      // Send completion message
      await client.message.send({
        message: {
          role: 'user',
          content: [{
            type: 'data',
            data: {
              type: 'AuthenticationCompleted',
              authParts: completedParts,
            },
          }],
        },
        context: {
          contextId: authRequired.contextId,
        },
      });

      setAuthRequired(null);
      setIsAuthenticating(false);

    } catch (error) {
      console.error('Authentication failed:', error);
      setIsAuthenticating(false);
    }
  };

  return (
    <div>
      {authRequired && (
        <AuthenticationModal
          authRequired={authRequired}
          onComplete={completeAuthentication}
          onCancel={() => setAuthRequired(null)}
        />
      )}

      <ChatWidget
        client={client}
        disabled={isAuthenticating}
      />
    </div>
  );
}
```

### Authentication Modal Component

```typescript
interface AuthenticationModalProps {
  authRequired: AuthRequiredEvent;
  onComplete: () => void;
  onCancel: () => void;
}

function AuthenticationModal({
  authRequired,
  onComplete,
  onCancel
}: AuthenticationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleStepComplete = (index: number) => {
    setCompletedSteps(prev => new Set(prev).add(index));

    if (index < authRequired.authParts.length - 1) {
      setCurrentStep(index + 1);
    } else {
      onComplete();
    }
  };

  const currentAuthPart = authRequired.authParts[currentStep];

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <h2>Authentication Required</h2>

        <div className="auth-steps">
          {authRequired.authParts.map((part, index) => (
            <div
              key={index}
              className={`auth-step ${
                completedSteps.has(index) ? 'completed' :
                index === currentStep ? 'active' : 'pending'
              }`}
            >
              {part.serviceIcon && (
                <img src={part.serviceIcon} alt={part.serviceName} />
              )}
              <span>{part.serviceName}</span>
              {completedSteps.has(index) && <CheckIcon />}
            </div>
          ))}
        </div>

        <div className="auth-content">
          <p>{currentAuthPart.description || `Authenticate with ${currentAuthPart.serviceName}`}</p>

          <button
            onClick={() => {
              window.open(currentAuthPart.consentLink, '_blank');
              // Simulate completion after user returns
              setTimeout(() => handleStepComplete(currentStep), 1000);
            }}
            className="auth-button"
          >
            Authenticate with {currentAuthPart.serviceName}
          </button>
        </div>

        <div className="auth-actions">
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

## Token Management

### Automatic Token Refresh

```typescript
class TokenManager {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: Date;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private authConfig: OAuth2AuthConfig,
    private onTokenRefresh?: (tokens: TokenPair) => void
  ) {
    this.accessToken = authConfig.accessToken;
    this.refreshToken = authConfig.refreshToken || '';
    this.expiresAt = new Date(Date.now() + (authConfig.expiresIn || 3600) * 1000);
  }

  async getAccessToken(): Promise<string> {
    // Check if token is expired or about to expire (5 min buffer)
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() + bufferTime >= this.expiresAt.getTime()) {
      await this.refresh();
    }

    return this.accessToken;
  }

  private async refresh(): Promise<void> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();

    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken || this.refreshToken;
    this.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    this.onTokenRefresh?.(tokens);
  }
}

// Usage with A2AClient
const tokenManager = new TokenManager(
  {
    accessToken: initialToken,
    refreshToken: initialRefresh,
    expiresIn: 3600,
  },
  (tokens) => {
    // Persist new tokens
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
  }
);

const client = new A2AClient({
  agentCard: '...',
  httpOptions: {
    onRequest: async (config) => {
      // Add fresh token to every request
      const token = await tokenManager.getAccessToken();
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
      return config;
    },
  },
});
```

### Secure Token Storage

```typescript
class SecureTokenStorage {
  private readonly STORAGE_KEY = 'a2a_auth_tokens';
  private readonly ENCRYPTION_KEY = 'your-encryption-key';

  async saveTokens(tokens: TokenPair): Promise<void> {
    // Encrypt tokens before storage
    const encrypted = await this.encrypt(JSON.stringify(tokens));

    // Use secure storage based on platform
    if (this.isElectron()) {
      // Electron: Use safeStorage API
      const { safeStorage } = require('electron');
      localStorage.setItem(this.STORAGE_KEY, safeStorage.encryptString(encrypted));
    } else if (this.isReactNative()) {
      // React Native: Use Keychain/Keystore
      const Keychain = require('react-native-keychain');
      await Keychain.setInternetCredentials('a2a-chat', 'tokens', encrypted);
    } else {
      // Web: Use sessionStorage (more secure than localStorage)
      sessionStorage.setItem(this.STORAGE_KEY, encrypted);
    }
  }

  async getTokens(): Promise<TokenPair | null> {
    let encrypted: string | null = null;

    if (this.isElectron()) {
      const { safeStorage } = require('electron');
      const stored = localStorage.getItem(this.STORAGE_KEY);
      encrypted = stored ? safeStorage.decryptString(stored) : null;
    } else if (this.isReactNative()) {
      const Keychain = require('react-native-keychain');
      const credentials = await Keychain.getInternetCredentials('a2a-chat');
      encrypted = credentials ? credentials.password : null;
    } else {
      encrypted = sessionStorage.getItem(this.STORAGE_KEY);
    }

    if (!encrypted) return null;

    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }

  async clearTokens(): Promise<void> {
    if (this.isElectron()) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else if (this.isReactNative()) {
      const Keychain = require('react-native-keychain');
      await Keychain.resetInternetCredentials('a2a-chat');
    } else {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private async encrypt(text: string): Promise<string> {
    // Use Web Crypto API for encryption
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedText: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedText), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = await this.getEncryptionKey();

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.ENCRYPTION_KEY);

    return crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private isElectron(): boolean {
    return typeof process !== 'undefined' && process.versions?.electron;
  }

  private isReactNative(): boolean {
    return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  }
}
```

## Multi-Service Authentication

Handle authentication with multiple services:

```typescript
interface ServiceAuth {
  serviceName: string;
  authType: 'oauth' | 'api-key' | 'custom';
  credentials?: any;
  expiresAt?: Date;
}

class MultiServiceAuthManager {
  private services: Map<string, ServiceAuth> = new Map();

  async authenticateService(serviceName: string, authConfig: any): Promise<void> {
    switch (authConfig.type) {
      case 'oauth':
        const tokens = await this.performOAuth(serviceName, authConfig);
        this.services.set(serviceName, {
          serviceName,
          authType: 'oauth',
          credentials: tokens,
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        });
        break;

      case 'api-key':
        this.services.set(serviceName, {
          serviceName,
          authType: 'api-key',
          credentials: { apiKey: authConfig.apiKey },
        });
        break;

      case 'custom':
        const customAuth = await authConfig.authenticate();
        this.services.set(serviceName, {
          serviceName,
          authType: 'custom',
          credentials: customAuth,
        });
        break;
    }
  }

  async getServiceAuth(serviceName: string): Promise<ServiceAuth | null> {
    const auth = this.services.get(serviceName);

    if (!auth) return null;

    // Check if expired
    if (auth.expiresAt && auth.expiresAt < new Date()) {
      // Try to refresh if OAuth
      if (auth.authType === 'oauth' && auth.credentials.refreshToken) {
        await this.refreshOAuth(serviceName, auth);
      } else {
        // Remove expired auth
        this.services.delete(serviceName);
        return null;
      }
    }

    return auth;
  }

  private async performOAuth(serviceName: string, config: any): Promise<any> {
    // Implementation depends on service
    // This is a generic OAuth flow
    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.scope);

    // Open auth window and wait for code
    const code = await this.getAuthorizationCode(authUrl.toString());

    // Exchange code for tokens
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });

    return response.json();
  }

  private async getAuthorizationCode(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const authWindow = window.open(authUrl, 'oauth', 'width=600,height=700');

      // Listen for redirect
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'oauth-callback') {
          window.removeEventListener('message', handleMessage);
          authWindow?.close();

          if (event.data.code) {
            resolve(event.data.code);
          } else {
            reject(new Error(event.data.error || 'Authorization failed'));
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if window was closed
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Authorization cancelled'));
        }
      }, 500);
    });
  }
}
```

## Security Best Practices

### 1. Never Expose Credentials

```typescript
// ❌ Bad: Credentials in client code
const client = new A2AClient({
  auth: {
    type: 'api-key',
    key: 'sk-1234567890', // NEVER DO THIS
  },
});

// ✅ Good: Use environment variables or proxy
const client = new A2AClient({
  auth: {
    type: 'bearer',
    token: await fetchTokenFromBackend(),
  },
});
```

### 2. Use HTTPS Only

```typescript
// Enforce HTTPS in production
if (window.location.protocol !== 'https:' && !isDevelopment) {
  window.location.protocol = 'https:';
}
```

### 3. Implement CSRF Protection

```typescript
// Add CSRF token to requests
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

const client = new A2AClient({
  httpOptions: {
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  },
});
```

### 4. Session Management

```typescript
class SessionManager {
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private lastActivity: Date = new Date();
  private timeoutId?: NodeJS.Timeout;

  startSession() {
    this.lastActivity = new Date();
    this.scheduleTimeout();

    // Track activity
    document.addEventListener('click', this.updateActivity);
    document.addEventListener('keypress', this.updateActivity);
  }

  private updateActivity = () => {
    this.lastActivity = new Date();
    this.scheduleTimeout();
  };

  private scheduleTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.endSession();
    }, this.sessionTimeout);
  }

  private endSession() {
    // Clear auth tokens
    tokenStorage.clearTokens();

    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Next Steps

- [Security Best Practices](./security) - Additional security measures
- [OAuth Integration](./oauth) - Detailed OAuth implementation
- [Examples](../examples/multi-session) - Authentication examples
- [API Reference](../api/client#authentication) - Auth API docs
