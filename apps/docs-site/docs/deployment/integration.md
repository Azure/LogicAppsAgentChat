---
sidebar_position: 2
---

# Integration Guide

Learn how to integrate A2A Chat into existing applications and frameworks.

## Framework Integration

### React Applications

#### Create React App

```bash
npx create-react-app my-app --template typescript
cd my-app
npm install @microsoft/a2achat-core
```

```tsx
// App.tsx
import React from 'react';
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

function App() {
  return (
    <div className="App">
      <header>My Application</header>
      <main>
        <ChatWidget agentCard={process.env.REACT_APP_AGENT_CARD_URL} userName="User" />
      </main>
    </div>
  );
}

export default App;
```

#### Next.js

```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm install @microsoft/a2achat-core
```

```tsx
// app/components/Chat.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import for client-side only
const ChatWidget = dynamic(
  () => import('@microsoft/a2achat-core/react').then((mod) => mod.ChatWidget),
  {
    ssr: false,
    loading: () => <div>Loading chat...</div>,
  }
);

export function Chat() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatWidget agentCard={process.env.NEXT_PUBLIC_AGENT_CARD_URL!} />
    </Suspense>
  );
}
```

```tsx
// app/page.tsx
import { Chat } from './components/Chat';

export default function Home() {
  return (
    <main>
      <h1>Welcome</h1>
      <Chat />
    </main>
  );
}
```

#### Remix

```tsx
// app/components/Chat.client.tsx
import { ChatWidget } from '@microsoft/a2achat-core/react';
import '@microsoft/a2achat-core/react/styles.css';

export default function Chat() {
  return <ChatWidget agentCard={window.ENV.AGENT_CARD_URL} />;
}
```

```tsx
// app/routes/index.tsx
import { lazy, Suspense } from 'react';

const Chat = lazy(() => import('~/components/Chat.client'));

export default function Index() {
  return (
    <div>
      <h1>Welcome</h1>
      <Suspense fallback={<div>Loading chat...</div>}>
        <Chat />
      </Suspense>
    </div>
  );
}
```

### Vue.js Applications

#### Vue 3 with Vite

```bash
npm create vite@latest my-app -- --template vue-ts
cd my-app
npm install @microsoft/a2achat-core
```

```vue
<!-- src/components/Chat.vue -->
<template>
  <div class="chat-wrapper">
    <div ref="chatContainer" class="chat-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { A2AClient } from '@microsoft/a2achat-core';

const chatContainer = ref<HTMLElement>();
let client: A2AClient | null = null;

onMounted(() => {
  // Initialize A2A client
  client = new A2AClient({
    agentCard: import.meta.env.VITE_AGENT_CARD_URL,
  });

  // Create chat UI
  // (See Vue integration examples for full implementation)
});

onUnmounted(() => {
  // Cleanup
  client = null;
});
</script>
```

#### Nuxt 3

```bash
npx nuxi init my-app
cd my-app
npm install @microsoft/a2achat-core
```

```vue
<!-- components/Chat.vue -->
<template>
  <ClientOnly>
    <div class="chat-container">
      <!-- Chat implementation -->
    </div>
    <template #fallback>
      <div>Loading chat...</div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
// Chat implementation
</script>
```

### Angular Applications

```bash
ng new my-app
cd my-app
npm install @microsoft/a2achat-core
```

```typescript
// chat.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { A2AClient } from '@microsoft/a2achat-core';

@Component({
  selector: 'app-chat',
  template: `
    <div class="chat-container">
      <div class="messages">
        <div
          *ngFor="let message of messages"
          [class.user]="message.role === 'user'"
          [class.assistant]="message.role === 'assistant'"
        >
          {{ message.content[0]?.content }}
        </div>
      </div>
      <form (ngSubmit)="sendMessage()">
        <input [(ngModel)]="input" name="message" />
        <button type="submit">Send</button>
      </form>
    </div>
  `,
})
export class ChatComponent implements OnInit, OnDestroy {
  client: A2AClient;
  messages: any[] = [];
  input = '';

  ngOnInit() {
    this.client = new A2AClient({
      agentCard: environment.agentCardUrl,
    });
  }

  async sendMessage() {
    if (!this.input.trim()) return;

    // Add user message
    this.messages.push({
      role: 'user',
      content: [{ type: 'text', content: this.input }],
    });

    // Send to agent
    const response = await this.client.message.send({
      message: {
        role: 'user',
        content: [{ type: 'text', content: this.input }],
      },
    });

    // Add response
    this.messages.push(...response.messages);
    this.input = '';
  }

  ngOnDestroy() {
    // Cleanup
  }
}
```

## Iframe Integration

