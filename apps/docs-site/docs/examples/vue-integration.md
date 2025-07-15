---
sidebar_position: 4
---

# Vue.js Integration

A2A Chat works seamlessly with Vue.js applications. This guide shows various integration patterns.

## Basic Vue 3 Integration

Using the A2AClient directly in a Vue component:

```vue
<!-- ChatComponent.vue -->
<template>
  <div class="chat-container">
    <header class="chat-header">
      <h1>AI Assistant</h1>
      <button @click="clearMessages" :disabled="messages.length === 0">Clear</button>
    </header>

    <div class="messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <div class="message-role">
          {{ message.role === 'user' ? 'You' : 'Assistant' }}
        </div>
        <div class="message-content">
          {{ message.content[0]?.content }}
        </div>
        <div class="message-time">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>

      <div v-if="isLoading" class="message assistant">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div v-if="error" class="error-message">Error: {{ error }}</div>
    </div>

    <form @submit.prevent="sendMessage" class="input-form">
      <input
        v-model="input"
        type="text"
        placeholder="Type your message..."
        :disabled="isLoading"
        class="message-input"
      />
      <button type="submit" :disabled="!input.trim() || isLoading" class="send-button">Send</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { A2AClient, type Message } from '@microsoft/a2achat-core';

// State
const messages = ref<Message[]>([]);
const input = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const messagesContainer = ref<HTMLElement>();

// Initialize client
const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
});

// Send message
async function sendMessage() {
  if (!input.value.trim() || isLoading.value) return;

  const userMessage: Message = {
    role: 'user',
    content: [{ type: 'text', content: input.value.trim() }],
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  input.value = '';
  isLoading.value = true;
  error.value = null;

  try {
    const messageRequest = {
      message: {
        role: 'user' as const,
        content: userMessage.content,
      },
    };

    let assistantMessage: Message | null = null;

    for await (const task of client.message.stream(messageRequest)) {
      const latestAssistant = task.messages.filter((m) => m.role === 'assistant').pop();

      if (latestAssistant) {
        if (!assistantMessage) {
          assistantMessage = {
            ...latestAssistant,
            timestamp: new Date(),
          };
          messages.value.push(assistantMessage);
        } else {
          assistantMessage.content = latestAssistant.content;
        }
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
}

// Clear messages
function clearMessages() {
  messages.value = [];
  error.value = null;
}

// Scroll to bottom
async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Format time
function formatTime(date?: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Add welcome message on mount
onMounted(() => {
  messages.value.push({
    role: 'assistant',
    content: [{ type: 'text', content: 'Hello! How can I help you today?' }],
    timestamp: new Date(),
  });
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header h1 {
  margin: 0;
  font-size: 18px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.message {
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-in;
}

.message.user {
  text-align: right;
}

.message-role {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.message-content {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 16px;
  max-width: 70%;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #007bff;
  color: white;
}

.message.assistant .message-content {
  background: #f1f1f1;
  color: #333;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 8px 16px;
  border-radius: 4px;
  margin: 8px 0;
}

.input-form {
  display: flex;
  padding: 16px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  gap: 8px;
}

.message-input {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
}

.message-input:focus {
  border-color: #007bff;
}

.send-button {
  padding: 8px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #0056b3;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## Vue Composable

Create a reusable composable for A2A Chat:

```typescript
// composables/useA2AChat.ts
import { ref, computed, type Ref } from 'vue';
import { A2AClient, type Message, type AgentCard } from '@microsoft/a2achat-core';

export interface UseA2AChatOptions {
  agentCard: string | AgentCard;
  welcomeMessage?: string;
  onError?: (error: Error) => void;
}

