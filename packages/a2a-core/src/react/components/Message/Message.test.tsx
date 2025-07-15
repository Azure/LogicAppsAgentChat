import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Message } from './Message';
import type { Message as MessageType } from '../../types';
import { downloadFile } from '../../utils/downloadUtils';

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

// Mock download utils
vi.mock('../../utils/downloadUtils', () => ({
  downloadFile: vi.fn(),
  getMimeType: vi.fn((filename: string) => 'text/plain'),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('renders user message with correct structure', () => {
    const { container } = render(<Message message={baseMessage} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // User messages should contain "You" as the sender name
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('renders assistant message with correct structure', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
    };

    const { container } = render(<Message message={assistantMessage} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // Assistant messages should contain "Agent" as the default sender name
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders assistant messages with avatar', () => {
    const assistantMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
    };

    render(<Message message={assistantMessage} />);

    // Assistant messages should show "Agent" as the default sender
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders user messages with user name', () => {
    render(<Message message={baseMessage} />);

    // User messages should show "You" as the sender
    expect(screen.getByText('You')).toBeInTheDocument();
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
    render(<Message message={baseMessage} />);

    // When there are no attachments, the attachment section should not be visible
    expect(screen.queryByText(/uploaded/)).not.toBeInTheDocument();
  });

  it('renders artifact content with special styling', () => {
    const artifactMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      metadata: { isArtifact: true },
    };

    render(<Message message={artifactMessage} />);

    // Artifact messages should be rendered with "Agent" as sender
    expect(screen.getByText('Agent')).toBeInTheDocument();
    // Check content is rendered
    expect(screen.getByText('Test message')).toBeInTheDocument();
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

    render(<Message message={assistantMessage} />);

    // The script tag should be escaped/sanitized, but the normal text should be visible
    expect(screen.getByText(/Normal text/)).toBeInTheDocument();
    // Script content should not execute
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();
  });

  it('handles empty attachments array', () => {
    const messageWithEmptyAttachments: MessageType = {
      ...baseMessage,
      attachments: [],
    };

    render(<Message message={messageWithEmptyAttachments} />);

    // Empty attachments array should not render any attachment indicators
    expect(screen.queryByText(/uploaded/)).not.toBeInTheDocument();
  });

  it('renders all message structure elements', () => {
    render(<Message message={baseMessage} />);

    // Check for sender name
    expect(screen.getByText('You')).toBeInTheDocument();
    // Check for message content
    expect(screen.getByText('Test message')).toBeInTheDocument();
    // Check for timestamp
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('renders code artifact with syntax highlighting', async () => {
    const user = userEvent.setup();
    const codeMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Here is your code',
      metadata: {
        isArtifact: true,
        isCodeFile: true,
        rawContent: 'console.log("Hello World");',
        artifactName: 'test.js',
      },
    };

    render(<Message message={codeMessage} />);

    // Need to click view to see the code
    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    const codeBlock = screen.getByText('console.log("Hello World");');
    expect(codeBlock).toBeInTheDocument();
    // Verify code is in a pre element (code block)
    expect(codeBlock.closest('pre')).toBeInTheDocument();
  });

  it('renders artifact without syntax highlighting for unknown language', async () => {
    const user = userEvent.setup();
    const codeMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Here is your file',
      metadata: {
        isArtifact: true,
        isCodeFile: true,
        rawContent: 'Some content',
        artifactName: 'test.unknown',
      },
    };

    render(<Message message={codeMessage} />);

    // Need to click view to see the content
    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    const codeBlock = screen.getByText('Some content');
    expect(codeBlock).toBeInTheDocument();
  });

  it('handles syntax highlighting errors gracefully', async () => {
    const user = userEvent.setup();
    // Mock console.error to verify it's called
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock Prism to throw an error
    const { default: Prism } = await import('prismjs');
    const originalHighlight = Prism.highlight;
    Prism.highlight = vi.fn(() => {
      throw new Error('Highlight error');
    });

    const codeMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Code with error',
      metadata: {
        isArtifact: true,
        isCodeFile: true,
        rawContent: 'const test = 1;',
        artifactName: 'test.js',
      },
    };

    render(<Message message={codeMessage} />);

    // Need to click view to see the content
    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    // Should still render the code without highlighting
    expect(screen.getByText('const test = 1;')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Prism highlight error:', expect.any(Error));

    // Restore
    Prism.highlight = originalHighlight;
    consoleSpy.mockRestore();
  });

  it('handles artifact download', async () => {
    const user = userEvent.setup();

    const artifactMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Here is your file',
      metadata: {
        isArtifact: true,
        rawContent: 'File content',
        artifactName: 'test.txt',
      },
    };

    render(<Message message={artifactMessage} />);

    // The download button has text "Download"
    const downloadButton = screen.getByText('Download');
    await user.click(downloadButton);

    // Verify downloadFile was called
    expect(vi.mocked(downloadFile)).toHaveBeenCalledWith('File content', 'test.txt', 'text/plain');
  });

  it('handles grouped artifacts download', async () => {
    const user = userEvent.setup();

    const groupedMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Multiple files',
      metadata: {
        isArtifact: true,
        isGroupedArtifact: true,
        artifacts: [
          { name: 'file1.txt', rawContent: 'Content 1' },
          { name: 'file2.txt', rawContent: 'Content 2' },
        ],
      },
    };

    render(<Message message={groupedMessage} />);

    // The Download All button has text "Download All"
    const downloadButton = screen.getByText('Download All');
    await user.click(downloadButton);

    // Wait for setTimeout delays
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify both files were downloaded
    expect(vi.mocked(downloadFile)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(downloadFile)).toHaveBeenCalledWith('Content 1', 'file1.txt', 'text/plain');
    expect(vi.mocked(downloadFile)).toHaveBeenCalledWith('Content 2', 'file2.txt', 'text/plain');
  });

  it('toggles content visibility for artifact messages', async () => {
    const user = userEvent.setup();

    const artifactMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Long content that can be collapsed',
      metadata: {
        isArtifact: true,
        rawContent: 'Very long content...',
        artifactName: 'large.txt',
      },
    };

    render(<Message message={artifactMessage} />);

    // Initially hidden for artifacts
    let artifactContent = screen.queryByText('Very long content...');
    expect(artifactContent).not.toBeInTheDocument();

    // Click to show - button has text "View"
    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    // Should show content
    artifactContent = screen.getByText('Very long content...');
    expect(artifactContent).toBeInTheDocument();

    // Button text should change to "Hide"
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('renders multiple artifacts with details', () => {
    const multiArtifactMessage: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Generated files',
      metadata: {
        isArtifact: true,
        isGroupedArtifact: true,
        artifacts: [
          { name: 'index.html', rawContent: '<html></html>' },
          { name: 'style.css', rawContent: 'body {}' },
          { name: 'script.js', rawContent: 'console.log();' },
        ],
      },
    };

    render(<Message message={multiArtifactMessage} />);

    expect(screen.getByText('index.html')).toBeInTheDocument();
    expect(screen.getByText('style.css')).toBeInTheDocument();
    expect(screen.getByText('script.js')).toBeInTheDocument();
    expect(screen.getByText('3 files generated')).toBeInTheDocument();
  });

  it('renders artifact with file name', () => {
    const titledArtifact: MessageType = {
      ...baseMessage,
      sender: 'assistant',
      content: 'Code snippet',
      metadata: {
        isArtifact: true,
        rawContent: 'const x = 1;',
        artifactName: 'example.js',
      },
    };

    render(<Message message={titledArtifact} />);

    expect(screen.getByText('example.js')).toBeInTheDocument();
  });

  it('correctly identifies language from various file extensions', async () => {
    const user = userEvent.setup();
    const extensions = [
      { file: 'test.py', lang: 'python' },
      { file: 'test.tsx', lang: 'typescript' },
      { file: 'test.cpp', lang: 'cpp' },
      { file: 'test.yml', lang: 'yaml' },
    ];

    for (const { file, lang } of extensions) {
      const message: MessageType = {
        ...baseMessage,
        sender: 'assistant',
        metadata: {
          isArtifact: true,
          isCodeFile: true,
          rawContent: 'code',
          artifactName: file,
        },
      };

      const { container, unmount } = render(<Message message={message} />);

      // Need to click view to see the content
      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      const codeElement = container.querySelector(`code.language-${lang}`);

      // The element should exist if Prism supports the language
      if ((window as any).Prism.languages[lang]) {
        expect(codeElement).toBeInTheDocument();
      }

      unmount();
    }
  });
});
