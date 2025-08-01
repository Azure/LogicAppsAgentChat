import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingDisplay } from './LoadingDisplay';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { createUnauthorizedHandler, getBaseUrl } from '../lib/authHandler';
import { MultiSessionChatQuery } from './MultiSessionChatQuery';
import type { IframeConfig } from '../lib/utils/config-parser';
import type { ChatHistoryData } from '../lib/types/chat-history';

interface IframeWrapperWithHistoryProps {
  config: IframeConfig;
}

/**
 * Enhanced IframeWrapper that uses server-side history.
 * This version will automatically call the history APIs when connecting.
 */
export function IframeWrapperWithHistory({ config }: IframeWrapperWithHistoryProps) {
  const { props, apiKey, mode: initialMode = 'light', inPortal, trustedParentOrigin } = config;

  // State
  const [agentCard, setAgentCard] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(initialMode);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const chatHistoryRef = useRef<ChatHistoryData | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const expectPostMessage = params.get('expectPostMessage') === 'true';
  const enableSidebar = params.get('sidebar') === 'true';

  useEffect(() => {
    setShowSidebar(enableSidebar);
  }, [enableSidebar]);

  // Handle chat history received from parent blade
  const handleChatHistoryReceived = useCallback((history: ChatHistoryData) => {
    console.log('Chat history received:', history);
    chatHistoryRef.current = history;

    // Store contextId if provided
    if (history.contextId) {
      // Set it in the history store
      const { setCurrentContext } = (window as any).__A2A_HISTORY_STORE || {};
      if (setCurrentContext) {
        setCurrentContext(history.contextId);
      }
    }
  }, []);

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
  const finalProps = agentCard ? { ...props, agentCard } : props;

  // Determine theme mode
  const urlMode = params.get('mode');
  const mode = inPortal ? currentTheme : urlMode === 'dark' ? 'dark' : initialMode;

  // Get API URL
  const apiUrl =
    typeof finalProps.agentCard === 'string'
      ? finalProps.agentCard
      : finalProps.agentCard?.url || props.agentUrl || '';

  // Create unauthorized handler
  const baseUrl = getBaseUrl(apiUrl);
  const onUnauthorized = createUnauthorizedHandler({
    baseUrl,
    onRefreshSuccess: () => console.log('Authentication token refreshed successfully'),
    onRefreshFailed: () => console.log('Authentication token refresh failed, prompting re-login'),
    onLogoutComplete: () => console.log('Logout completed, refreshing page'),
  });

  // Create config for MultiSessionChatQuery
  const chatConfig = {
    apiUrl,
    apiKey: authToken || apiKey || finalProps.apiKey,
    onUnauthorized,
  };

  // Use MultiSessionChatQuery for server-side history support with React Query
  return <MultiSessionChatQuery config={chatConfig} mode={mode} {...finalProps} />;
}
