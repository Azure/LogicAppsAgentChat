---
sidebar_position: 2
---

# Plugins

Extend A2A Chat functionality with custom plugins.

## Plugin Architecture

A2A Chat provides a flexible plugin system that allows you to:

- Intercept and transform messages
- Add custom UI elements
- Track analytics events
- Implement custom authentication
- Add new features without modifying core code

## Creating a Plugin

### Basic Plugin Structure

```typescript
import { ChatPlugin, PluginContext } from '@microsoft/a2achat-core/react';

export const myPlugin: ChatPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  // Lifecycle hooks
  async onInit(context: PluginContext) {
    console.log('Plugin initialized');
  },

  async onDestroy() {
    console.log('Plugin destroyed');
  },

  // Message hooks
  async onMessageSent(message) {
    console.log('User sent:', message);
  },

  async onMessageReceived(message) {
    console.log('Assistant sent:', message);
  },

  // Transform messages before sending/receiving
  async transformOutgoing(message) {
    // Add metadata to all outgoing messages
    return {
      ...message,
      metadata: {
        ...message.metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    };
  },

  async transformIncoming(message) {
    // Process incoming messages
    return message;
  },
};
```

### Using Plugins

```tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
import { analyticsPlugin } from './plugins/analytics';
import { authPlugin } from './plugins/auth';
import { translationPlugin } from './plugins/translation';

function App() {
  return <ChatWidget agentCard="..." plugins={[analyticsPlugin, authPlugin, translationPlugin]} />;
}
```

## Built-in Plugins

### Analytics Plugin

Track user interactions and chat metrics:

```typescript
import { ChatPlugin } from '@microsoft/a2achat-core/react';

interface AnalyticsConfig {
  trackingId: string;
  endpoint?: string;
  debug?: boolean;
}

export function createAnalyticsPlugin(config: AnalyticsConfig): ChatPlugin {
  let sessionId: string;
  let messageCount = 0;

  return {
    name: 'analytics',
    version: '1.0.0',

    async onInit(context) {
      sessionId = `session-${Date.now()}`;

      // Track session start
      await track('session_start', {
        sessionId,
        timestamp: new Date().toISOString(),
      });
    },

    async onMessageSent(message) {
      messageCount++;

      await track('message_sent', {
        sessionId,
        messageCount,
        messageLength: message.content[0]?.content?.length || 0,
        hasAttachments: message.attachments?.length > 0,
      });
    },

    async onMessageReceived(message) {
      await track('message_received', {
        sessionId,
        responseTime: Date.now() - lastMessageTime,
        messageLength: message.content[0]?.content?.length || 0,
      });
    },

    async onMessageError(error, message) {
      await track('message_error', {
        sessionId,
        error: error.message,
        messageContent: message.content[0]?.content,
      });
    },

    async onSessionEnd(sessionId) {
      await track('session_end', {
        sessionId,
        duration: Date.now() - sessionStart,
        totalMessages: messageCount,
      });
    },
  };

  async function track(event: string, properties: any) {
    if (config.debug) {
      console.log(`[Analytics] ${event}:`, properties);
    }

    // Send to analytics endpoint
    await fetch(config.endpoint || '/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: config.trackingId,
        event,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

// Usage
const analyticsPlugin = createAnalyticsPlugin({
  trackingId: 'UA-XXXXX',
  debug: true,
});
```

### Logger Plugin

Advanced logging with different levels:

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  remote?: {
    endpoint: string;
    apiKey: string;
  };
}

