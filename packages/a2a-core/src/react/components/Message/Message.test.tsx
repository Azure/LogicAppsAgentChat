import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Message } from './Message';
import type { Message as MessageType } from '../../types';
import styles from './Message.module.css';

// Mock marked modules
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((content: string) => `<p>${content}</p>`),
    use: vi.fn(),
  },
}));

vi.mock('marked-highlight', () => ({
  markedHighlight: vi.fn(() => ({})),
}));

// Mock Prism and its components
vi.mock('prismjs', () => ({
  default: {
    languages: {
      javascript: {},
      typescript: {},
      python: {},
      clike: {},
      markup: {},
      css: {},
      c: {},
      cpp: {},
      csharp: {},
      java: {},
      jsx: {},
      tsx: {},
      go: {},
      rust: {},
      ruby: {},
      kotlin: {},
      swift: {},
      bash: {},
      sql: {},
      json: {},
      yaml: {},
      markdown: {},
      diff: {},
      scss: {},
    },
    highlight: vi.fn((code: string) => code),
  },
}));

// Create global Prism object for component imports
(global as any).Prism = {
  languages: {
    clike: {},
    markup: {},
    css: {},
    javascript: {},
    c: {},
    cpp: {},
    csharp: {},
    java: {},
    typescript: {},
    jsx: {},
    tsx: {},
    python: {},
    go: {},
    rust: {},
    ruby: {},
    kotlin: {},
    swift: {},
    bash: {},
    sql: {},
    json: {},
    yaml: {},
    markdown: {},
    diff: {},
    scss: {},
  },
};

// Mock all Prism component imports
vi.mock('prismjs/themes/prism.css', () => ({}));
vi.mock('prismjs/components/prism-clike', () => ({}));
vi.mock('prismjs/components/prism-markup', () => ({}));
vi.mock('prismjs/components/prism-css', () => ({}));
vi.mock('prismjs/components/prism-javascript', () => ({}));
vi.mock('prismjs/components/prism-c', () => ({}));
vi.mock('prismjs/components/prism-cpp', () => ({}));
vi.mock('prismjs/components/prism-csharp', () => ({}));
vi.mock('prismjs/components/prism-java', () => ({}));
vi.mock('prismjs/components/prism-typescript', () => ({}));
vi.mock('prismjs/components/prism-jsx', () => ({}));
vi.mock('prismjs/components/prism-tsx', () => ({}));
vi.mock('prismjs/components/prism-python', () => ({}));
vi.mock('prismjs/components/prism-go', () => ({}));
vi.mock('prismjs/components/prism-rust', () => ({}));
vi.mock('prismjs/components/prism-ruby', () => ({}));
vi.mock('prismjs/components/prism-kotlin', () => ({}));
vi.mock('prismjs/components/prism-swift', () => ({}));
vi.mock('prismjs/components/prism-bash', () => ({}));
vi.mock('prismjs/components/prism-sql', () => ({}));
vi.mock('prismjs/components/prism-json', () => ({}));
vi.mock('prismjs/components/prism-yaml', () => ({}));
vi.mock('prismjs/components/prism-markdown', () => ({}));
vi.mock('prismjs/components/prism-diff', () => ({}));
vi.mock('prismjs/components/prism-scss', () => ({}));

// Mock Intl.DateTimeFormat
const mockFormat = vi.fn(() => '2:30 PM');
global.Intl.DateTimeFormat = vi.fn(() => ({
  format: mockFormat,
  resolvedOptions: vi.fn(),
  formatToParts: vi.fn(),
  formatRange: vi.fn(),
  formatRangeToParts: vi.fn(),
})) as any;

