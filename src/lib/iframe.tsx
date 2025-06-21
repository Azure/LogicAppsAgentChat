import { createRoot } from 'react-dom/client';
import { ChatWindow } from '../components/ChatWindow';
import type { ChatWidgetProps, ChatTheme } from '../types';
import '../styles/base.css';

// Parse configuration from data attributes or URL parameters
function parseConfig(): ChatWidgetProps {
  const params = new URLSearchParams(window.location.search);
  const dataset = document.documentElement.dataset;

  // Get agent URL (required)
  const agentUrl = dataset.agentUrl || params.get('agentUrl');
  if (!agentUrl) {
    throw new Error('data-agent-url is required');
  }

  // Parse theme from data attributes
  const theme: Partial<ChatTheme> = {};

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

  // Branding
  if (dataset.logoUrl) {
    theme.branding = {
      logoUrl: dataset.logoUrl,
      logoSize: (['small', 'medium', 'large'].includes(dataset.logoSize as string) ? dataset.logoSize : 'medium') as 'small' | 'medium' | 'large',
      logoPosition: (dataset.logoPosition === 'header' || dataset.logoPosition === 'footer')
        ? dataset.logoPosition as 'header' | 'footer'
        : 'header',
    };
  }

  // Other props
  const props: ChatWidgetProps = {
    agentUrl,
    theme: Object.keys(theme).length > 0 ? theme : undefined,
    userId: dataset.userId || params.get('userId') || undefined,
    placeholder: dataset.placeholder || params.get('placeholder') || undefined,
    welcomeMessage: dataset.welcomeMessage || params.get('welcomeMessage') || undefined,
    allowFileUpload: dataset.allowFileUpload !== 'false',
    maxFileSize: dataset.maxFileSize ? parseInt(dataset.maxFileSize) : undefined,
    allowedFileTypes: dataset.allowedFileTypes?.split(',').map(t => t.trim()),
  };

  // Parse metadata if provided
  const metadataStr = dataset.metadata || params.get('metadata');
  if (metadataStr) {
    try {
      props.metadata = JSON.parse(metadataStr);
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }
  }

  return props;
}

// Initialize the widget
function init() {
  try {
    const config = parseConfig();
    const container = document.getElementById('chat-root');

    if (!container) {
      throw new Error('Chat root element not found');
    }

    const root = createRoot(container);
    root.render(<ChatWindow {...config} />);
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);
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
          <p style="margin: 0;">${typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error)}</p>
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