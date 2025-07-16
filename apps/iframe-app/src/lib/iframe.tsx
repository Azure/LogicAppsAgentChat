import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { ChatWidget, type ChatWidgetProps, type ChatTheme } from '@microsoft/a2achat-core/react';
import { MultiSessionChat } from '../components/MultiSessionChat';
import '@microsoft/a2achat-core/react/styles.css';
import '../styles/base.css';

// Parse configuration from data attributes or URL parameters
function parseConfig(): {
  props: ChatWidgetProps;
  multiSession: boolean;
  apiKey?: string;
  mode?: 'light' | 'dark';
} {
  const params = new URLSearchParams(window.location.search);
  const dataset = document.documentElement.dataset;
  // Get agent card URL (required) - support both 'agent' and 'agentCard' parameters
  let agentCard = dataset.agentCard || params.get('agentCard') || params.get('agent');

  // Get API key from query parameter or data attribute
  const apiKey = params.get('apiKey') || dataset.apiKey;

  if (!agentCard) {
    // Transform current URL to agent card URL if we're in an iframe context
    const currentUrl = window.location.href;
    const iframePattern = /\/api\/agentsChat\/([^/]+)\/IFrame/i;
    const match = currentUrl.match(iframePattern);

    if (match && match[1]) {
      // Extract the agent kind and construct the agent card URL
      const agentKind = match[1];
      const baseUrl = currentUrl.split('/api/agentsChat/')[0];
      agentCard = `${baseUrl}/api/agents/${agentKind}/.well-known/agent.json`;
    } else {
      throw new Error(
        'data-agent-card is required or URL must follow /api/agentsChat/{AgentKind}/IFrame pattern'
      );
    }
  }

  // Parse theme from data attributes or URL parameter
  const theme: Partial<ChatTheme> = {};

  // Check if theme is provided as URL parameter (for demo)
  const themeParam = params.get('theme');
  const modeParam = params.get('mode'); // Separate mode parameter

  if (themeParam) {
    // Handle predefined theme names from demo
    const themeColors: Record<string, Partial<ChatTheme['colors']>> = {
      default: {
        primary: '#667eea',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#10b981',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#2d2d2d',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#404040',
      },
      blue: {
        primary: '#2563eb',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#f0f9ff',
        text: '#0c4a6e',
        textSecondary: '#0369a1',
        border: '#bfdbfe',
        error: '#dc2626',
        success: '#059669',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#1e293b',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#334155',
      },
      green: {
        primary: '#10b981',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#f0fdf4',
        text: '#14532d',
        textSecondary: '#166534',
        border: '#bbf7d0',
        error: '#dc2626',
        success: '#059669',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#1e3a2e',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#2d5a3d',
      },
      red: {
        primary: '#ef4444',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#fef2f2',
        text: '#450a0a',
        textSecondary: '#991b1b',
        border: '#fecaca',
        error: '#b91c1c',
        success: '#16a34a',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#3a1e1e',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#5a2d2d',
      },
      purple: {
        primary: '#8b5cf6',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#faf5ff',
        text: '#3b0764',
        textSecondary: '#6b21a8',
        border: '#e9d5ff',
        error: '#dc2626',
        success: '#16a34a',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#2e1e3a',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#4a2d5a',
      },
      teal: {
        primary: '#14b8a6',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#f0fdfa',
        text: '#134e4a',
        textSecondary: '#0f766e',
        border: '#99f6e4',
        error: '#dc2626',
        success: '#059669',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#1e3a3a',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#2d5a5a',
      },
      orange: {
        primary: '#f97316',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#fff7ed',
        text: '#431407',
        textSecondary: '#c2410c',
        border: '#fed7aa',
        error: '#dc2626',
        success: '#16a34a',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#3a2e1e',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#5a3d2d',
      },
      pink: {
        primary: '#ec4899',
        primaryText: '#ffffff',
        background: '#ffffff',
        surface: '#fdf2f8',
        text: '#500724',
        textSecondary: '#9f1239',
        border: '#fbcfe8',
        error: '#be123c',
        success: '#16a34a',
        // Dark mode variants
        backgroundDark: '#1a1a1a',
        surfaceDark: '#3a1e2e',
        textDark: '#e0e0e0',
        textSecondaryDark: '#a0a0a0',
        borderDark: '#5a2d4a',
      },
    };

    if (themeColors[themeParam]) {
      theme.colors = themeColors[themeParam] as ChatTheme['colors'];
    }
  }

  // Colors
  if (dataset.themePrimary || dataset.themeBackground) {
    // Provide all required color fields with defaults or existing values
    theme.colors = {
      primary: dataset.themePrimary || theme.colors?.primary || '#1976d2',
      primaryText: theme.colors?.primaryText || '#fff',
      background: dataset.themeBackground || theme.colors?.background || '#fff',
      surface: theme.colors?.surface || '#fff',
      text: theme.colors?.text || '#222',
      textSecondary: theme.colors?.textSecondary || '#666',
      border: theme.colors?.border || '#e0e0e0',
      error: theme.colors?.error || '#d32f2f',
      success: theme.colors?.success || '#388e3c',
    };
  }

  // Branding - check both data attributes and URL parameters
  const logoUrl = dataset.logoUrl || params.get('logoUrl');
  if (logoUrl) {
    const logoSize = dataset.logoSize || params.get('logoSize');
    const logoPosition = dataset.logoPosition || params.get('logoPosition');

    theme.branding = {
      logoUrl,
      logoSize: (['small', 'medium', 'large'].includes(logoSize as string)
        ? logoSize
        : 'medium') as 'small' | 'medium' | 'large',
      logoPosition:
        logoPosition === 'header' || logoPosition === 'footer'
          ? (logoPosition as 'header' | 'footer')
          : 'header',
    };
  }

  // Other props
  const props: ChatWidgetProps = {
    agentCard,
    theme: Object.keys(theme).length > 0 ? theme : undefined,
    userId: dataset.userId || params.get('userId') || undefined,
    userName: dataset.userName || params.get('userName') || window.LOGGED_IN_USER_NAME || undefined,
    placeholder: dataset.placeholder || params.get('placeholder') || undefined,
    welcomeMessage: dataset.welcomeMessage || params.get('welcomeMessage') || undefined,
    allowFileUpload: dataset.allowFileUpload === 'true' || params.get('allowFileUpload') === 'true',
    maxFileSize: dataset.maxFileSize ? parseInt(dataset.maxFileSize) : undefined,
    allowedFileTypes: dataset.allowedFileTypes?.split(',').map((t) => t.trim()),
    apiKey: apiKey || undefined,
  };

  // Check if multi-session mode is enabled
  const multiSession = dataset.multiSession === 'true' || params.get('multiSession') === 'true';

  // Parse metadata if provided
  const metadataStr = dataset.metadata || params.get('metadata');
  if (metadataStr) {
    try {
      props.metadata = JSON.parse(metadataStr);
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }
  }

  // Determine mode
  const mode = modeParam === 'dark' ? 'dark' : 'light';

  return { props, multiSession, apiKey, mode };
}

