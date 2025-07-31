import React from 'react';
import { makeStyles, shorthands, tokens, Button, mergeClasses } from '@fluentui/react-components';
import { PanelLeftExpandRegular, PanelLeftContractRegular } from '@fluentui/react-icons';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { CompanyLogo } from '../CompanyLogo';
import { useChatWidget } from '../../hooks/useChatWidget';
import { useTheme } from '../../hooks/useTheme';
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
  headerWithLogo: {
    height: '66px', // 10% more height when logo is present
    paddingLeft: '26px', // 10px more padding on left side
  },
  headerContent: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
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
  mode?: 'light' | 'dark';
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
    onToggleSidebar,
    isSidebarCollapsed,
    apiKey,
    onUnauthorized,
    onContextIdChange,
    mode = 'light',
  } = props;

  // Apply theme if provided
  useTheme(theme, mode);

  const {
    isConnected,
    agentName,
    agentDescription,
    sendMessage,
    handleAuthCompleted,
    handleAuthCanceled,
    contextId,
  } = useChatWidget({
    agentCard,
    auth,
    onMessage,
    onConnectionChange,
    onUnauthorized,
    apiKey,
  });

  // Notify parent when contextId changes
  React.useEffect(() => {
    if (contextId && onContextIdChange) {
      onContextIdChange(contextId);
    }
  }, [contextId, onContextIdChange]);

  // Default to showing logo in header if logoUrl is provided and position is not explicitly 'footer'
  const showHeaderLogo = theme?.branding?.logoUrl && theme?.branding?.logoPosition !== 'footer';
  const showFooterLogo = theme?.branding?.logoUrl && theme?.branding?.logoPosition === 'footer';

  return (
    <div className={styles.chatWindow}>
      <div className={mergeClasses(styles.header, showHeaderLogo && styles.headerWithLogo)}>
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
          onAuthCanceled={handleAuthCanceled}
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
          contextId={contextId}
        />
      </div>
    </div>
  );
}