export function useA2AChat(options: UseA2AChatOptions) {
  // State
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const contextId = ref<string | undefined>();

  // Initialize client
  const client = new A2AClient({
    agentCard: options.agentCard,
  });

  // Add welcome message if provided
  if (options.welcomeMessage) {
    messages.value.push({
      role: 'assistant',
      content: [{ type: 'text', content: options.welcomeMessage }],
      timestamp: new Date(),
    });
  }

  // Computed
  const hasMessages = computed(() => messages.value.length > 0);
  const lastMessage = computed(() => messages.value[messages.value.length - 1]);

  // Send message
  async function sendMessage(content: string | MessageContent[]) {
    if (isLoading.value) return;

    const messageContent =
      typeof content === 'string' ? [{ type: 'text' as const, content }] : content;

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    messages.value.push(userMessage);
    isLoading.value = true;
    error.value = null;

    try {
      const request = {
        message: { role: 'user' as const, content: messageContent },
        context: contextId.value ? { contextId: contextId.value } : undefined,
      };

      let assistantMessage: Message | null = null;

      for await (const task of client.message.stream(request)) {
        // Update context ID
        if (task.contextId && !contextId.value) {
          contextId.value = task.contextId;
        }

        const latestAssistant = task.messages.filter((m) => m.role === 'assistant').pop();

        if (latestAssistant) {
          if (!assistantMessage) {
            assistantMessage = {
              ...latestAssistant,
              timestamp: new Date(),
            };
            messages.value.push(assistantMessage);
          } else {
            const index = messages.value.findIndex((m) => m === assistantMessage);
            if (index !== -1) {
              messages.value[index] = {
                ...assistantMessage,
                content: latestAssistant.content,
              };
            }
          }
        }
      }
    } catch (err) {
      error.value = err as Error;
      if (options.onError) {
        options.onError(err as Error);
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Clear messages
  function clearMessages() {
    messages.value = [];
    contextId.value = undefined;
    error.value = null;
  }

  // Retry last message
  async function retryLastMessage() {
    const userMessages = messages.value.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (lastUserMessage) {
      // Remove messages after the last user message
      const lastUserIndex = messages.value.indexOf(lastUserMessage);
      messages.value = messages.value.slice(0, lastUserIndex);
      await sendMessage(lastUserMessage.content);
    }
  }

  return {
    // State
    messages,
    isLoading,
    error,
    contextId,

    // Computed
    hasMessages,
    lastMessage,

    // Methods
    sendMessage,
    clearMessages,
    retryLastMessage,

    // Client instance
    client,
  };
}
```

## Using the Composable

```vue
<!-- SimplerChat.vue -->
<template>
  <div class="chat">
    <MessageList :messages="messages" :is-loading="isLoading" />

    <ErrorAlert v-if="error" :error="error" @retry="retryLastMessage" />

    <ChatInput @send="sendMessage" :disabled="isLoading" />
  </div>
</template>

<script setup lang="ts">
import { useA2AChat } from '@/composables/useA2AChat';
import MessageList from '@/components/MessageList.vue';
import ChatInput from '@/components/ChatInput.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';

const { messages, isLoading, error, sendMessage, retryLastMessage } = useA2AChat({
  agentCard: 'https://api.example.com/.well-known/agent.json',
  welcomeMessage: 'Hello! How can I assist you today?',
  onError: (error) => {
    console.error('Chat error:', error);
  },
});
</script>
```

## Vue 3 with TypeScript & Composition API

Full-featured chat with file uploads:

```vue
<!-- AdvancedChat.vue -->
<template>
  <div class="advanced-chat">
    <ChatHeader :agent-name="agentName" :is-online="isOnline" @clear="clearMessages" />

    <TransitionGroup name="message" tag="div" class="messages" ref="messagesEl">
      <MessageBubble
        v-for="message in messages"
        :key="message.id || message.timestamp"
        :message="message"
        @copy="copyMessage"
        @download="downloadMessage"
      />

      <TypingIndicator v-if="isLoading" key="typing" />
    </TransitionGroup>

    <div class="input-area">
      <FilePreview v-if="selectedFile" :file="selectedFile" @remove="selectedFile = null" />

      <div class="input-row">
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.pdf,.csv,.json"
          @change="handleFileSelect"
          style="display: none"
        />

        <button @click="$refs.fileInput.click()" :disabled="isLoading" class="attach-button">
          📎
        </button>

        <textarea
          v-model="input"
          @keydown.enter.prevent="handleEnter"
          placeholder="Type your message..."
          :disabled="isLoading"
          class="message-textarea"
          rows="1"
        />

        <button @click="sendMessage" :disabled="!canSend" class="send-button">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useA2AChat } from '@/composables/useA2AChat';
import type { Message, MessageContent } from '@microsoft/a2achat-core';

// Components
import ChatHeader from '@/components/ChatHeader.vue';
import MessageBubble from '@/components/MessageBubble.vue';
import TypingIndicator from '@/components/TypingIndicator.vue';
import FilePreview from '@/components/FilePreview.vue';

// Props
const props = defineProps<{
  agentCard: string;
  agentName?: string;
}>();

// Refs
const input = ref('');
const selectedFile = ref<File | null>(null);
const messagesEl = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();

// Composable
const {
  messages,
  isLoading,
  error,
  sendMessage: sendChatMessage,
  clearMessages,
} = useA2AChat({
  agentCard: props.agentCard,
  welcomeMessage: 'Welcome! I can help you with text and files.',
});

// Computed
const isOnline = computed(() => !error.value);
const canSend = computed(() => (input.value.trim() || selectedFile.value) && !isLoading.value);

// Send message with file
async function sendMessage() {
  if (!canSend.value) return;

  const content: MessageContent[] = [];

  if (input.value.trim()) {
    content.push({ type: 'text', content: input.value.trim() });
  }

  if (selectedFile.value) {
    const file = selectedFile.value;
    const base64 = await fileToBase64(file);
    content.push({
      type: 'file',
      filename: file.name,
      mimeType: file.type,
      data: base64,
    });
  }

  input.value = '';
  selectedFile.value = null;

  await sendChatMessage(content);
}

// Handle enter key
function handleEnter(event: KeyboardEvent) {
  if (!event.shiftKey) {
    sendMessage();
  } else {
    input.value += '\n';
  }
}

// Handle file selection
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
  }
}

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Copy message
function copyMessage(message: Message) {
  const text = message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.content)
    .join('\n');
  navigator.clipboard.writeText(text);
}