export function createLoggerPlugin(config: LoggerConfig): ChatPlugin {
  const log = (level: LogLevel, message: string, data?: any) => {
    if (level < config.level) return;

    const timestamp = new Date().toISOString();
    const prefix = config.prefix || '[A2A Chat]';
    const levelStr = LogLevel[level];

    const logMessage = `${timestamp} ${prefix} ${levelStr}: ${message}`;

    // Console logging
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, data);
        break;
    }

    // Remote logging
    if (config.remote && level >= LogLevel.WARN) {
      fetch(config.remote.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.remote.apiKey,
        },
        body: JSON.stringify({
          level: levelStr,
          message,
          data,
          timestamp,
        }),
      }).catch(() => {
        // Silently fail remote logging
      });
    }
  };

  return {
    name: 'logger',
    version: '1.0.0',

    onInit() {
      log(LogLevel.INFO, 'Chat initialized');
    },

    onMessageSent(message) {
      log(LogLevel.DEBUG, 'Message sent', {
        role: message.role,
        contentLength: message.content[0]?.content?.length,
      });
    },

    onMessageError(error, message) {
      log(LogLevel.ERROR, 'Message error', {
        error: error.message,
        stack: error.stack,
        message,
      });
    },
  };
}
```

### Translation Plugin

Auto-translate messages:

```typescript
interface TranslationConfig {
  targetLanguage: string;
  apiKey: string;
  autoDetect?: boolean;
}

export function createTranslationPlugin(config: TranslationConfig): ChatPlugin {
  const translateText = async (text: string, from?: string): Promise<string> => {
    const response = await fetch('https://translation.api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        text,
        from: from || 'auto',
        to: config.targetLanguage,
      }),
    });

    const { translatedText } = await response.json();
    return translatedText;
  };

  return {
    name: 'translation',
    version: '1.0.0',

    async transformOutgoing(message) {
      // Translate user messages to English for the agent
      if (config.targetLanguage !== 'en') {
        const content = message.content[0];
        if (content?.type === 'text') {
          const translatedText = await translateText(content.content, config.targetLanguage);

          return {
            ...message,
            content: [
              {
                type: 'text',
                content: translatedText,
              },
            ],
            metadata: {
              ...message.metadata,
              originalLanguage: config.targetLanguage,
              originalText: content.content,
            },
          };
        }
      }
      return message;
    },

    async transformIncoming(message) {
      // Translate agent responses to user's language
      if (config.targetLanguage !== 'en') {
        const content = message.content[0];
        if (content?.type === 'text') {
          const translatedText = await translateText(content.content, 'en');

          return {
            ...message,
            content: [
              {
                type: 'text',
                content: translatedText,
              },
            ],
          };
        }
      }
      return message;
    },
  };
}
```

### Moderation Plugin

Filter inappropriate content:

```typescript
interface ModerationConfig {
  apiKey: string;
  threshold?: number;
  blockMessage?: string;
}

export function createModerationPlugin(config: ModerationConfig): ChatPlugin {
  const checkContent = async (text: string): Promise<boolean> => {
    const response = await fetch('https://moderation.api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ text }),
    });

    const { safe, confidence } = await response.json();
    return safe && confidence >= (config.threshold || 0.8);
  };

  return {
    name: 'moderation',
    version: '1.0.0',

    async transformOutgoing(message) {
      const content = message.content[0];
      if (content?.type === 'text') {
        const isSafe = await checkContent(content.content);

        if (!isSafe) {
          // Block the message
          throw new Error(config.blockMessage || 'Message blocked by moderation');
        }
      }

      return message;
    },
  };
}
```

## Advanced Plugin Examples

### Voice Input Plugin

Add voice input capabilities:

```typescript
export const voiceInputPlugin: ChatPlugin = {
  name: 'voice-input',
  version: '1.0.0',

  async onInit(context) {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    // Add voice input button to UI
    const button = document.createElement('button');
    button.innerHTML = '🎤';
    button.className = 'voice-input-button';
    button.onclick = () => startVoiceInput(context);

    // Insert button into chat input area
    const inputArea = document.querySelector('.chat-input-area');
    inputArea?.appendChild(button);
  },
};

async function startVoiceInput(context: PluginContext) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;

    // Update input field
    const input = document.querySelector('.chat-input') as HTMLInputElement;
    if (input) {
      input.value = transcript;
    }
  };

  recognition.onerror = (event) => {
    context.ui.showNotification('Voice input error', 'error');
  };

  recognition.start();
}
```

### Persistence Plugin

Save chat history to local storage:

```typescript
interface PersistenceConfig {
  storageKey?: string;
  maxMessages?: number;
  encryptionKey?: string;
}