// Wrapper component that can receive agent card via postMessage
function IframeWrapper({
  props,
  multiSession,
  apiKey,
  mode: initialMode = 'light',
}: {
  props: ChatWidgetProps;
  multiSession: boolean;
  apiKey?: string;
  mode?: 'light' | 'dark';
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agentCard, setAgentCard] = useState<any>(null);
  const [isWaitingForAgentCard, setIsWaitingForAgentCard] = useState(false);

  // Check if we should wait for postMessage
  const params = new URLSearchParams(window.location.search);
  const expectPostMessage = params.get('expectPostMessage') === 'true';

  useEffect(() => {
    if (expectPostMessage) {
      setIsWaitingForAgentCard(true);

      // Listen for postMessage
      const handleMessage = (event: MessageEvent) => {
        // Validate message
        if (event.data && event.data.type === 'SET_AGENT_CARD') {
          setAgentCard(event.data.agentCard);
          setIsWaitingForAgentCard(false);

          // Send acknowledgment
          if (event.source && typeof event.source.postMessage === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            event.source.postMessage({ type: 'AGENT_CARD_RECEIVED' }, event.origin as any);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Send ready signal to parent
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
      }

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [expectPostMessage]);

  // Show loading state while waiting for agent card
  if (expectPostMessage && isWaitingForAgentCard) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'sans-serif',
          color: '#666',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Waiting for Configuration</h3>
          <p style={{ margin: 0 }}>Waiting for agent card data via postMessage...</p>
        </div>
      </div>
    );
  }

  // If we received an agent card via postMessage, use that instead
  const finalProps = agentCard ? { ...props, agentCard } : props;

  // Use the mode from props or URL params
  const urlMode = params.get('mode');
  const mode = urlMode === 'dark' ? 'dark' : initialMode;
  const fluentTheme = mode;

  // Use MultiSessionChat if multi-session mode is enabled
  if (multiSession) {
    return (
      <MultiSessionChat
        config={{
          apiUrl: finalProps.agentCard,
          apiKey: apiKey || '', // Pass the API key from query params
        }}
        {...finalProps}
        mode={mode}
      />
    );
  }

  return <ChatWidget {...finalProps} mode={mode} fluentTheme={fluentTheme} />;
}

// Initialize the widget
function init() {
  try {
    const { props, multiSession, apiKey, mode } = parseConfig();

    const container = document.getElementById('chat-root');

    if (!container) {
      throw new Error('Chat root element not found');
    }

    const root = createRoot(container);

    root.render(
      <IframeWrapper props={props} multiSession={multiSession} apiKey={apiKey} mode={mode} />
    );
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      location: window.location.href,
      search: window.location.search,
    });

    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: sans-serif;
        color: #666;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h3 style="color: #333; margin-bottom: 10px;">Failed to load chat widget</h3>
          <p style="margin: 0;">${typeof error === 'object' && error && 'message' in error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : String(error)}</p>
          <p style="margin-top: 10px; font-size: 12px; color: #999;">URL: ${window.location.href}</p>
          <p style="margin-top: 5px; font-size: 12px; color: #999;">Parameters: ${window.location.search || 'none'}</p>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