// Download message
function downloadMessage(message: Message) {
  const text = message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.content)
    .join('\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `message-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Auto-scroll to bottom
watch(messages, async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
});
</script>

<style scoped>
.advanced-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.input-area {
  border-top: 1px solid #e0e0e0;
  padding: 16px;
  background: #fafafa;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 20px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.attach-button,
.send-button {
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.attach-button {
  background: #f0f0f0;
}

.send-button {
  background: #007bff;
  color: white;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
```

## Pinia Store Integration

Use Pinia for state management:

```typescript
// stores/chat.ts
import { defineStore } from 'pinia';
import { A2AClient, type Message, type AgentCard } from '@microsoft/a2achat-core';

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: [] as ChatSession[],
    activeSessionId: null as string | null,
    isLoading: false,
    error: null as Error | null,
  }),

  getters: {
    activeSession(): ChatSession | undefined {
      return this.sessions.find((s) => s.id === this.activeSessionId);
    },

    activeMessages(): Message[] {
      return this.activeSession?.messages || [];
    },
  },

  actions: {
    createSession(agentCard: string | AgentCard) {
      const session: ChatSession = {
        id: `session-${Date.now()}`,
        agentCard,
        messages: [],
        contextId: undefined,
        createdAt: new Date(),
      };

      this.sessions.push(session);
      this.activeSessionId = session.id;

      return session;
    },

    async sendMessage(content: string) {
      const session = this.activeSession;
      if (!session || this.isLoading) return;

      const client = new A2AClient({ agentCard: session.agentCard });

      const userMessage: Message = {
        role: 'user',
        content: [{ type: 'text', content }],
        timestamp: new Date(),
      };

      session.messages.push(userMessage);
      this.isLoading = true;
      this.error = null;

      try {
        const request = {
          message: { role: 'user' as const, content: userMessage.content },
          context: session.contextId ? { contextId: session.contextId } : undefined,
        };

        for await (const task of client.message.stream(request)) {
          if (task.contextId && !session.contextId) {
            session.contextId = task.contextId;
          }

          const latestAssistant = task.messages.filter((m) => m.role === 'assistant').pop();

          if (latestAssistant) {
            const existingIndex = session.messages.findIndex(
              (m) => m.role === 'assistant' && m.id === latestAssistant.id
            );

            if (existingIndex === -1) {
              session.messages.push({
                ...latestAssistant,
                timestamp: new Date(),
              });
            } else {
              session.messages[existingIndex] = {
                ...session.messages[existingIndex],
                content: latestAssistant.content,
              };
            }
          }
        }
      } catch (error) {
        this.error = error as Error;
      } finally {
        this.isLoading = false;
      }
    },

    deleteSession(sessionId: string) {
      this.sessions = this.sessions.filter((s) => s.id !== sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = this.sessions[0]?.id || null;
      }
    },

    clearCurrentSession() {
      if (this.activeSession) {
        this.activeSession.messages = [];
        this.activeSession.contextId = undefined;
      }
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'a2a-chat-sessions',
        storage: localStorage,
      },
    ],
  },
});

interface ChatSession {
  id: string;
  agentCard: string | AgentCard;
  messages: Message[];
  contextId?: string;
  createdAt: Date;
}
```

## Nuxt 3 Integration

For Nuxt 3 applications:

```vue
<!-- pages/chat.vue -->
<template>
  <div>
    <NuxtLayout name="chat">
      <LazyChat :agent-card="agentCard" @error="handleError" />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// SSR-safe agent card loading
const { data: agentCard } = await useFetch('/api/agent-card');

// Error handling
function handleError(error: Error) {
  console.error('Chat error:', error);
  // Could use Nuxt's error handling
  throw createError({
    statusCode: 500,
    statusMessage: 'Chat service unavailable',
  });
}
</script>
```

```typescript
// plugins/a2achat.client.ts
export default defineNuxtPlugin(() => {
  // Only load on client side
  if (process.client) {
    // Any client-side initialization
  }
});
```

## Tips for Vue Integration

1. **Reactivity**: Use `ref` for primitive values and `reactive` for objects
2. **Performance**: Use `shallowRef` for large message arrays
3. **Transitions**: Add smooth transitions for messages
4. **Accessibility**: Use proper ARIA attributes
5. **SEO**: For Nuxt, consider SSG for static agent cards

## Next Steps

- [Basic Chat Example](./basic-chat) - Simple implementations
- [Custom UI Examples](./custom-ui) - Advanced interfaces
- [Theming Guide](../customization/theming) - Style customization
- [Plugin Development](../customization/plugins) - Vue plugins
