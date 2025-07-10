/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AgentCard, AuthConfig } from 'a2a-browser-sdk';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  metadata?: Record<string, any>;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'uploaded' | 'error';
}

export interface ChatTheme {
  colors: {
    primary: string;
    primaryText: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
    };
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  branding?: {
    logoUrl?: string;
    logoSize?: 'small' | 'medium' | 'large';
    logoPosition?: 'header' | 'footer';
  };
}

export interface ChatWidgetProps {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  theme?: Partial<ChatTheme>;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  userId?: string;
  metadata?: Record<string, any>;
  placeholder?: string;
  welcomeMessage?: string;
  allowFileUpload?: boolean;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
}