import { useCallback, useEffect, useState, useRef } from 'react';
import { ChatWidget, ChatWidgetProps, ChatThemeProvider } from '@microsoft/a2achat-core/react';
import { AgentCard } from '@microsoft/a2achat-core';
import {
  FluentProvider,
  makeStyles,
  tokens,
  shorthands,
  Spinner,
  mergeClasses,
} from '@fluentui/react-components';
import { webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { useChatSessions } from '../hooks/useChatSessions';
import { SessionList } from './SessionList';

const useStyles = makeStyles({
  multiSessionContainer: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    height: '100vh',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  sidebarTransition: {
    transition: 'width 0.3s ease',
  },
  sidebarCollapsed: {
    width: '0px !important',
    ...shorthands.borderRight('none'),
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    right: '-3px',
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  resizing: {
    userSelect: 'none',
    cursor: 'col-resize',
  },
  chatArea: {
    flex: 1,
    height: '100vh',
    minWidth: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: tokens.colorPaletteRedForeground1,
  },
});

interface MultiSessionChatProps extends Omit<ChatWidgetProps, 'agentCard'> {
  config: {
    apiUrl: string;
    apiKey?: string;
  };
  mode?: 'light' | 'dark';
}

export function MultiSessionChat({
  config,
  mode = 'light',
  ...chatWidgetProps
}: MultiSessionChatProps) {
  const styles = useStyles();
  const [agentCard, setAgentCard] = useState<AgentCard | undefined>();
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<Error | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
  } = useChatSessions();

  // Check screen size and auto-collapse on small screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 720) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Handle sidebar resizing
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameId = requestAnimationFrame(() => {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 400) {
          setSidebarWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isResizing]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Fetch agent card once on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchAgentCard() {
      try {
        setIsLoadingAgent(true);
        setAgentError(undefined);

        const url = config.apiUrl.endsWith('.json')
          ? config.apiUrl
          : `${config.apiUrl}/.well-known/agent.json`;

        const headers: HeadersInit = {};
        if (config.apiKey) {
          headers['X-API-Key'] = config.apiKey;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch agent card: ${response.statusText}`);
        }

        const card = (await response.json()) as AgentCard;

        if (!cancelled) {
          setAgentCard(card);
        }
      } catch (err) {
        if (!cancelled) {
          setAgentError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAgent(false);
        }
      }
    }

    fetchAgentCard();

    return () => {
      cancelled = true;
    };
  }, [config.apiUrl]);

  const handleNewSession = useCallback(() => {
    createNewSession();
  }, [createNewSession]);

  const handleSessionClick = useCallback(
    (sessionId: string) => {
      switchSession(sessionId);
    },
    [switchSession]
  );

  // Show loading state while fetching agent card
  if (isLoadingAgent) {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.loadingContainer}>
          <Spinner size="medium" />
          <div>Loading agent...</div>
        </div>
      </FluentProvider>
    );
  }

  // Show error if agent card failed to load
  if (agentError || !agentCard) {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.errorContainer}>
          <div>Error: {agentError?.message || 'Failed to load agent'}</div>
        </div>
      </FluentProvider>
    );
  }

  // Show loading if no active session
  if (!activeSessionId || !activeSession) {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.loadingContainer}>
          <Spinner size="medium" />
          <div>Loading chat sessions...</div>
        </div>
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
      <div className={mergeClasses(styles.multiSessionContainer, isResizing && styles.resizing)}>
        <div
          ref={sidebarRef}
          className={mergeClasses(
            styles.sidebar,
            !isResizing && styles.sidebarTransition,
            isCollapsed && styles.sidebarCollapsed
          )}
          style={{ width: isCollapsed ? 0 : sidebarWidth }}
        >
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionClick={handleSessionClick}
            onNewSession={handleNewSession}
            onRenameSession={renameSession}
            onDeleteSession={deleteSession}
            logoUrl={chatWidgetProps.theme?.branding?.logoUrl}
            logoSize={chatWidgetProps.theme?.branding?.logoSize}
            themeColors={chatWidgetProps.theme?.colors}
          />
          {!isCollapsed && (
            <div
              className={styles.resizeHandle}
              onMouseDown={startResizing}
              onMouseEnter={(e) => {
                if (chatWidgetProps.theme?.colors?.primary) {
                  e.currentTarget.style.backgroundColor = chatWidgetProps.theme.colors.primary;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />
          )}
        </div>
        <div className={styles.chatArea}>
          <ChatThemeProvider theme={mode}>
            <ChatWidget
              key={activeSessionId}
              agentCard={agentCard}
              apiKey={config.apiKey}
              sessionKey={`a2a-chat-session-${activeSessionId}`}
              metadata={{
                ...chatWidgetProps.metadata,
                sessionId: activeSessionId,
              }}
              theme={chatWidgetProps.theme}
              userName={chatWidgetProps.userName}
              placeholder={chatWidgetProps.placeholder}
              welcomeMessage={chatWidgetProps.welcomeMessage}
              allowFileUpload={false}
              onToggleSidebar={toggleSidebar}
              isSidebarCollapsed={isCollapsed}
              mode={mode}
              fluentTheme={mode}
            />
          </ChatThemeProvider>
        </div>
      </div>
    </FluentProvider>
  );
}