export function createPersistencePlugin(config: PersistenceConfig = {}): ChatPlugin {
  const storageKey = config.storageKey || 'a2a-chat-history';
  const maxMessages = config.maxMessages || 100;

  const encrypt = (data: string): string => {
    // Simple XOR encryption (use a proper encryption library in production)
    if (!config.encryptionKey) return data;

    return btoa(
      data
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ config.encryptionKey.charCodeAt(i % config.encryptionKey.length)
          )
        )
        .join('')
    );
  };

  const decrypt = (data: string): string => {
    if (!config.encryptionKey) return data;

    return atob(data)
      .split('')
      .map((char, i) =>
        String.fromCharCode(
          char.charCodeAt(0) ^ config.encryptionKey.charCodeAt(i % config.encryptionKey.length)
        )
      )
      .join('');
  };

  return {
    name: 'persistence',
    version: '1.0.0',

    async onInit(context) {
      // Load saved messages
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const decrypted = decrypt(saved);
          const messages = JSON.parse(decrypted);

          // Restore messages to store
          messages.forEach((msg: any) => {
            context.store.addMessage(msg);
          });
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    },

    async onMessageSent(message) {
      await this.saveMessages();
    },

    async onMessageReceived(message) {
      await this.saveMessages();
    },

    async saveMessages() {
      try {
        const messages = context.store.getMessages();
        const toSave = messages.slice(-maxMessages); // Keep only recent messages

        const encrypted = encrypt(JSON.stringify(toSave));
        localStorage.setItem(storageKey, encrypted);
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    },
  };
}
```

### Command Plugin

Add slash commands to chat:

```typescript
interface Command {
  name: string;
  description: string;
  execute: (args: string[], context: PluginContext) => Promise<void>;
}

export function createCommandPlugin(commands: Command[]): ChatPlugin {
  const commandMap = new Map(commands.map((cmd) => [cmd.name, cmd]));

  return {
    name: 'commands',
    version: '1.0.0',

    async transformOutgoing(message, context) {
      const content = message.content[0];
      if (content?.type === 'text' && content.content.startsWith('/')) {
        const [cmdName, ...args] = content.content.slice(1).split(' ');
        const command = commandMap.get(cmdName);

        if (command) {
          // Execute command instead of sending message
          await command.execute(args, context);

          // Cancel message send
          throw new Error('COMMAND_EXECUTED');
        }
      }

      return message;
    },
  };
}

// Example commands
const commands: Command[] = [
  {
    name: 'clear',
    description: 'Clear chat history',
    async execute(args, context) {
      context.store.clearMessages();
      context.ui.showNotification('Chat cleared', 'success');
    },
  },
  {
    name: 'export',
    description: 'Export chat history',
    async execute(args, context) {
      const messages = context.store.getMessages();
      const json = JSON.stringify(messages, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      context.ui.showNotification('Chat exported', 'success');
    },
  },
  {
    name: 'theme',
    description: 'Change theme (light/dark)',
    async execute(args, context) {
      const theme = args[0] || 'light';
      context.store.setTheme(theme as 'light' | 'dark');
      context.ui.showNotification(`Theme changed to ${theme}`, 'success');
    },
  },
];

// Usage
const commandPlugin = createCommandPlugin(commands);
```

## Plugin Development Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Performance**: Avoid blocking operations in hooks
3. **Cleanup**: Clean up resources in `onDestroy`
4. **Type Safety**: Use TypeScript for better IDE support
5. **Documentation**: Document your plugin's features and configuration
6. **Testing**: Write tests for your plugins
7. **Versioning**: Follow semantic versioning

## Plugin API Reference

See the [Plugin API documentation](../api/plugins) for complete API reference.

## Next Steps

- [Component Customization](./components) - Override default components
- [Examples](../examples/custom-ui) - See plugins in action
- [API Reference](../api/plugins) - Complete plugin API
- [Publishing Plugins](./publishing) - Share your plugins
