import React, { useEffect } from 'react';
import { ChatWindow } from '../ChatWindow';
import { useTheme } from '../../hooks/useTheme';
import type { ChatWidgetProps } from '../../types';

/**
 * Main chat widget component that provides a complete chat interface.
 * This is the primary component exported by the library for easy integration
 * into any React application.
 *
 * @example
 * ```tsx
 * import { ChatWidget } from '@microsoft/a2achat-core/react';
 *
 * function App() {
 *   return (
 *     <ChatWidget
 *       agentCard="https://agent.example.com/agent.json"
 *       theme={{
 *         primaryColor: '#007bff',
 *         fontFamily: 'Arial, sans-serif'
 *       }}
 *       welcomeMessage="Hello! How can I help you today?"
 *     />
 *   );
 * }
 * ```
 */
export function ChatWidget(props: ChatWidgetProps) {
  const { theme, ...restProps } = props;

  // Apply theme CSS variables
  const processedTheme = useTheme(theme);

  // Set up global styles for the widget container
  useEffect(() => {
    // Add a class to help with scoped styling
    const style = document.createElement('style');
    style.setAttribute('data-a2a-chat-widget-styles', 'true');
    style.textContent = `
      .a2a-chat-widget {
        height: 100%;
        width: 100%;
        min-height: 400px;
        position: relative;
        font-family: var(--chat-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--chat-font-size, 14px);
        line-height: var(--chat-line-height, 1.5);
        color: var(--chat-color-text, #1a1a1a);
        background-color: var(--chat-color-background, #ffffff);
        border-radius: var(--chat-border-radius, 8px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .a2a-chat-widget * {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Use try-catch to handle cases where the element might have been removed
      try {
        if (style.parentNode === document.head) {
          document.head.removeChild(style);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    };
  }, []);

  return (
    <div className="a2a-chat-widget">
      <ChatWindow {...restProps} theme={processedTheme} />
    </div>
  );
}
