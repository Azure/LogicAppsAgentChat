import { useState } from 'react';
import { createRoot } from 'react-dom/client';

type ViewMode = 'iframe' | 'embed';

const themes = {
  default: { primary: '#667eea', name: 'Default' },
  blue: { primary: '#2563eb', name: 'Blue' },
  green: { primary: '#10b981', name: 'Green' },
  red: { primary: '#ef4444', name: 'Red' },
  purple: { primary: '#8b5cf6', name: 'Purple' },
  teal: { primary: '#14b8a6', name: 'Teal' },
  orange: { primary: '#f97316', name: 'Orange' },
  pink: { primary: '#ec4899', name: 'Pink' },
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('iframe');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [agentUrl, setAgentUrl] = useState('https://example.com/agent');
  const [logoUrl, setLogoUrl] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you today?');

  const getIframeUrl = () => {
    // In development, iframe app runs on port 3001
    // In production, this would be your deployed iframe app URL
    const iframeBaseUrl = import.meta.env.DEV
      ? 'http://localhost:3001'
      : window.location.origin + '/iframe-app';

    const params = new URLSearchParams({
      theme: selectedTheme,
      agentCard: agentUrl,
      welcomeMessage: welcomeMessage,
      allowFileUpload: 'true',
    });

    if (logoUrl) {
      params.set('logoUrl', logoUrl);
    }

    return `${iframeBaseUrl}/?${params.toString()}`;
  };

  const getEmbedCode = () => {
    const iframeUrl = getIframeUrl();

    return `<iframe 
  src="${iframeUrl}"
  style="width: 400px; height: 600px; border: none; border-radius: 8px;"
  title="A2A Chat Widget"
></iframe>`;
  };

  const renderDemo = () => {
    if (viewMode === 'iframe') {
      return (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#f9f9f9',
            padding: '20px',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Live Preview</h3>
          <iframe
            src={getIframeUrl()}
            style={{
              width: '100%',
              height: '500px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: 'white',
            }}
            title="A2A Chat Widget Preview"
          />
        </div>
      );
    } else {
      return (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Embed Code</h3>
          <textarea
            value={getEmbedCode()}
            readOnly
            style={{
              width: '100%',
              height: '120px',
              fontFamily: 'monospace',
              fontSize: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '12px',
              backgroundColor: '#fff',
              resize: 'none',
            }}
          />
          <button
            onClick={() => navigator.clipboard.writeText(getEmbedCode())}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '350px',
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRight: '1px solid #dee2e6',
          overflowY: 'auto',
        }}
      >
        <h2>A2A Chat Demo</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3>View Mode</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <input
                type="radio"
                name="viewMode"
                value="iframe"
                checked={viewMode === 'iframe'}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                style={{ marginRight: '8px' }}
              />
              Live Preview
            </label>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <input
                type="radio"
                name="viewMode"
                value="embed"
                checked={viewMode === 'embed'}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                style={{ marginRight: '8px' }}
              />
              Embed Code
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Configuration</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Agent URL:
            </label>
            <input
              type="url"
              value={agentUrl}
              onChange={(e) => setAgentUrl(e.target.value)}
              placeholder="https://example.com/agent"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Welcome Message:
            </label>
            <input
              type="text"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hello! How can I help you today?"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Logo URL (optional):
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Theme</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {Object.entries(themes).map(([key, theme]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: selectedTheme === key ? theme.primary + '20' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="theme"
                  value={key}
                  checked={selectedTheme === key}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: theme.primary,
                    borderRadius: '50%',
                    marginRight: '8px',
                  }}
                ></div>
                {theme.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3>Features</h3>
          <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px' }}>
            <li>Iframe embedding</li>
            <li>Customizable themes</li>
            <li>Logo branding</li>
            <li>File upload support</li>
            <li>Markdown rendering</li>
            <li>A2A agent integration</li>
            <li>PostMessage API</li>
          </ul>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1>A2A Chat Iframe Demo</h1>
          <p>Configure the settings in the sidebar to customize the chat widget.</p>
        </div>

        <div style={{ maxWidth: '800px' }}>{renderDemo()}</div>

        <div style={{ marginTop: '40px', maxWidth: '800px' }}>
          <h2>How to Use</h2>
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
            }}
          >
            <h3>1. Basic Iframe Usage</h3>
            <pre
              style={{
                backgroundColor: '#fff',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
              }}
            >{`<iframe 
  src="https://your-domain.com/iframe-app/?agentCard=https://example.com/agent&theme=blue"
  style="width: 400px; height: 600px; border: none;"
  title="A2A Chat Widget"
></iframe>`}</pre>

            <h3>2. With Data Attributes</h3>
            <pre
              style={{
                backgroundColor: '#fff',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
              }}
            >{`<iframe 
  src="https://your-domain.com/iframe-app/"
  data-agent-card="https://example.com/agent"
  data-theme-primary="#2563eb"
  data-welcome-message="Hello! How can I help?"
  data-logo-url="https://example.com/logo.png"
  style="width: 400px; height: 600px; border: none;"
  title="A2A Chat Widget"
></iframe>`}</pre>

            <h3>3. PostMessage Integration</h3>
            <pre
              style={{
                backgroundColor: '#fff',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
              }}
            >{`<iframe 
  id="chat-iframe"
  src="https://your-domain.com/iframe-app/?expectPostMessage=true"
  style="width: 400px; height: 600px; border: none;"
  title="A2A Chat Widget"
></iframe>

<script>
// Listen for iframe ready signal
window.addEventListener('message', function(event) {
  if (event.data?.type === 'IFRAME_READY') {
    // Send agent card configuration
    document.getElementById('chat-iframe').contentWindow.postMessage({
      type: 'SET_AGENT_CARD',
      agentCard: {
        name: "My Agent",
        url: "https://agent.example.com/rpc",
        capabilities: { streaming: true }
      }
    }, '*');
  }
});
</script>`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
