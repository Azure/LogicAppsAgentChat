import { useCallback, useEffect, useState } from 'react';
import { ChatWidget, ChatWidgetProps } from '@microsoft/a2achat-core/react';
import { AgentCard } from '@microsoft/a2achat-core';
import { useChatSessions } from '../hooks/useChatSessions';
import { SessionList } from './SessionList';
import styles from './MultiSessionChat.module.css';

interface MultiSessionChatProps extends Omit<ChatWidgetProps, 'agentCard'> {
  config: {
    apiUrl: string;
    apiKey?: string;
  };
}

export function MultiSessionChat({ config, ...chatWidgetProps }: MultiSessionChatProps) {
  const [agentCard, setAgentCard] = useState<AgentCard | undefined>();
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<Error | undefined>();

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#666',
        }}
      >
        <div>Loading agent...</div>
      </div>
    );
  }

  // Show error if agent card failed to load
  if (agentError || !agentCard) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#dc2626',
        }}
      >
        <div>Error: {agentError?.message || 'Failed to load agent'}</div>
      </div>
    );
  }

  // Show loading if no active session
  if (!activeSessionId || !activeSession) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#666',
        }}
      >
        <div>Loading chat sessions...</div>
      </div>
    );
  }

  return (
    <div className={styles.multiSessionContainer}>
      <div className={styles.sidebar}>
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
          allowFileUpload={true}
          maxFileSize={10 * 1024 * 1024}
          allowedFileTypes={['image/*', '.pdf', '.txt', '.doc', '.docx']}
        />
      </div>
    </div>
  );
}
