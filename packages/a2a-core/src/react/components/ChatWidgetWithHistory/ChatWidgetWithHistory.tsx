import React, { useEffect, useState } from 'react';
import { ChatWidget } from '../ChatWidget';
import { ConversationList } from '../ConversationList';
import { useHistoryStore } from '../../store/historyStore';
import { A2AClient } from '../../../client/a2a-client';
import type { ChatWidgetProps } from '../../types';
import styles from './ChatWidgetWithHistory.module.css';

export interface ChatWidgetWithHistoryProps extends ChatWidgetProps {
  showSidebar?: boolean;
  sidebarWidth?: number;
  onSidebarToggle?: (collapsed: boolean) => void;
}

/**
 * Enhanced ChatWidget that integrates server-side history.
 * This component automatically:
 * - Loads conversation history from the server on connect
 * - Associates messages with the current context
 * - Provides optional sidebar for conversation management
 */
export function ChatWidgetWithHistory({
  showSidebar = false,
  sidebarWidth = 280,
  onSidebarToggle,
  ...chatWidgetProps
}: ChatWidgetWithHistoryProps) {
  const [client, setClient] = useState<A2AClient | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!showSidebar);
  const { currentContextId } = useHistoryStore();

  // Initialize client when agent card is available
  useEffect(() => {
    if (chatWidgetProps.agentCard) {
      const agentCard =
        typeof chatWidgetProps.agentCard === 'string'
          ? null // Will be resolved by ChatWidget
          : chatWidgetProps.agentCard;

      if (agentCard) {
        const a2aClient = new A2AClient({
          agentCard,
          auth: chatWidgetProps.auth,
          onUnauthorized: chatWidgetProps.onUnauthorized,
          apiKey: chatWidgetProps.apiKey,
        });

        setClient(a2aClient);

        // Load contexts on initialization
        useHistoryStore.getState().fetchContexts(a2aClient, true).catch(console.error);
      }
    }
  }, [
    chatWidgetProps.agentCard,
    chatWidgetProps.auth,
    chatWidgetProps.apiKey,
    chatWidgetProps.onUnauthorized,
  ]);

  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    onSidebarToggle?.(newState);
  };

  // Override sessionKey to use contextId if available
  const enhancedProps: ChatWidgetProps = {
    ...chatWidgetProps,
    // Use contextId as sessionKey to ensure messages are associated correctly
    sessionKey: currentContextId || chatWidgetProps.sessionKey,
    // Add sidebar toggle handler if sidebar is enabled
    onToggleSidebar: showSidebar ? handleSidebarToggle : undefined,
    isSidebarCollapsed: sidebarCollapsed,
  };

  return (
    <div className={styles.container}>
      {showSidebar && !sidebarCollapsed && client && (
        <div className={styles.sidebar} style={{ width: sidebarWidth }}>
          <ConversationList client={client} />
        </div>
      )}
      <div className={styles.chatArea}>
        <ChatWidget {...enhancedProps} />
      </div>
    </div>
  );
}
