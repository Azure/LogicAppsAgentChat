import React from 'react';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { CompanyLogo } from '../CompanyLogo';
import { useChatWidget } from '../../hooks/useChatWidget';
import type { ChatWidgetProps } from '../../types';

export interface ChatWindowProps extends ChatWidgetProps {
  // All props come from ChatWidgetProps
}

export function ChatWindow(props: ChatWindowProps) {
  const {
    agentCard,
    auth,
    theme,
    placeholder,
    welcomeMessage,
    allowFileUpload,
    maxFileSize,
    allowedFileTypes,
    onMessage,
    onConnectionChange,
    userName,
  } = props;

  const { isConnected, agentName, sendMessage, clearSession, handleAuthCompleted } = useChatWidget({
    agentCard,
    auth,
    onMessage,
    onConnectionChange,
  });

  const showHeaderLogo = theme?.branding?.logoPosition === 'header';
  const showFooterLogo = theme?.branding?.logoPosition === 'footer';

  const handleClearSession = () => {
    if (clearSession) {
      clearSession();
    }
  };

  return (
    <div className="chatWindow chat-widget-container">
      {(showHeaderLogo || isConnected) && (
        <div className="header">
          {showHeaderLogo && <CompanyLogo branding={theme?.branding} />}
          {isConnected && (
            <div className="headerActions">
              <button
                className="clearButton"
                onClick={handleClearSession}
                disabled={!isConnected}
                title="Start new session"
              >
                New Session
              </button>
            </div>
          )}
        </div>
      )}

      <MessageList
        welcomeMessage={welcomeMessage}
        agentName={agentName || 'Assistant'}
        userName={userName || 'You'}
        onAuthCompleted={handleAuthCompleted}
      />

      {showFooterLogo && (
        <div className="footer">
          <CompanyLogo branding={theme?.branding} />
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