### Basic Iframe

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <h1>Welcome</h1>

    <!-- A2A Chat Iframe -->
    <iframe
      id="a2a-chat"
      src="https://chat.example.com/iframe"
      width="400"
      height="600"
      frameborder="0"
      allow="clipboard-write"
    ></iframe>

    <script>
      // Configure iframe
      const iframe = document.getElementById('a2a-chat');

      iframe.onload = () => {
        // Send configuration
        iframe.contentWindow.postMessage(
          {
            type: 'configure',
            config: {
              agentCard: 'https://api.example.com/.well-known/agent-card.json',
              userName: 'John Doe',
              theme: 'light',
            },
          },
          'https://chat.example.com'
        );
      };

      // Listen for messages
      window.addEventListener('message', (event) => {
        if (event.origin !== 'https://chat.example.com') return;

        if (event.data.type === 'chat-ready') {
          console.log('Chat is ready');
        }

        if (event.data.type === 'message-sent') {
          console.log('User sent:', event.data.message);
        }
      });
    </script>
  </body>
</html>
```

### Advanced Iframe Communication

```typescript
// iframe-manager.ts
export class IframeManager {
  private iframe: HTMLIFrameElement;
  private origin: string;
  private ready = false;
  private queue: any[] = [];

  constructor(
    private container: HTMLElement,
    private config: {
      url: string;
      agentCard: string;
      theme?: 'light' | 'dark';
      userName?: string;
    }
  ) {
    this.origin = new URL(config.url).origin;
    this.createIframe();
    this.setupListeners();
  }

  private createIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.config.url;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.allow = 'clipboard-write';

    this.container.appendChild(this.iframe);
  }

  private setupListeners() {
    window.addEventListener('message', this.handleMessage.bind(this));

    this.iframe.onload = () => {
      this.sendMessage('configure', {
        agentCard: this.config.agentCard,
        theme: this.config.theme,
        userName: this.config.userName,
      });
    };
  }

  private handleMessage(event: MessageEvent) {
    if (event.origin !== this.origin) return;

    switch (event.data.type) {
      case 'ready':
        this.ready = true;
        this.flushQueue();
        break;

      case 'resize':
        this.iframe.style.height = event.data.height + 'px';
        break;

      case 'message':
        this.onMessage?.(event.data.message);
        break;
    }
  }

  private sendMessage(type: string, data: any) {
    const message = { type, ...data };

    if (this.ready) {
      this.iframe.contentWindow?.postMessage(message, this.origin);
    } else {
      this.queue.push(message);
    }
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      this.iframe.contentWindow?.postMessage(message, this.origin);
    }
  }

  // Public API
  sendUserMessage(text: string) {
    this.sendMessage('user-message', { text });
  }

  clearChat() {
    this.sendMessage('clear-chat', {});
  }

  updateTheme(theme: 'light' | 'dark') {
    this.sendMessage('update-theme', { theme });
  }

  onMessage?: (message: any) => void;
}

// Usage
const chatManager = new IframeManager(document.getElementById('chat-container')!, {
  url: 'https://chat.example.com/iframe',
  agentCard: 'https://api.example.com/.well-known/agent-card.json',
  theme: 'light',
  userName: 'John Doe',
});

chatManager.onMessage = (message) => {
  console.log('Received message:', message);
};
```

## Web Components

Create a reusable web component:

```typescript
// a2a-chat-element.ts
import { A2AClient } from '@microsoft/a2achat-core';

class A2AChatElement extends HTMLElement {
  private client: A2AClient;
  private shadow: ShadowRoot;

  static get observedAttributes() {
    return ['agent-card', 'user-name', 'theme'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initializeClient();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.initializeClient();
    }
  }

