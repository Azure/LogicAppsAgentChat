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
  Button,
  Tooltip,
  Text,
} from '@fluentui/react-components';
import { webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { ArrowSyncRegular, ArrowSyncCheckmarkRegular, AddRegular } from '@fluentui/react-icons';
import { useChatSessions } from '../hooks/useChatSessions';
import { useStorageSync } from '../hooks/useStorageSync';
import { SessionList } from './SessionList';
import { SessionManager } from '../utils/sessionManager';
// import { SyncStatus } from './SyncStatus'; // Temporarily disabled
import { FeatureFlags } from '../config/storage-config';

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
    onUnauthorized?: () => void | Promise<void>;
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
  const [messageUpdateKey, setMessageUpdateKey] = useState(0);
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get storage configuration
  const storageConfig = FeatureFlags.get();

  // Extract the base agent URL without .well-known/agent.json for server sync
  const agentBaseUrl = config.apiUrl.replace(/\/\.well-known\/agent\.json$/, '');

  const {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
    syncStatus,
    isServerSyncEnabled,
    syncCurrentThread,
    // syncVersion, - currently unused
  } = useChatSessions(agentBaseUrl, {
    enableServerSync: storageConfig.enableServerSync,
    syncInterval: storageConfig.syncInterval,
    debugMode: storageConfig.debugMode,
  });

  // Debug logging
  console.log(
    '[MultiSessionChat] Rendering with sessions:',
    sessions.length,
    sessions.map((s) => ({
      id: s.id,
      name: s.name,
    }))
  );

  // Track initial sync completion
  useEffect(() => {
    if (isServerSyncEnabled && syncStatus.status === 'idle' && syncStatus.lastSyncTime) {
      // Initial sync is complete when we have an idle status with a sync time
      setIsInitialSyncComplete(true);
    }
  }, [isServerSyncEnabled, syncStatus]);

  // Listen for message updates from sync
  useEffect(() => {
    const handleMessagesUpdated = (event: CustomEvent) => {
      const { sessionId, messageCount } = event.detail;
      console.log(
        `[MultiSessionChat] Messages updated for session ${sessionId}: ${messageCount} messages`
      );

      // Only update if it's for the current session
      if (sessionId === activeSessionId) {
        // Force ChatWidget to re-render by changing its key
        setMessageUpdateKey((prev) => prev + 1);
      }
    };

    window.addEventListener('chatMessagesUpdated', handleMessagesUpdated as EventListener);

    return () => {
      window.removeEventListener('chatMessagesUpdated', handleMessagesUpdated as EventListener);
    };
  }, [activeSessionId]);

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

  const handleNewSession = useCallback(async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  }, [createNewSession]);

  const handleSessionClick = useCallback(
    async (sessionId: string) => {
      try {
        await switchSession(sessionId);
      } catch (error) {
        console.error('Error switching session:', error);
      }
    },
    [switchSession]
  );

  // Use storage sync for IndexedDB
  const sessionStorageKey = activeSessionId ? `a2a-chat-session-${activeSessionId}` : '';
  useStorageSync(agentBaseUrl, sessionStorageKey);

  const handleContextIdChange = useCallback(
    async (contextId: string) => {
      if (activeSessionId) {
        // Update the session with the new contextId
        try {
          const sessionManager = SessionManager.getInstance(agentBaseUrl);
          await sessionManager.updateSessionContextId(activeSessionId, contextId);
        } catch (error) {
          console.error('Error updating contextId:', error);
        }
      }
    },
    [activeSessionId, agentBaseUrl]
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

  // Show loading during initial sync
  if (isServerSyncEnabled && !isInitialSyncComplete && syncStatus.status === 'syncing') {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.loadingContainer}>
          <Spinner size="medium" />
          <div>Syncing all conversations from server...</div>
        </div>
      </FluentProvider>
    );
  }

  // If sync is complete but no sessions exist, show the UI with empty state
  // The SessionList component will show the "New Chat" button

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
            onRenameSession={async (id, name) => {
              try {
                await renameSession(id, name);
              } catch (error) {
                console.error('Error renaming session:', error);
              }
            }}
            onDeleteSession={async (id) => {
              try {
                await deleteSession(id);
              } catch (error) {
                console.error('Error deleting session:', error);
              }
            }}
            logoUrl={chatWidgetProps.theme?.branding?.logoUrl}
            logoSize={chatWidgetProps.theme?.branding?.logoSize}
            themeColors={chatWidgetProps.theme?.colors}
            syncStatus={isServerSyncEnabled ? syncStatus : undefined}
            isInitialLoading={
              isServerSyncEnabled && !isInitialSyncComplete && syncStatus.status === 'syncing'
            }
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
          {/* Temporarily disabled sync status indicator
          {isServerSyncEnabled && (
            <div className={styles.syncStatusContainer}>
              <SyncStatus
                syncStatus={syncStatus}
                onTriggerSync={triggerSync}
                isEnabled={isServerSyncEnabled}
              />
            </div>
          )} */}
          {activeSessionId ? (
            <ChatThemeProvider theme={mode}>
              <ChatWidget
                key={`${activeSessionId}-${messageUpdateKey}`}
                agentCard={agentCard}
                apiKey={config.apiKey}
                sessionKey={`a2a-chat-session-${activeSessionId}`}
                agentUrl={config.apiUrl}
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
                onUnauthorized={config.onUnauthorized}
                onContextIdChange={handleContextIdChange}
                disabled={!!activeSession?.status && activeSession.status !== 'Running'}
                disabledMessage={
                  activeSession?.status
                    ? `This session is ${activeSession.status.toLowerCase()} and cannot accept new messages`
                    : undefined
                }
                headerActions={
                  isServerSyncEnabled && activeSession?.contextId ? (
                    <Tooltip
                      content={
                        syncStatus.status === 'syncing'
                          ? 'Syncing...'
                          : 'Sync this thread with server'
                      }
                      relationship="label"
                    >
                      <Button
                        appearance="subtle"
                        icon={
                          syncStatus.status === 'syncing' ? (
                            <Spinner size="tiny" />
                          ) : syncStatus.lastSyncTime ? (
                            <ArrowSyncCheckmarkRegular />
                          ) : (
                            <ArrowSyncRegular />
                          )
                        }
                        onClick={syncCurrentThread}
                        disabled={syncStatus.status === 'syncing' || !isInitialSyncComplete}
                        size="small"
                      >
                        {syncStatus.status === 'syncing' ? 'Syncing' : 'Sync'}
                      </Button>
                    </Tooltip>
                  ) : null
                }
              />
            </ChatThemeProvider>
          ) : (
            <div className={styles.loadingContainer}>
              <div style={{ textAlign: 'center' }}>
                <Text
                  size={500}
                  weight="semibold"
                  style={{
                    display: 'block',
                    marginBottom: '16px',
                    color: tokens.colorNeutralForeground2,
                  }}
                >
                  No chats yet
                </Text>
                <Button
                  appearance="primary"
                  icon={<AddRegular />}
                  size="large"
                  onClick={handleNewSession}
                  style={{
                    minWidth: '200px',
                  }}
                >
                  Start a new chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </FluentProvider>
  );
}
