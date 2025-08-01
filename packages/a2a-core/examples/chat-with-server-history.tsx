import React from 'react';
import {
  ChatWidget,
  ChatThemeProvider,
  ConversationList,
  useA2AWithHistory,
  useChatHistory,
} from '@microsoft/a2achat-core/react';
import type { AgentCard } from '@microsoft/a2achat-core';

/**
 * Example implementation of a chat interface with server-side history.
 *
 * This example demonstrates:
 * 1. Loading conversation history from the server
 * 2. Displaying a sidebar with conversation list
 * 3. Switching between conversations
 * 4. Creating new conversations
 * 5. Renaming and archiving conversations
 */
export function ChatWithServerHistory() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Your agent card configuration
  const agentCard: AgentCard = {
    protocolVersion: '0.2.9',
    name: 'My Assistant',
    description: 'A helpful AI assistant',
    url: 'https://api.example.com/agent',
    capabilities: {
      streaming: true,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [],
    version: '1.0.0',
  };

  return (
    <ChatThemeProvider theme="light">
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar with conversation list */}
        {!sidebarCollapsed && (
          <div style={{ width: '280px', flexShrink: 0 }}>
            <ChatWithSidebar agentCard={agentCard} />
          </div>
        )}

        {/* Main chat area */}
        <div style={{ flex: 1 }}>
          <ChatWidget
            agentCard={agentCard}
            auth={{
              type: 'bearer',
              token: 'your-auth-token',
            }}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            isSidebarCollapsed={sidebarCollapsed}
          />
        </div>
      </div>
    </ChatThemeProvider>
  );
}

/**
 * Internal component that manages the connection and provides
 * the client to both the sidebar and chat components
 */
function ChatWithSidebar({ agentCard }: { agentCard: AgentCard }) {
  const { isConnected, connect, sendMessage, contextId } = useA2AWithHistory({
    auth: {
      type: 'bearer',
      token: 'your-auth-token',
    },
  });

  // Connect on mount
  React.useEffect(() => {
    if (!isConnected) {
      connect(agentCard);
    }
  }, []);

  // Get the client from the hook (you'd need to expose this)
  // For now, we'll create a client instance directly
  const client = React.useMemo(() => {
    if (!isConnected) return null;

    return new (window as any).A2AClient({
      agentCard,
      auth: {
        type: 'bearer',
        token: 'your-auth-token',
      },
    });
  }, [isConnected, agentCard]);

  const { createNewContext } = useChatHistory(client);

  return (
    <ConversationList
      client={client}
      onNewConversation={() => {
        // When creating a new conversation, clear the current messages
        createNewContext();
      }}
    />
  );
}

/**
 * Alternative approach using the existing ChatWidget with custom integration
 */
export function ChatWidgetWithHistory() {
  const [agentCard, setAgentCard] = React.useState<AgentCard | null>(null);
  const [client, setClient] = React.useState<any>(null);

  React.useEffect(() => {
    // Fetch agent card
    fetch('https://api.example.com/.well-known/agent.json')
      .then((res) => res.json())
      .then((card) => {
        setAgentCard(card);

        // Create client instance
        const a2aClient = new (window as any).A2AClient({
          agentCard: card,
          auth: {
            type: 'bearer',
            token: 'your-auth-token',
          },
        });

        setClient(a2aClient);
      });
  }, []);

  if (!agentCard || !client) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '280px' }}>
        <ConversationList client={client} />
      </div>
      <div style={{ flex: 1 }}>
        <ChatWidget
          agentCard={agentCard}
          auth={{
            type: 'bearer',
            token: 'your-auth-token',
          }}
          // The ChatWidget will automatically use the current context
          // from the history store when sending messages
        />
      </div>
    </div>
  );
}

/**
 * Usage notes:
 *
 * 1. The conversation history is automatically loaded when the client connects
 * 2. Switching conversations in the sidebar will load that conversation's messages
 * 3. New messages are automatically associated with the current context
 * 4. The context ID is maintained throughout the conversation
 * 5. Conversations can be renamed and archived through the UI
 *
 * Server requirements:
 * - Implement the contexts/list, tasks/list, and contexts/update endpoints
 * - Return contextId in message responses
 * - Store messages associated with contexts on the server
 */
