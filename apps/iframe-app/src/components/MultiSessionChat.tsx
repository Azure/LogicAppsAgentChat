import { useCallback, useEffect, useState } from 'react';
import { ChatWidget, ChatWidgetProps, ChatThemeProvider } from '@microsoft/a2achat-core/react';
import { AgentCard } from '@microsoft/a2achat-core';
import {
  FluentProvider,
  makeStyles,
  tokens,
  shorthands,
  Spinner,
} from '@fluentui/react-components';
import { webLightTheme } from '@fluentui/react-components';
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
    width: '260px',
    height: '100vh',
    flexShrink: 0,
    transition: 'width 0.3s ease',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
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
  '@media (max-width: 768px)': {
    sidebar: {
      position: 'absolute',
      left: '0',
      top: '0',
      zIndex: 10,
      width: '260px',
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      boxShadow: tokens.shadow16,
    },
    sidebarOpen: {
      transform: 'translateX(0)',
    },
    chatArea: {
      width: '100%',
    },
  },
  '@media (max-width: 480px)': {
    sidebar: {
      width: '200px',
    },
  },
});

interface MultiSessionChatProps extends Omit<ChatWidgetProps, 'agentCard'> {
  config: {
    apiUrl: string;
    apiKey?: string;
  };
}

export function MultiSessionChat({ config, ...chatWidgetProps }: MultiSessionChatProps) {
  const styles = useStyles();
  const [agentCard, setAgentCard] = useState<AgentCard | undefined>();
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<Error | undefined>();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
  } = useChatSessions();

  // Fetch agent card once on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchAgentCard() {
      try {
        setIsLoadingAgent(true);
        setAgentError(undefined);

        const url = config.apiUrl.endsWith('.json')
          ? config.apiUrl
          : `${config.apiUrl}/.well-known/ai-agent.json`;

        const response = await fetch(url);
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
      <FluentProvider theme={webLightTheme}>
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
      <FluentProvider theme={webLightTheme}>
        <div className={styles.errorContainer}>
          <div>Error: {agentError?.message || 'Failed to load agent'}</div>
        </div>
      </FluentProvider>
    );
  }

  // Show loading if no active session
  if (!activeSessionId || !activeSession) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div className={styles.loadingContainer}>
          <Spinner size="medium" />
          <div>Loading chat sessions...</div>
        </div>
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.multiSessionContainer}>
        <div className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ''}`}>
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionClick={handleSessionClick}
            onNewSession={handleNewSession}
            onRenameSession={renameSession}
            onDeleteSession={deleteSession}
          />
        </div>

        <div className={styles.chatArea}>
          <ChatThemeProvider>
            <ChatWidget
              key={activeSessionId}
              agentCard={agentCard}
              sessionKey={`a2a-chat-session-${activeSessionId}`}
              metadata={{
                ...chatWidgetProps.metadata,
                sessionId: activeSessionId,
              }}
              userName={chatWidgetProps.userName}
              placeholder={chatWidgetProps.placeholder}
              allowFileUpload={false}
            />
          </ChatThemeProvider>
        </div>
      </div>
    </FluentProvider>
  );
}