  private initializeClient() {
    const agentCard = this.getAttribute('agent-card');
    if (!agentCard) return;

    this.client = new A2AClient({ agentCard });
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--chat-bg, #fff);
          border: 1px solid var(--chat-border, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        
        .input-area {
          display: flex;
          padding: 16px;
          border-top: 1px solid var(--chat-border, #e0e0e0);
        }
        
        input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          outline: none;
        }
        
        button {
          margin-left: 8px;
          padding: 8px 16px;
          background: var(--chat-primary, #0078d4);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
        }
      </style>
      
      <div class="chat-container">
        <div class="messages" id="messages"></div>
        <div class="input-area">
          <input type="text" id="input" placeholder="Type a message..." />
          <button id="send">Send</button>
        </div>
      </div>
    `;

    // Add event listeners
    const input = this.shadow.getElementById('input') as HTMLInputElement;
    const sendBtn = this.shadow.getElementById('send');

    sendBtn?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  private async sendMessage() {
    const input = this.shadow.getElementById('input') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    // Add message to UI
    this.addMessage('user', text);
    input.value = '';

    // Send to agent
    try {
      for await (const task of this.client.message.stream({
        message: {
          role: 'user',
          content: [{ type: 'text', content: text }],
        },
      })) {
        const assistantMessage = task.messages.filter((m) => m.role === 'assistant').pop();

        if (assistantMessage) {
          this.addMessage('assistant', assistantMessage.content[0]?.content || '');
        }
      }
    } catch (error) {
      this.addMessage('error', 'Failed to send message');
    }
  }

  private addMessage(role: string, content: string) {
    const messages = this.shadow.getElementById('messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = content;
    messages?.appendChild(messageEl);
    messages?.scrollTo(0, messages.scrollHeight);
  }
}

// Register the web component
customElements.define('a2a-chat', A2AChatElement);
```

Usage:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./a2a-chat-element.js"></script>
    <style>
      a2a-chat {
        --chat-primary: #6366f1;
        --chat-bg: #ffffff;
        --chat-border: #e5e7eb;
      }
    </style>
  </head>
  <body>
    <a2a-chat
      agent-card="https://api.example.com/.well-known/agent-card.json"
      user-name="John Doe"
      theme="light"
    ></a2a-chat>
  </body>
</html>
```

## WordPress Plugin

Create a WordPress plugin for A2A Chat:

```php
<?php
/**
 * Plugin Name: A2A Chat
 * Description: Add A2A Chat to your WordPress site
 * Version: 1.0.0
 */

// Enqueue scripts
function a2a_chat_enqueue_scripts() {
    wp_enqueue_script(
        'a2a-chat',
        'https://unpkg.com/@microsoft/a2achat-core/dist/index.js',
        array(),
        '1.0.0',
        true
    );

    wp_enqueue_style(
        'a2a-chat-styles',
        'https://unpkg.com/@microsoft/a2achat-core/dist/styles.css',
        array(),
        '1.0.0'
    );

    wp_localize_script('a2a-chat', 'a2aChatConfig', array(
        'agentCard' => get_option('a2a_chat_agent_card'),
        'position' => get_option('a2a_chat_position', 'bottom-right'),
        'theme' => get_option('a2a_chat_theme', 'light'),
    ));
}
add_action('wp_enqueue_scripts', 'a2a_chat_enqueue_scripts');

// Add chat to footer
function a2a_chat_footer() {
    ?>
    <div id="a2a-chat-widget"></div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (window.A2AClient) {
                const client = new A2AClient({
                    agentCard: a2aChatConfig.agentCard
                });
                // Initialize chat widget
            }
        });
    </script>
    <?php
}
add_action('wp_footer', 'a2a_chat_footer');

// Admin settings page
function a2a_chat_admin_menu() {
    add_options_page(
        'A2A Chat Settings',
        'A2A Chat',
        'manage_options',
        'a2a-chat',
        'a2a_chat_settings_page'
    );
}
add_action('admin_menu', 'a2a_chat_admin_menu');

function a2a_chat_settings_page() {
    ?>
    <div class="wrap">
        <h1>A2A Chat Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('a2a_chat_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">Agent Card URL</th>
                    <td>
                        <input type="url"
                               name="a2a_chat_agent_card"
                               value="<?php echo get_option('a2a_chat_agent_card'); ?>"
                               class="regular-text" />
                    </td>
                </tr>
                <tr>
                    <th scope="row">Position</th>
                    <td>
                        <select name="a2a_chat_position">
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Theme</th>
                    <td>
                        <select name="a2a_chat_theme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Register settings
function a2a_chat_register_settings() {
    register_setting('a2a_chat_settings', 'a2a_chat_agent_card');
    register_setting('a2a_chat_settings', 'a2a_chat_position');
    register_setting('a2a_chat_settings', 'a2a_chat_theme');
}
add_action('admin_init', 'a2a_chat_register_settings');
```

## Mobile App Integration

### React Native

```typescript
// ChatScreen.tsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native';

export function ChatScreen() {
  const chatUrl = 'https://chat.example.com/mobile';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{ uri: chatUrl }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          console.log('Message from chat:', data);
        }}
        injectedJavaScript={`
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'ready' })
          );
        `}
      />
    </SafeAreaView>
  );
}
```

### Flutter

```dart
// chat_screen.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late WebViewController _controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('A2A Chat')),
      body: WebView(
        initialUrl: 'https://chat.example.com/mobile',
        javascriptMode: JavascriptMode.unrestricted,
        onWebViewCreated: (WebViewController controller) {
          _controller = controller;
        },
        javascriptChannels: {
          JavascriptChannel(
            name: 'ChatChannel',
            onMessageReceived: (JavascriptMessage message) {
              print('Message from chat: ${message.message}');
            },
          ),
        },
      ),
    );
  }
}
```

## Browser Extension

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "A2A Chat Assistant",
  "version": "1.0.0",
  "description": "A2A Chat assistant for your browser",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        width: 400px;
        height: 600px;
        margin: 0;
        padding: 0;
      }
      #chat-container {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="chat-container"></div>
    <script src="popup.js"></script>
  </body>
</html>
```

```javascript
// popup.js
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent-card.json',
});

// Initialize chat UI
// ... implementation
```

## Next Steps

- [API Integration](./api-integration) - Backend integration
- [Security](./security) - Security considerations
- [Performance](./performance) - Performance optimization
- [Troubleshooting](../troubleshooting) - Common issues
