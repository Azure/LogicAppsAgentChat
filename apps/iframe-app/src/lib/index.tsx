import { createRoot } from 'react-dom/client';
import { ChatWindow } from '../components/ChatWindow';
import type { ChatWidgetProps } from '../types';
import '../styles/base.css';

export { ChatWindow };
export type { ChatWidgetProps, ChatTheme, Message, Attachment } from '../types';
export type { AuthConfig, AgentCard } from 'a2a-browser-sdk';

// For convenience, export a function to mount the widget
export function mountChatWidget(
  container: HTMLElement | string,
  props: ChatWidgetProps
): () => void {
  const element = typeof container === 'string' ? document.querySelector(container) : container;

  if (!element) {
    throw new Error('Chat widget container not found');
  }

  const root = createRoot(element);
  root.render(<ChatWindow {...props} />);

  // Return unmount function
  return () => {
    root.unmount();
  };
}
