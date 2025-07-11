// Import styles - this ensures they're included in the bundle
import './styles/index.css';

// Main exports for React integration
export { ChatWidget } from './components/ChatWidget';
export { ChatWindow } from './components/ChatWindow';

// Hooks
export { useA2A } from './use-a2a';
export type { UseA2AOptions, UseA2AReturn, ChatMessage } from './use-a2a';
export { useChatWidget } from './hooks/useChatWidget';
export { useTheme } from './hooks/useTheme';

// Store
export { useChatStore } from './store/chatStore';

// Types
export type {
  Message,
  Attachment,
  ChatTheme,
  ChatWidgetProps,
  MessageRole,
  MessageStatus,
  AttachmentStatus,
  Branding,
  AgentCard,
  AuthConfig,
} from './types';

// Individual components (for advanced usage)
export { MessageList } from './components/MessageList';
export { MessageInput } from './components/MessageInput';
export { Message as MessageComponent } from './components/Message';
export { TypingIndicator } from './components/TypingIndicator';
export { CompanyLogo } from './components/CompanyLogo';
export { FileUpload } from './components/FileUpload';

// Utilities (for advanced usage)
export { generateMessageId, createMessage, formatCodeContent } from './utils/messageUtils';
export { downloadFile, getMimeType } from './utils/downloadUtils';
