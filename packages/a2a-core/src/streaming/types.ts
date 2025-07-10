export interface SSEMessage {
  event: string;
  data: unknown;
  id?: string;
}

export interface SSEClientOptions {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  reconnect?: boolean;
  reconnectDelay?: number;
  onOpen?: () => void;
  onClose?: () => void;
  method?: string;
  body?: string;
}

export interface SSEParser {
  feed(chunk: string): SSEMessage[];
}

export type MessageHandler = (message: SSEMessage) => void;
export type ErrorHandler = (error: Error) => void;
