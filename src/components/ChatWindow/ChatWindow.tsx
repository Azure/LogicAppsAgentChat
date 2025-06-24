import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { CompanyLogo } from '../CompanyLogo';
import { useTheme } from '../../hooks/useTheme';
import { useChatConnection } from '../../hooks/useChatConnection';
import styles from './ChatWindow.module.css';
import type { ChatWidgetProps } from '../../types';

export interface ChatWindowProps extends ChatWidgetProps {
  // All props come from ChatWidgetProps, which now uses agentCard
}

export function ChatWindow(props: ChatWindowProps) {
  const {
    agentCard,
    theme,
    placeholder,
    welcomeMessage,
    allowFileUpload,
    maxFileSize,
    allowedFileTypes,
    onMessage,
    onConnectionChange
  } = props;

  const chatTheme = useTheme(theme);
  const { isConnected, agentName, sendMessage } = useChatConnection({
    agentCard,
    onMessage,
    onConnectionChange
  });

  const showHeaderLogo = chatTheme.branding?.logoPosition === 'header';
  const showFooterLogo = chatTheme.branding?.logoPosition === 'footer';

  return (
    <div className={`${styles.chatWindow} chat-widget-container`}>
      {showHeaderLogo && (
        <div className={styles.header}>
          <CompanyLogo />
        </div>
      )}

      <MessageList 
        welcomeMessage={welcomeMessage} 
        agentName={agentName || 'Assistant'} 
      />

      {showFooterLogo && (
        <div className={styles.footer}>
          <CompanyLogo />
        </div>
      )}

      <MessageInput
        onSendMessage={sendMessage}
        placeholder={placeholder}
        allowFileUpload={allowFileUpload}
        maxFileSize={maxFileSize}
        allowedFileTypes={allowedFileTypes}
        disabled={!isConnected}
      />
    </div>
  );
}