/**
 * Iframe integration for A2A Chat Widget
 *
 * Security: This component implements origin verification for postMessage communication.
 * To configure allowed origins, use one of these methods:
 *
 * 1. URL parameter: ?allowedOrigins=https://example.com,https://app.example.com
 * 2. Data attribute: <html data-allowed-origins="https://example.com,https://app.example.com">
 * 3. Wildcard subdomains: ?allowedOrigins=*.example.com
 *
 * If no origins are specified, the iframe will:
 * - Allow messages from its own origin
 * - Allow messages from the document referrer (parent frame)
 * - In development (localhost), allow common development ports
 */

import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IframeWrapper } from '../components/IframeWrapper';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { useIframeConfig } from './hooks/useIframeConfig';
import '@microsoft/a2achat-core/react/styles.css';
import '../styles/base.css';

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime in v4)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Main application component that uses the configuration
function App() {
  const config = useIframeConfig();
  return (
    <QueryClientProvider client={queryClient}>
      <IframeWrapper config={config} />
    </QueryClientProvider>
  );
}

// Initialize the widget
function init() {
  try {
    const container = document.getElementById('chat-root');
    if (!container) {
      throw new Error('Chat root element not found');
    }

    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);

    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      location: window.location.href,
      search: window.location.search,
    };

    console.error('Error details:', errorDetails);

    // Display error to user
    const root = createRoot(document.body);
    root.render(
      <ErrorDisplay
        title="Failed to load chat widget"
        message={errorDetails.message}
        details={{
          url: errorDetails.location,
          parameters: errorDetails.search || 'none',
        }}
      />
    );
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
