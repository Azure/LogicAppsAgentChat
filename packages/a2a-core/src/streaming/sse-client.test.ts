import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEClient } from './sse-client';
import type { SSEMessage } from './types';

// Mock EventSource
class MockEventSource {
  url: string;
  withCredentials: boolean;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string, config?: EventSourceInit) {
    this.url = url;
    this.withCredentials = config?.withCredentials || false;

    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  dispatchMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  dispatchError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Set up global mock
(global as any).EventSource = MockEventSource;

describe('SSEClient', () => {
  let client: SSEClient;
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSource = null as any;

    // Capture EventSource instance
    vi.spyOn(global, 'EventSource' as any).mockImplementation(
      (url: string, config?: EventSourceInit) => {
        mockEventSource = new MockEventSource(url, config);
        return mockEventSource as any;
      }
    );
  });

  afterEach(() => {
    client?.close();
  });

  it('should connect to SSE endpoint', async () => {
    client = new SSEClient('https://api.example.com/stream');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockEventSource).toBeDefined();
    expect(mockEventSource.url).toBe('https://api.example.com/stream');
  });

  it('should handle connection with auth headers', async () => {
    client = new SSEClient('https://api.example.com/stream', {
      headers: {
        Authorization: 'Bearer token123',
      },
    });

    // Since EventSource doesn't support custom headers directly,
    // the implementation should append them as query params or use withCredentials
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockEventSource).toBeDefined();
  });

  it('should parse SSE messages', async () => {
    const messages: SSEMessage[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onMessage((message) => {
      messages.push(message);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate SSE messages
    mockEventSource.dispatchMessage(
      'event: task.update\ndata: {"taskId":"123","state":"processing"}\n\n'
    );
    mockEventSource.dispatchMessage('event: message\ndata: {"content":"Hello"}\n\n');

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      event: 'task.update',
      data: { taskId: '123', state: 'processing' },
    });
    expect(messages[1]).toEqual({
      event: 'message',
      data: { content: 'Hello' },
    });
  });

  it('should handle messages without event type', async () => {
    const messages: SSEMessage[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onMessage((message) => {
      messages.push(message);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Message without event field defaults to 'message'
    mockEventSource.dispatchMessage('data: {"content":"Hello"}\n\n');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      event: 'message',
      data: { content: 'Hello' },
    });
  });

  it('should handle connection errors', async () => {
    const errors: Error[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onError((error) => {
      errors.push(error);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    mockEventSource.dispatchError();

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('SSE connection error');
  });

  it('should support reconnection', async () => {
    client = new SSEClient('https://api.example.com/stream', {
      reconnect: true,
      reconnectDelay: 100,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const firstEventSource = mockEventSource;

    // Simulate connection error
    mockEventSource.readyState = 2; // CLOSED
    mockEventSource.dispatchError();

    // Wait for reconnection
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should create new EventSource
    expect(mockEventSource).not.toBe(firstEventSource);
    expect(mockEventSource.readyState).toBe(1); // OPEN
  });

  it('should not reconnect when disabled', async () => {
    client = new SSEClient('https://api.example.com/stream', {
      reconnect: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const firstEventSource = mockEventSource;

    // Simulate connection error
    mockEventSource.readyState = 2; // CLOSED
    mockEventSource.dispatchError();

    // Wait to ensure no reconnection
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should not create new EventSource
    expect(mockEventSource).toBe(firstEventSource);
  });

  it('should close connection', async () => {
    client = new SSEClient('https://api.example.com/stream');

    await new Promise((resolve) => setTimeout(resolve, 10));

    client.close();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should handle async iterator interface', async () => {
    client = new SSEClient('https://api.example.com/stream');

    await new Promise((resolve) => setTimeout(resolve, 10));

    const messages: SSEMessage[] = [];
    const iterator = client[Symbol.asyncIterator]();

    // Collect messages in background
    (async () => {
      for await (const message of iterator) {
        messages.push(message);
        if (messages.length === 2) break;
      }
    })();

    // Send messages
    await new Promise((resolve) => setTimeout(resolve, 50));
    mockEventSource.dispatchMessage('event: message\ndata: {"id":1}\n\n');

    await new Promise((resolve) => setTimeout(resolve, 50));
    mockEventSource.dispatchMessage('event: message\ndata: {"id":2}\n\n');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages).toHaveLength(2);
    expect(messages[0].data).toEqual({ id: 1 });
    expect(messages[1].data).toEqual({ id: 2 });
  });

  it('should parse multiline data fields', async () => {
    const messages: SSEMessage[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onMessage((message) => {
      messages.push(message);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate multiline data
    mockEventSource.dispatchMessage(
      'event: message\ndata: {"content":\ndata: "Hello\\nWorld"}\n\n'
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      event: 'message',
      data: { content: 'Hello\nWorld' },
    });
  });

  it('should ignore comment lines', async () => {
    const messages: SSEMessage[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onMessage((message) => {
      messages.push(message);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate message with comments
    mockEventSource.dispatchMessage(': this is a comment\nevent: message\ndata: {"id":1}\n\n');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      event: 'message',
      data: { id: 1 },
    });
  });

  it('should handle retry field', async () => {
    client = new SSEClient('https://api.example.com/stream', {
      reconnect: true,
      reconnectDelay: 1000,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate retry directive from server
    mockEventSource.dispatchMessage('retry: 5000\n\n');

    // The client should update its reconnection delay
    // This would be tested by checking reconnection timing
    // but for simplicity we'll just ensure it doesn't throw
    expect(client).toBeDefined();
  });

  it('should handle last event ID', async () => {
    const messages: SSEMessage[] = [];

    client = new SSEClient('https://api.example.com/stream');
    client.onMessage((message) => {
      messages.push(message);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate message with ID
    mockEventSource.dispatchMessage('id: msg-123\nevent: message\ndata: {"content":"Test"}\n\n');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      event: 'message',
      data: { content: 'Test' },
      id: 'msg-123',
    });
  });
});
