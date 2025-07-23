import { useState, useCallback, useRef } from 'react';
import { ChatWidget, type ChatWidgetProps } from '@microsoft/a2achat-core/react';
import { MultiSessionChat } from './MultiSessionChat';
import { LoadingDisplay } from './LoadingDisplay';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { createUnauthorizedHandler, getBaseUrl } from '../lib/authHandler';
import type { IframeConfig } from '../lib/utils/config-parser';
import type { ChatHistoryData } from '../lib/types/chat-history';

interface IframeWrapperProps {
  config: IframeConfig;
}

export function IframeWrapper({ config }: IframeWrapperProps) {
  const {
    props,
    multiSession,
    apiKey,
    mode: initialMode = 'light',
    inPortal,
    trustedParentOrigin,
    contextId,
  } = config;

  // State
  const [agentCard, setAgentCard] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(initialMode);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const chatHistoryRef = useRef<ChatHistoryData | null>(null);

  // Check if we should wait for postMessage
  const params = new URLSearchParams(window.location.search);
  const expectPostMessage = params.get('expectPostMessage') === 'true';

  // Handle chat history received from parent blade
  const handleChatHistoryReceived = useCallback(
    (history: ChatHistoryData) => {
      console.log('Chat history received:', history);
      chatHistoryRef.current = history;

      // If we're in single-session mode and received a contextId, store it
      if (!multiSession && history.contextId) {
        const sessionKey = props.sessionKey || 'default';
        const storageKey = `a2a-context-${sessionKey}`;
        localStorage.setItem(storageKey, history.contextId);

        // Also store the messages if provided
        if (history.messages && history.messages.length > 0) {
          const messagesKey = `a2a-messages-${sessionKey}`;
          // Convert messages to the format expected by the chat widget
          const formattedMessages = history.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toISOString(),
            metadata: msg.metadata,
          }));
          localStorage.setItem(messagesKey, JSON.stringify(formattedMessages));
          console.log(`Stored ${history.messages.length} messages in localStorage`);
        }
      }
    },
    [multiSession, props.sessionKey]
  );

  // Frame Blade integration
  const { isReady: isFrameBladeReady } = useFrameBlade({
    enabled: inPortal || false,
    trustedParentOrigin,
    onThemeChange: setCurrentTheme,
    onAuthTokenReceived: setAuthToken,
    onChatHistoryReceived: handleChatHistoryReceived,
  });

  // Parent communication
  const { isWaitingForAgentCard } = useParentCommunication({
    enabled: expectPostMessage,
    onAgentCardReceived: setAgentCard,
  });

  // Show loading states
  if (expectPostMessage && isWaitingForAgentCard) {
    return (
      <LoadingDisplay
        title="Waiting for Configuration"
        message="Waiting for agent card data via postMessage..."
      />
    );
  }

  if (inPortal && !isFrameBladeReady) {
    return (
      <LoadingDisplay title="Initializing Frame Blade..." message="Connecting to Azure Portal..." />
    );
  }

  // Prepare final props
  const finalProps: ChatWidgetProps = agentCard ? { ...props, agentCard } : props;

  // Determine theme mode
  const urlMode = params.get('mode');
  const mode = inPortal ? currentTheme : urlMode === 'dark' ? 'dark' : initialMode;

  // Create unauthorized handler
  const baseUrl = getBaseUrl(
    typeof finalProps.agentCard === 'string' ? finalProps.agentCard : finalProps.agentCard.url
  );
  const onUnauthorized = createUnauthorizedHandler({
    baseUrl,
    onRefreshSuccess: () => console.log('Authentication token refreshed successfully'),
    onRefreshFailed: () => console.log('Authentication token refresh failed, prompting re-login'),
    onLogoutComplete: () => console.log('Logout completed, refreshing page'),
  });

  // Add auth token if available from Frame Blade
  const propsWithAuth = authToken && inPortal ? { ...finalProps, apiKey: authToken } : finalProps;

  // Render appropriate chat component
  if (multiSession) {
    return (
      <MultiSessionChat
        config={{
          apiUrl:
            typeof propsWithAuth.agentCard === 'string'
              ? propsWithAuth.agentCard
              : propsWithAuth.agentCard.url,
          apiKey: apiKey || propsWithAuth.apiKey || '',
          onUnauthorized,
        }}
        {...propsWithAuth}
        mode={mode}
      />
    );
  }

  // For single-session mode with contextId, we need to ensure it's stored properly
  // The ChatWidget uses sessionKey for persistence, defaulting to 'default' if not provided
  const sessionKey = propsWithAuth.sessionKey || 'default';

  // Pre-populate localStorage with contextId if provided for single-session mode
  // Skip this if we already received chat history via postMessage
  if (contextId && !multiSession && !chatHistoryRef.current) {
    const storageKey = `a2a-context-${sessionKey}`;
    const existingContextId = localStorage.getItem(storageKey);

    // Only set if not already present to avoid overwriting active sessions
    if (!existingContextId) {
      localStorage.setItem(storageKey, contextId);
      console.log(`Set contextId in localStorage: ${storageKey} = ${contextId}`);
    } else {
      console.log(`Existing contextId found: ${storageKey} = ${existingContextId}`);
    }
  }

  return (
    <ChatWidget
      {...propsWithAuth}
      mode={mode}
      fluentTheme={mode}
      onUnauthorized={onUnauthorized}
      sessionKey={sessionKey}
    />
  );
}