describe('Message', () => {
  const baseMessage: MessageType = {
    id: '1',
    content: 'Test message',
    sender: 'user',
    timestamp: new Date('2024-01-01T14:30:00'),
    status: 'sent',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user message correctly', () => {
    render(<Message message={baseMessage} />);

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Assistant response',
    };

    render(<Message message={assistantMessage} />);

    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Assistant response')).toBeInTheDocument();
  });

  it('uses custom agent name', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
    };

    render(<Message message={assistantMessage} agentName="AI Assistant" />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('applies correct CSS classes for user message', () => {
    const { container } = render(<Message message={baseMessage} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(styles.messageWrapper);
    expect(wrapper).toHaveClass(styles.user);
    expect(wrapper).toHaveClass('chat-fade-in');
    expect(wrapper).not.toHaveClass(styles.assistant);
  });

  it('applies correct CSS classes for assistant message', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
    };

    const { container } = render(<Message message={assistantMessage} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(styles.messageWrapper);
    expect(wrapper).toHaveClass(styles.assistant);
    expect(wrapper).not.toHaveClass(styles.user);
  });

  it('renders message tail for assistant messages', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
    };

    const { container } = render(<Message message={assistantMessage} />);

    const tail = container.querySelector(`.${styles.messageTail}`);
    expect(tail).toBeInTheDocument();
  });

  it('does not render message tail for user messages', () => {
    const { container } = render(<Message message={baseMessage} />);

    const tail = container.querySelector(`.${styles.messageTail}`);
    expect(tail).not.toBeInTheDocument();
  });

  it('renders error status', () => {
    const errorMessage: MessageType = {
      ...baseMessage,
      status: 'error',
    };

    render(<Message message={errorMessage} />);

    expect(screen.getByText('Failed to send')).toBeInTheDocument();
  });

  it('does not render error status for sent messages', () => {
    render(<Message message={baseMessage} />);

    expect(screen.queryByText('Failed to send')).not.toBeInTheDocument();
  });

  it('renders attachments when present', () => {
    const messageWithAttachments: MessageType = {
      ...baseMessage,
      attachments: [
        {
          id: 'att1',
          name: 'document.pdf',
          size: 1048576, // 1MB
          type: 'application/pdf',
          status: 'uploaded',
        },
        {
          id: 'att2',
          name: 'image.png',
          size: 2097152, // 2MB
          type: 'image/png',
          status: 'uploaded',
        },
      ],
    };

    render(<Message message={messageWithAttachments} />);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('(1 MB)')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText('(2 MB)')).toBeInTheDocument();
  });

  it('does not render attachments section when no attachments', () => {
    const { container } = render(<Message message={baseMessage} />);

    const attachments = container.querySelector(`.${styles.attachments}`);
    expect(attachments).not.toBeInTheDocument();
  });

  it('renders artifact content with special styling', () => {
    const artifactMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      metadata: { isArtifact: true },
    };

    const { container } = render(<Message message={artifactMessage} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(styles.artifact);

    const content = container.querySelector(`.${styles.artifactContent}`);
    expect(content).toBeInTheDocument();
  });

  it('parses markdown content for assistant messages', async () => {
    const { marked } = await import('marked');
    const markdownMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: '**Bold text**',
    };

    render(<Message message={markdownMessage} />);

    expect(marked.parse).toHaveBeenCalledWith('**Bold text**', {
      gfm: true,
      breaks: true,
    });
  });

  it('does not parse markdown for user messages', async () => {
    const { marked } = await import('marked');
    const markdownMessage: MessageType = {
      ...baseMessage,
      content: '**Bold text**',
    };

    render(<Message message={markdownMessage} />);

    expect(marked.parse).not.toHaveBeenCalled();
    expect(screen.getByText('**Bold text**')).toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    const messageWithAttachments: MessageType = {
      ...baseMessage,
      attachments: [
        { id: '1', name: 'tiny.txt', size: 500, type: 'text/plain', status: 'uploaded' },
        { id: '2', name: 'small.txt', size: 1024, type: 'text/plain', status: 'uploaded' },
        { id: '3', name: 'medium.txt', size: 1048576, type: 'text/plain', status: 'uploaded' },
        { id: '4', name: 'large.txt', size: 1073741824, type: 'text/plain', status: 'uploaded' },
      ],
    };

    render(<Message message={messageWithAttachments} />);

    expect(screen.getByText('(500 Bytes)')).toBeInTheDocument();
    expect(screen.getByText('(1 KB)')).toBeInTheDocument();
    expect(screen.getByText('(1 MB)')).toBeInTheDocument();
    expect(screen.getByText('(1 GB)')).toBeInTheDocument();
  });

  it('handles zero-byte files', () => {
    const messageWithEmptyFile: MessageType = {
      ...baseMessage,
      attachments: [
        { id: '1', name: 'empty.txt', size: 0, type: 'text/plain', status: 'uploaded' },
      ],
    };

    render(<Message message={messageWithEmptyFile} />);

    expect(screen.getByText('(0 Bytes)')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    const message: MessageType = {
      ...baseMessage,
      timestamp: new Date('2024-01-01T09:05:00'), // 9:05 AM
    };

    render(<Message message={message} />);

    expect(mockFormat).toHaveBeenCalledWith(message.timestamp);
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('renders HTML content safely using dangerouslySetInnerHTML', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: '<script>alert("XSS")</script>Normal text',
    };

    const { container } = render(<Message message={assistantMessage} />);

    // Check that content is rendered through dangerouslySetInnerHTML
    const markdownContent = container.querySelector(`.${styles.markdownContent}`);
    expect(markdownContent).toBeInTheDocument();
    expect(markdownContent?.innerHTML).toContain('<p>');
  });

  it('handles empty attachments array', () => {
    const messageWithEmptyAttachments: MessageType = {
      ...baseMessage,
      attachments: [],
    };

    const { container } = render(<Message message={messageWithEmptyAttachments} />);

    const attachments = container.querySelector(`.${styles.attachments}`);
    expect(attachments).not.toBeInTheDocument();
  });

  it('renders all message structure elements', () => {
    const { container } = render(<Message message={baseMessage} />);

    expect(container.querySelector(`.${styles.messageContainer}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.senderName}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.messageBubble}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.message}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.metadata}`)).toBeInTheDocument();
    expect(container.querySelector(`.${styles.time}`)).toBeInTheDocument();
  });
});
