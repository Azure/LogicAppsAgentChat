import type { AgentCard } from '../../types';
import type { AuthConfig, AuthRequiredPart } from '../../client/types';

// Re-export types from main module
export type { AgentCard, AuthConfig, AuthRequiredPart };

// Define and export message roles and statuses
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';
export type AttachmentStatus = 'uploading' | 'uploaded' | 'error';
export type AuthenticationStatus = 'pending' | 'completed' | 'failed' | 'canceled';

export interface Message {
  id: string;
  content: string;
  sender: MessageRole;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: Record<string, any>;
  attachments?: Attachment[];
  authEvent?: {
    authParts: AuthRequiredPart[];
    status: AuthenticationStatus;
  };
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: AttachmentStatus;
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
    // Dark mode specific colors
    backgroundDark?: string;
    surfaceDark?: string;
    textDark?: string;
    textSecondaryDark?: string;
    borderDark?: string;
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
  branding?: Branding;
}

export interface Branding {
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  logoPosition?: 'header' | 'footer';
  name?: string;
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
  userName?: string; // Custom display name for the user, defaults to "You"
  sessionKey?: string; // Optional session key for multi-session support
  agentUrl?: string; // Optional agent URL for proper session isolation
  onToggleSidebar?: () => void; // Callback for toggling sidebar
  isSidebarCollapsed?: boolean; // Current sidebar state
  apiKey?: string; // Optional API key for authentication
  oboUserToken?: string; // Optional OBO user token for authentication
  onUnauthorized?: (event: {
    url: string;
    method: string;
    statusText?: string;
  }) => Promise<void> | void; // Called on 401 errors
  onContextIdChange?: (contextId: string) => void; // Callback when context ID changes
  sessionName?: string; // Optional session/chat name for display in header
  onRenameSession?: (newName: string) => void | Promise<void>; // Callback for renaming the session
}
