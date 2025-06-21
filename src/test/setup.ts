// Global test setup
import { afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

// Reset fetch mock before each test
beforeEach(() => {
  vi.mocked(global.fetch).mockReset();
});

// Mock TextDecoderStream for SSE parsing tests
global.TextDecoderStream = class TextDecoderStream {
  readable: ReadableStream<string>;
  writable: WritableStream<Uint8Array>;
  encoding: string;
  fatal: boolean;
  ignoreBOM: boolean;

  constructor(label: string = 'utf-8', options?: TextDecoderOptions) {
    const { readable, writable } = new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        controller.enqueue(new TextDecoder(label, options).decode(chunk));
      }
    });
    this.readable = readable;
    this.writable = writable;
    this.encoding = label;
    this.fatal = !!options?.fatal;
    this.ignoreBOM = !!options?.ignoreBOM;
  }
};

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});