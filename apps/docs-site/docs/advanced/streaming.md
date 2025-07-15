---
sidebar_position: 1
---

# Streaming

A2A Chat uses Server-Sent Events (SSE) for real-time streaming communication with agents.

## Understanding SSE Streaming

### How It Works

1. Client sends a POST request with `Accept: text/event-stream`
2. Server responds with a stream of events
3. Each event contains JSON-RPC formatted data
4. Connection stays open for real-time updates

### Event Format

```
event: message
data: {"jsonrpc":"2.0","method":"task.update","params":{"task":{"id":"123","state":"running","messages":[...]}}}

event: message
data: {"jsonrpc":"2.0","method":"task.complete","params":{"task":{"id":"123","state":"completed"}}}

event: close
data: {"reason":"Task completed"}
```

## Client Implementation

### Basic Streaming

```typescript
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent.json',
});

// Stream messages
for await (const task of client.message.stream({
  message: {
    role: 'user',
    content: [{ type: 'text', content: 'Hello!' }],
  },
})) {
  console.log('Task update:', task);

  // Get latest assistant message
  const assistantMessage = task.messages.filter((m) => m.role === 'assistant').pop();

  if (assistantMessage) {
    console.log('Assistant:', assistantMessage.content[0]?.content);
  }
}
```

### Handling Streaming States

```typescript
interface StreamingChat {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessage: Message | null;
  error: Error | null;
}

function useStreamingChat() {
  const [state, setState] = useState<StreamingChat>({
    messages: [],
    isStreaming: false,
    currentStreamingMessage: null,
    error: null,
  });

  const sendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: [{ type: 'text', content }],
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      error: null,
    }));

    try {
      let streamingMessage: Message | null = null;

      for await (const task of client.message.stream({
        message: { role: 'user', content: userMessage.content },
      })) {
        const latestAssistant = task.messages.filter((m) => m.role === 'assistant').pop();

        if (latestAssistant) {
          if (!streamingMessage) {
            // First chunk - add new message
            streamingMessage = {
              ...latestAssistant,
              timestamp: new Date(),
            };

            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, streamingMessage!],
              currentStreamingMessage: streamingMessage,
            }));
          } else {
            // Update existing message
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((m) =>
                m === streamingMessage ? { ...m, content: latestAssistant.content } : m
              ),
              currentStreamingMessage: {
                ...streamingMessage,
                content: latestAssistant.content,
              },
            }));
          }
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        currentStreamingMessage: null,
      }));
    }
  };

  return { ...state, sendMessage };
}
```

### Custom SSE Client

For more control over the streaming process:

```typescript
import { SSEClient } from '@microsoft/a2achat-core';

class CustomStreamingClient {
  private sseClient: SSEClient;

  constructor(private agentUrl: string) {
    this.sseClient = new SSEClient();
  }

  async streamMessage(
    message: Message,
    onUpdate: (task: Task) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const url = `${this.agentUrl}/message`;

    try {
      await this.sseClient.stream({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: { message },
          id: `msg-${Date.now()}`,
        }),
        onMessage: (event) => {
          const data = JSON.parse(event.data);

          if (data.method === 'task.update') {
            onUpdate(data.params.task);
          } else if (data.method === 'task.complete') {
            // Streaming complete
            this.sseClient.close();
          }
        },
        onError: (error) => {
          onError?.(error);
        },
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }

  abort() {
    this.sseClient.close();
  }
}
```

## Streaming UI Patterns

### Character-by-Character Animation

```typescript
function AnimatedMessage({ content }: { content: string }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 20); // Adjust speed as needed

      return () => clearTimeout(timer);
    }
  }, [content, currentIndex]);

  return (
    <div className="message">
      {displayedContent}
      {currentIndex < content.length && <span className="cursor">|</span>}
    </div>
  );
}
```

### Progressive Rendering

