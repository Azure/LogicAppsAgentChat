import React from 'react';
import { makeStyles, shorthands, tokens, Button } from '@fluentui/react-components';
import { PanelLeftExpandRegular, PanelLeftContractRegular } from '@fluentui/react-icons';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { CompanyLogo } from '../CompanyLogo';
import { useChatWidget } from '../../hooks/useChatWidget';
import type { ChatWidgetProps } from '../../types';

const useStyles = makeStyles({
  chatWindow: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    height: '60px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  headerContent: {
    display: 'flex',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  agentName: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  agentDescription: {
    margin: 0,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  messageListContainer: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  footer: {
    flexShrink: 0,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  messageInputWrapper: {
    flexShrink: 0,
  },
});

export interface ChatWindowProps extends ChatWidgetProps {
  // All props come from ChatWidgetProps
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function ChatWindow(props: ChatWindowProps) {
  const styles = useStyles();
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
    sessionKey,
    onToggleSidebar,
    isSidebarCollapsed,
  } = props;

  const { isConnected, agentName, agentDescription, sendMessage, handleAuthCompleted } =
    useChatWidget({
      agentCard,
      auth,
      onMessage,
      onConnectionChange,
      sessionKey,
    });

  const showHeaderLogo = theme?.branding?.logoPosition === 'header';
  const showFooterLogo = theme?.branding?.logoPosition === 'footer';

  return (
    <div className={styles.chatWindow}>
      <div className={styles.header}>
        {onToggleSidebar && (
          <Button
            appearance="subtle"
            icon={
              isSidebarCollapsed ? (
                <PanelLeftExpandRegular fontSize={20} />
              ) : (
                <PanelLeftContractRegular fontSize={20} />
              )
            }
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
        )}
        <div className={styles.headerContent}>
          {showHeaderLogo && <CompanyLogo branding={theme?.branding} />}
          {isConnected && (
            <div className={styles.agentInfo}>
              <h3 className={styles.agentName}>{agentName}</h3>
              {agentDescription && <p className={styles.agentDescription}>{agentDescription}</p>}
            </div>
          )}
        </div>
      </div>

      <div className={styles.messageListContainer}>
        <MessageList
          welcomeMessage={welcomeMessage}
          agentName={agentName || 'Assistant'}
          userName={userName}
          onAuthCompleted={handleAuthCompleted}
        />
      </div>

      {showFooterLogo && (
        <div className={styles.footer}>
          <CompanyLogo branding={theme?.branding} />
        </div>
      )}

      <div className={styles.messageInputWrapper}>
        <MessageInput
          onSendMessage={sendMessage}
          placeholder={placeholder}
          allowFileUpload={allowFileUpload}
          maxFileSize={maxFileSize}
          allowedFileTypes={allowedFileTypes}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}
