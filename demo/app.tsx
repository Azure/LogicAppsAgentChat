import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatWindow } from '../src/components/ChatWindow';
import { useChatStore } from '../src/store/chatStore';
import type { ChatTheme } from '../src/types';
import '../src/styles/base.css';

// Theme presets
const themes: Record<string, Partial<ChatTheme>> = {
  default: {
    colors: {
      primary: '#667eea',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      error: '#ef4444',
      success: '#10b981'
    }
  },
  blue: {
    colors: {
      primary: '#2563eb',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#f0f9ff',
      text: '#0c4a6e',
      textSecondary: '#0369a1',
      border: '#bfdbfe',
      error: '#dc2626',
      success: '#059669'
    }
  },
  green: {
    colors: {
      primary: '#10b981',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#f0fdf4',
      text: '#14532d',
      textSecondary: '#166534',
      border: '#bbf7d0',
      error: '#dc2626',
      success: '#059669'
    }
  },
  red: {
    colors: {
      primary: '#ef4444',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#fef2f2',
      text: '#450a0a',
      textSecondary: '#991b1b',
      border: '#fecaca',
      error: '#b91c1c',
      success: '#16a34a'
    }
  },
  purple: {
    colors: {
      primary: '#8b5cf6',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#faf5ff',
      text: '#3b0764',
      textSecondary: '#6b21a8',
      border: '#e9d5ff',
      error: '#dc2626',
      success: '#16a34a'
    }
  },
  teal: {
    colors: {
      primary: '#14b8a6',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#f0fdfa',
      text: '#134e4a',
      textSecondary: '#0f766e',
      border: '#99f6e4',
      error: '#dc2626',
      success: '#059669'
    }
  },
  orange: {
    colors: {
      primary: '#f97316',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#fff7ed',
      text: '#431407',
      textSecondary: '#c2410c',
      border: '#fed7aa',
      error: '#dc2626',
      success: '#16a34a'
    }
  },
  pink: {
    colors: {
      primary: '#ec4899',
      primaryText: '#ffffff',
      background: '#ffffff',
      surface: '#fdf2f8',
      text: '#500724',
      textSecondary: '#9f1239',
      border: '#fbcfe8',
      error: '#be123c',
      success: '#16a34a'
    }
  }
};

let currentRoot: ReturnType<typeof createRoot> | null = null;
let currentTheme = 'default';
let currentAgentUrl = '';

interface DemoAppProps {
  agentUrl: string;
}

function DemoApp({ agentUrl }: DemoAppProps) {
  const [, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const handleConnectionChange = (connected: boolean) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
    updateStatus(connected ? 'connected' : 'disconnected');
  };

  React.useEffect(() => {
    setConnectionStatus('connecting');
    updateStatus('connecting');
  }, []);

  return (
    <ChatWindow
      agentUrl={agentUrl}
      theme={themes[currentTheme]}
      onConnectionChange={handleConnectionChange}
      welcomeMessage="Hello! I'm ready to assist you. How can I help today?"
      placeholder="Type your message..."
      allowFileUpload={true}
      maxFileSize={5 * 1024 * 1024}
      allowedFileTypes={['.txt', '.pdf', '.doc', '.docx', '.jpg', '.png']}
    />
  );
}

function mountChat(agentUrl: string) {
  const container = document.getElementById('chat-mount');
  if (!container) {
    console.error('Chat mount container not found');
    return;
  }

  // Store current agent URL
  currentAgentUrl = agentUrl;

  // Clear chat store
  useChatStore.getState().clearMessages();

  // Unmount existing root if any
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }

  // Create new root and render
  currentRoot = createRoot(container);
  currentRoot.render(<DemoApp agentUrl={agentUrl} />);
}

function updateStatus(status: 'connected' | 'disconnected' | 'connecting') {
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('status-text');

  if (statusEl && statusText) {
    statusEl.className = `status-badge ${status}`;

    switch (status) {
      case 'connected':
        statusText.textContent = 'Connected';
        break;
      case 'connecting':
        statusText.textContent = 'Connecting...';
        break;
      case 'disconnected':
        statusText.textContent = 'Not Connected';
        break;
    }
  }
}

// Initialize demo
document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connect-btn');
  const agentUrlInput = document.getElementById('agent-url') as HTMLInputElement;
  const themeButtons = document.querySelectorAll('.theme-option');

  // Connect button handler
  connectBtn?.addEventListener('click', () => {
    const url = agentUrlInput?.value.trim();
    if (url) {
      mountChat(url);
    } else {
      alert('Please enter an A2A Agent URL');
    }
  });

  // Enter key handler for URL input
  agentUrlInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      connectBtn?.click();
    }
  });

  // Theme selector
  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const theme = button.getAttribute('data-theme');
      if (theme) {
        // Update selected state
        themeButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        // Update theme
        currentTheme = theme;

        // Remount chat with new theme if connected
        if (currentAgentUrl && currentRoot) {
          mountChat(currentAgentUrl);
        }
      }
    });
  });

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const agentParam = urlParams.get('agent');
  const themeParam = urlParams.get('theme');
  const embeddedParam = urlParams.get('embedded');

  // Handle embedded mode
  if (embeddedParam === 'true') {
    document.body.classList.add('embedded');
  }

  // Set theme if provided
  if (themeParam && themes[themeParam]) {
    currentTheme = themeParam;
    themeButtons.forEach(btn => {
      if (btn.getAttribute('data-theme') === themeParam) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  // Auto-connect if agent URL is provided
  if (agentParam && agentUrlInput) {
    agentUrlInput.value = agentParam;
    connectBtn?.click();
  }
});