```typescript
function StreamingMessage({ message }: { message: Message }) {
  const [chunks, setChunks] = useState<string[]>([]);
  const previousContent = useRef('');

  useEffect(() => {
    const content = message.content[0]?.content || '';

    if (content.length > previousContent.current.length) {
      // New content added
      const newChunk = content.slice(previousContent.current.length);
      setChunks(prev => [...prev, newChunk]);
      previousContent.current = content;
    }
  }, [message]);

  return (
    <div className="streaming-message">
      {chunks.map((chunk, index) => (
        <span
          key={index}
          className="chunk"
          style={{
            animation: `fadeIn 0.3s ease-in ${index * 0.05}s`,
            animationFillMode: 'both',
          }}
        >
          {chunk}
        </span>
      ))}
      <span className="typing-cursor" />
    </div>
  );
}
```

### Markdown Streaming

Handle markdown content while streaming:

````typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function StreamingMarkdown({ content }: { content: string }) {
  const [html, setHtml] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Parse markdown in chunks to avoid re-parsing entire content
    const parseMarkdown = async () => {
      try {
        // Configure marked for streaming
        marked.setOptions({
          breaks: true,
          gfm: true,
        });

        // Parse and sanitize
        const rawHtml = await marked(content);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        setHtml(cleanHtml);

        // Check if markdown is complete (no unclosed code blocks, etc.)
        const codeBlockCount = (content.match(/```/g) || []).length;
        setIsComplete(codeBlockCount % 2 === 0);
      } catch (error) {
        // Fallback to plain text if parsing fails
        setHtml(content);
      }
    };

    parseMarkdown();
  }, [content]);

  return (
    <div
      className={`markdown-content ${!isComplete ? 'streaming' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
````

## Advanced Streaming Features

### Stream Interruption

Allow users to stop streaming:

```typescript
function InterruptibleChat() {
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);
    setIsStreaming(true);

    try {
      for await (const task of client.message.stream(
        { message: { role: 'user', content: [{ type: 'text', content }] } },
        { signal: controller.signal }
      )) {
        // Handle updates
        updateMessages(task);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream interrupted by user');
      } else {
        console.error('Stream error:', error);
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const stopStreaming = () => {
    abortController?.abort();
  };

  return (
    <div>
      {/* Chat UI */}
      {isStreaming && (
        <button onClick={stopStreaming}>
          Stop Generating
        </button>
      )}
    </div>
  );
}
```

### Parallel Streaming

Handle multiple concurrent streams:

```typescript
class ParallelStreamManager {
  private streams: Map<string, SSEClient> = new Map();

  async startStream(
    id: string,
    request: MessageSendRequest,
    callbacks: {
      onUpdate: (task: Task) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ) {
    // Abort existing stream if any
    this.stopStream(id);

    const client = new SSEClient();
    this.streams.set(id, client);

    try {
      await client.stream({
        url: '/api/message',
        method: 'POST',
        body: JSON.stringify(request),
        onMessage: (event) => {
          const data = JSON.parse(event.data);
          if (data.method === 'task.update') {
            callbacks.onUpdate(data.params.task);
          } else if (data.method === 'task.complete') {
            callbacks.onComplete();
            this.stopStream(id);
          }
        },
        onError: callbacks.onError,
      });
    } catch (error) {
      callbacks.onError(error as Error);
      this.stopStream(id);
    }
  }

  stopStream(id: string) {
    const client = this.streams.get(id);
    if (client) {
      client.close();
      this.streams.delete(id);
    }
  }

  stopAllStreams() {
    for (const [id, client] of this.streams) {
      client.close();
    }
    this.streams.clear();
  }
}
```

### Streaming with Retry

Implement automatic retry for failed streams:

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class ResilientStreamingClient {
  constructor(
    private client: A2AClient,
    private retryConfig: RetryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    }
  ) {}

  async streamWithRetry(
    request: MessageSendRequest,
    onUpdate: (task: Task) => void
  ): Promise<void> {
    let retries = 0;
    let delay = this.retryConfig.initialDelay;

    while (retries <= this.retryConfig.maxRetries) {
      try {
        // Add retry context to request
        const retryRequest = {
          ...request,
          context: {
            ...request.context,
            retryAttempt: retries,
          },
        };

        // Attempt streaming
        for await (const task of this.client.message.stream(retryRequest)) {
          onUpdate(task);

          // Reset retry count on successful update
          retries = 0;
          delay = this.retryConfig.initialDelay;
        }

        // Success - exit retry loop
        return;
      } catch (error) {
        retries++;

        if (retries > this.retryConfig.maxRetries) {
          throw new Error(`Streaming failed after ${retries} attempts: ${error.message}`);
        }

        console.warn(`Stream attempt ${retries} failed, retrying in ${delay}ms...`);

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * this.retryConfig.backoffFactor, this.retryConfig.maxDelay);
      }
    }
  }
}
```

## Performance Optimization

### Chunked Updates

Batch UI updates for better performance:

```typescript
function useChunkedUpdates() {
  const [messages, setMessages] = useState<Message[]>([]);
  const updateQueue = useRef<Message[]>([]);
  const updateTimer = useRef<NodeJS.Timeout>();

  const flushUpdates = useCallback(() => {
    if (updateQueue.current.length > 0) {
      setMessages((prev) => {
        const newMessages = [...prev];

        // Process all queued updates
        for (const update of updateQueue.current) {
          const index = newMessages.findIndex((m) => m.id === update.id);
          if (index !== -1) {
            newMessages[index] = update;
          } else {
            newMessages.push(update);
          }
        }

        return newMessages;
      });

      updateQueue.current = [];
    }
  }, []);

  const queueUpdate = useCallback(
    (message: Message) => {
      updateQueue.current.push(message);

      // Debounce updates
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
      }

      updateTimer.current = setTimeout(flushUpdates, 50);
    },
    [flushUpdates]
  );

  return { messages, queueUpdate };
}
```

### Virtual Scrolling

Handle large message histories efficiently:

```typescript
import { VariableSizeList } from 'react-window';

function VirtualMessageList({ messages }: { messages: Message[] }) {
  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef<Map<number, number>>(new Map());

  const getRowHeight = (index: number) => {
    return rowHeights.current.get(index) || 100; // Default height
  };

  const setRowHeight = (index: number, height: number) => {
    if (rowHeights.current.get(index) !== height) {
      rowHeights.current.set(index, height);
      listRef.current?.resetAfterIndex(index);
    }
  };

  const Row = ({ index, style }: { index: number; style: any }) => {
    const message = messages[index];
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (rowRef.current) {
        setRowHeight(index, rowRef.current.clientHeight);
      }
    }, [index, message]);

    return (
      <div style={style}>
        <div ref={rowRef}>
          <MessageBubble message={message} />
        </div>
      </div>
    );
  };

  return (
    <VariableSizeList
      ref={listRef}
      height={600}
      itemCount={messages.length}
      itemSize={getRowHeight}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

## Error Handling

### Stream Error Recovery

```typescript
function useStreamErrorRecovery() {
  const [connectionState, setConnectionState] = useState<
    'connected' | 'disconnected' | 'reconnecting'
  >('connected');

  const handleStreamError = useCallback(async (error: Error) => {
    console.error('Stream error:', error);

    // Determine error type
    if (error.message.includes('network')) {
      setConnectionState('disconnected');

      // Wait for network recovery
      await waitForNetwork();

      setConnectionState('reconnecting');

      // Retry last message
      retryLastMessage();
    } else if (error.message.includes('timeout')) {
      // Handle timeout specifically
      showNotification('Request timed out. Please try again.', 'warning');
    } else {
      // Generic error handling
      showNotification('An error occurred. Please try again.', 'error');
    }
  }, []);

  const waitForNetwork = () => {
    return new Promise<void>((resolve) => {
      const checkConnection = () => {
        if (navigator.onLine) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
  };

  return { connectionState, handleStreamError };
}
```

## Next Steps

- [Authentication](./authentication) - Secure streaming
- [Performance](./performance) - Optimize streaming
- [Examples](../examples/custom-ui) - See streaming in action
- [API Reference](../api/client#streaming) - Streaming API docs
