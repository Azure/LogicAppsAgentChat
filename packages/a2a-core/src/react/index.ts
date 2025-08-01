// Import styles - this ensures they're included in the bundle
import './styles/index.css';

// Main exports for React integration
export { ChatWidget } from './components/ChatWidget';
export { ChatWindow } from './components/ChatWindow';
export { ChatThemeProvider } from './components/ThemeProvider/ThemeProvider';
export type { ChatThemeProviderProps } from './components/ThemeProvider/ThemeProvider';
export { ChatWidgetWithHistory } from './components/ChatWidgetWithHistory';
export type { ChatWidgetWithHistoryProps } from './components/ChatWidgetWithHistory';

// Hooks
export { useA2A } from './use-a2a';
export type { UseA2AOptions, UseA2AReturn, ChatMessage } from './use-a2a';
export { useChatWidget } from './hooks/useChatWidget';
export { useTheme } from './hooks/useTheme';
export { useChatHistory } from './hooks/useChatHistory';
export { useA2AWithHistory } from './hooks/useA2AWithHistory';
export type { UseA2AWithHistoryOptions, UseA2AWithHistoryReturn } from './hooks/useA2AWithHistory';

// React Query hooks
export {
  useContextsList,
  useCreateContext,
  useUpdateContext,
  useContextDetail,
  usePrefetchContexts,
} from './hooks/useContexts';
export {
  useTasksList,
  usePrefetchTasks,
  useInvalidateTasks,
  useCachedTasks,
} from './hooks/useTasks';
export { useChatHistoryQuery, useTasksToMessages } from './hooks/useChatHistoryQuery';
export { queryKeys } from './hooks/query-keys';

// Providers
export { A2AQueryProvider, getQueryClient } from './providers/QueryProvider';
export { A2AClientProvider, useA2AClient } from './providers/A2AClientProvider';

// Store
export { useChatStore } from './store/chatStore';
export { useHistoryStore } from './store/historyStore';

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

export type { AuthRequiredEvent, AuthRequiredPart, AuthRequiredHandler } from '../client/types';

// Individual components (for advanced usage)
export { MessageList } from './components/MessageList';
export { MessageInput } from './components/MessageInput';
export { Message as MessageComponent } from './components/Message';
export { TypingIndicator } from './components/TypingIndicator';
export { CompanyLogo } from './components/CompanyLogo';
export { FileUpload } from './components/FileUpload';
export { ConversationList } from './components/ConversationList';
export type { ConversationListProps } from './components/ConversationList';
// Authentication component
export { AuthenticationMessage } from './components/Message/AuthenticationMessage';
export type { AuthenticationMessageProps } from './components/Message/AuthenticationMessage';

// Utilities (for advanced usage)
export { generateMessageId, createMessage, formatCodeContent } from './utils/messageUtils';
export { downloadFile, getMimeType } from './utils/downloadUtils';
export { openPopupWindow } from '../utils/popup-window';
export type { PopupWindowOptions, PopupWindowResult } from '../utils/popup-window';

// Fluent UI Theme exports
export { createCustomTheme, defaultLightTheme, defaultDarkTheme } from './theme/fluentTheme';
export type { ThemeConfig } from './theme/fluentTheme';
