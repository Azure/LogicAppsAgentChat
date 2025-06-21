/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Message } from '.';
import type { Message as MessageType } from '../../types';
import styles from './Message.module.css';
import * as downloadUtils from '../../utils/downloadUtils';

// Mock downloadUtils
vi.mock('../../utils/downloadUtils', () => ({
  downloadFile: vi.fn(),
  getMimeType: vi.fn((_filename: string) => 'text/plain'),
}));

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

// Mock Prism
vi.mock('prismjs', () => ({
  default: {
    languages: {
      javascript: {},
      typescript: {},
      python: {},
      csharp: {},
    },
    highlight: vi.fn((code: string) => `<span class="highlighted">${code}</span>`),
  },
}));

// Mock Prism imports
vi.mock('prismjs/themes/prism.css', () => ({}));
vi.mock('prismjs/components/prism-clike', () => ({}));
vi.mock('prismjs/components/prism-javascript', () => ({}));
vi.mock('prismjs/components/prism-typescript', () => ({}));
vi.mock('prismjs/components/prism-python', () => ({}));
vi.mock('prismjs/components/prism-csharp', () => ({}));

// Mock all other Prism component imports
vi.mock('prismjs/components/prism-markup', () => ({}));
vi.mock('prismjs/components/prism-css', () => ({}));
vi.mock('prismjs/components/prism-c', () => ({}));
vi.mock('prismjs/components/prism-cpp', () => ({}));
vi.mock('prismjs/components/prism-java', () => ({}));
vi.mock('prismjs/components/prism-jsx', () => ({}));
vi.mock('prismjs/components/prism-tsx', () => ({}));
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
global.Intl.DateTimeFormat = vi.fn(() => ({
  format: vi.fn(() => '2:30 PM'),
  resolvedOptions: vi.fn(),
  formatToParts: vi.fn(),
  formatRange: vi.fn(),
  formatRangeToParts: vi.fn(),
})) as any;

describe('Message - Artifact Features', () => {
  const baseMessage: MessageType = {
    id: '1',
    content: 'Test message',
    sender: 'assistant',
    timestamp: new Date('2024-01-01T14:30:00'),
    status: 'sent',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Artifact Messages', () => {
    it('renders artifact message with file header', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        content: '**Program.cs**\n\n```csharp\npublic class Program {}\n```',
        metadata: {
          isArtifact: true,
          artifactName: 'Program.cs',
          rawContent: 'public class Program {}',
          isCodeFile: true,
        },
      };

      render(<Message message={artifactMessage} />);

      expect(screen.getByText('Program.cs')).toBeInTheDocument();
    });

    it('shows download button for artifacts', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'script.js',
          rawContent: 'console.log("test");',
          isCodeFile: true,
        },
      };

      render(<Message message={artifactMessage} />);

      const downloadButton = screen.getByRole('button', { name: /download script\.js/i });
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).toHaveClass(styles.primaryButton);
    });

    it('shows view button for artifacts', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'test.py',
          rawContent: 'print("test")',
          isCodeFile: true,
        },
      };

      render(<Message message={artifactMessage} />);

      const viewButton = screen.getByRole('button', { name: /Show content/i });
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveClass(styles.secondaryButton);
    });

    it('hides content by default for artifacts', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        content: '**test.js**\n\n```javascript\nconst x = 1;\n```',
        metadata: {
          isArtifact: true,
          artifactName: 'test.js',
          rawContent: 'const x = 1;',
          isCodeFile: true,
        },
      };

      const { container } = render(<Message message={artifactMessage} />);

      const codeBlock = container.querySelector('pre');
      expect(codeBlock).not.toBeInTheDocument();
    });

    it('toggles content visibility when view button clicked', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'test.py',
          rawContent: 'print("hello")',
          isCodeFile: true,
        },
      };

      const { container } = render(<Message message={artifactMessage} />);

      const viewButton = screen.getByRole('button', { name: /Show content/i });
      
      // Content should be hidden initially
      expect(container.querySelector('pre')).not.toBeInTheDocument();

      // Click to show content
      fireEvent.click(viewButton);
      expect(container.querySelector('pre')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide content/i })).toBeInTheDocument();

      // Click to hide content
      fireEvent.click(viewButton);
      expect(container.querySelector('pre')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show content/i })).toBeInTheDocument();
    });

    it('downloads file with raw content when available', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'data.json',
          rawContent: '{"key": "value"}',
          isCodeFile: true,
        },
      };

      render(<Message message={artifactMessage} />);

      const downloadButton = screen.getByRole('button', { name: /download data\.json/i });
      fireEvent.click(downloadButton);

      expect(downloadUtils.getMimeType).toHaveBeenCalledWith('data.json');
      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        '{"key": "value"}',
        'data.json',
        'text/plain'
      );
    });

    it('extracts content from markdown when raw content not available', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        content: '**script.js**\n\n```javascript\nconst test = true;\n```',
        metadata: {
          isArtifact: true,
          artifactName: 'script.js',
        },
      };

      render(<Message message={artifactMessage} />);

      const downloadButton = screen.getByRole('button', { name: /download script\.js/i });
      fireEvent.click(downloadButton);

      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        'const test = true;',
        'script.js',
        'text/plain'
      );
    });

    it('applies syntax highlighting for code files', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'app.js',
          rawContent: 'const app = {};',
          isCodeFile: true,
        },
      };

      const { container } = render(<Message message={artifactMessage} />);

      // Show content
      const viewButton = screen.getByRole('button', { name: /Show content/i });
      fireEvent.click(viewButton);

      const codeElement = container.querySelector('code.language-javascript');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.innerHTML).toContain('highlighted');
    });

    it('renders non-code artifacts without syntax highlighting', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'readme.txt',
          rawContent: 'This is plain text',
          isCodeFile: false,
        },
      };

      const { container } = render(<Message message={artifactMessage} />);

      // Show content
      const viewButton = screen.getByRole('button', { name: /Show content/i });
      fireEvent.click(viewButton);

      const codeBlock = container.querySelector('pre');
      expect(codeBlock).toBeInTheDocument();
      const codeElement = codeBlock?.querySelector('code');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.textContent).toBe('This is plain text');
      expect(codeElement?.className || '').not.toContain('language-');
    });
  });

  describe('Grouped Artifact Messages', () => {
    const groupedArtifactMessage: MessageType = {
      ...baseMessage,
      content: '**3 files generated**\n\n• index.html\n• style.css\n• script.js',
      metadata: {
        isGroupedArtifact: true,
        artifacts: [
          { name: 'index.html', rawContent: '<html></html>', isCodeFile: true },
          { name: 'style.css', rawContent: 'body { margin: 0; }', isCodeFile: true },
          { name: 'script.js', rawContent: 'console.log("test");', isCodeFile: true },
        ],
      },
    };

    it('renders grouped artifact header with file count', () => {
      render(<Message message={groupedArtifactMessage} />);

      expect(screen.getByText('3 files generated')).toBeInTheDocument();
    });

    it('shows download all button', () => {
      render(<Message message={groupedArtifactMessage} />);

      const downloadAllButton = screen.getByRole('button', { name: /download all/i });
      expect(downloadAllButton).toBeInTheDocument();
      expect(downloadAllButton).toHaveClass(styles.primaryButton);
    });

    it('renders list of all files', () => {
      render(<Message message={groupedArtifactMessage} />);

      expect(screen.getByText('index.html')).toBeInTheDocument();
      expect(screen.getByText('style.css')).toBeInTheDocument();
      expect(screen.getByText('script.js')).toBeInTheDocument();
    });

    it('renders individual download buttons for each file', () => {
      render(<Message message={groupedArtifactMessage} />);

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      // 1 for "Download All" + 3 for individual files
      expect(downloadButtons).toHaveLength(4);
    });

    it('renders individual view buttons for each file', () => {
      render(<Message message={groupedArtifactMessage} />);

      const viewButtons = screen.getAllByRole('button', { name: 'View content' });
      expect(viewButtons).toHaveLength(3);
    });

    it('downloads all files when download all clicked', async () => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      
      render(<Message message={groupedArtifactMessage} />);

      const downloadAllButton = screen.getByRole('button', { name: /download all/i });
      fireEvent.click(downloadAllButton);

      // Wait a tick for the event handler
      await vi.waitFor(() => {
        expect(downloadUtils.downloadFile).toHaveBeenCalled();
      });
      
      // First file should download immediately
      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        '<html></html>',
        'index.html',
        'text/plain'
      );

      // Advance timers for subsequent files
      vi.advanceTimersByTime(100);
      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        'body { margin: 0; }',
        'style.css',
        'text/plain'
      );

      vi.advanceTimersByTime(100);
      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        'console.log("test");',
        'script.js',
        'text/plain'
      );

      expect(downloadUtils.downloadFile).toHaveBeenCalledTimes(3);
      
      vi.useRealTimers();
    });

    it('downloads individual file when its download button clicked', () => {
      render(<Message message={groupedArtifactMessage} />);

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      // Find the style.css download button (should be at index 2 - after Download All and index.html)
      const styleDownloadButton = downloadButtons[2];
      fireEvent.click(styleDownloadButton);

      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        'body { margin: 0; }',
        'style.css',
        'text/plain'
      );
      expect(downloadUtils.downloadFile).toHaveBeenCalledTimes(1);
    });

    it('shows content for individual file when view clicked', () => {
      const { container } = render(<Message message={groupedArtifactMessage} />);

      // Get the third view button (for script.js)
      const viewButtons = screen.getAllByRole('button', { name: 'View content' });
      const scriptViewButton = viewButtons[2];
      
      // Content should be hidden initially
      expect(container.querySelector('pre')).not.toBeInTheDocument();

      // Click to show content
      fireEvent.click(scriptViewButton);
      
      const codeBlock = container.querySelector('pre');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('console.log("test");');
    });

    it('toggles between different file contents', () => {
      const { container } = render(<Message message={groupedArtifactMessage} />);

      // View first file
      const viewButtons = screen.getAllByRole('button', { name: 'View content' });
      fireEvent.click(viewButtons[0]);
      
      let codeBlock = container.querySelector('pre');
      expect(codeBlock?.textContent).toContain('<html></html>');

      // View second file
      fireEvent.click(viewButtons[1]);
      
      codeBlock = container.querySelector('pre');
      expect(codeBlock?.textContent).toContain('body { margin: 0; }');
      expect(codeBlock?.textContent).not.toContain('<html></html>');
    });

    it('hides content when clicking view on already selected file', () => {
      const { container } = render(<Message message={groupedArtifactMessage} />);

      const viewButton = screen.getAllByRole('button', { name: 'View content' })[0];
      
      // Show content
      fireEvent.click(viewButton);
      expect(container.querySelector('pre')).toBeInTheDocument();

      // Hide content
      fireEvent.click(viewButton);
      expect(container.querySelector('pre')).not.toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
      const { container } = render(<Message message={groupedArtifactMessage} />);

      expect(container.querySelector(`.${styles.groupedArtifactContainer}`)).toBeInTheDocument();
      expect(container.querySelector(`.${styles.groupedHeader}`)).toBeInTheDocument();
      expect(container.querySelector(`.${styles.artifactList}`)).toBeInTheDocument();
      expect(container.querySelector(`.${styles.folderIcon}`)).toBeInTheDocument();
    });

    it('handles empty artifacts array gracefully', () => {
      const emptyGroupedMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isGroupedArtifact: true,
          artifacts: [],
        },
      };

      render(<Message message={emptyGroupedMessage} />);

      expect(screen.getByText('0 files generated')).toBeInTheDocument();
    });

    it('applies syntax highlighting for code files in grouped view', () => {
      const { container } = render(<Message message={groupedArtifactMessage} />);

      const jsViewButton = screen.getAllByRole('button', { name: 'View content' })[2];
      fireEvent.click(jsViewButton);

      const codeElement = container.querySelector('code.language-javascript');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.innerHTML).toContain('highlighted');
    });
  });

  describe('Edge Cases', () => {
    it('handles artifact without raw content gracefully', () => {
      const artifactMessage: MessageType = {
        ...baseMessage,
        content: 'Simple content without code blocks',
        metadata: {
          isArtifact: true,
          artifactName: 'file.txt',
        },
      };

      render(<Message message={artifactMessage} />);

      const downloadButton = screen.getByRole('button', { name: /download file\.txt/i });
      fireEvent.click(downloadButton);

      expect(downloadUtils.downloadFile).toHaveBeenCalledWith(
        'Simple content without code blocks',
        'file.txt',
        'text/plain'
      );
    });

    it('handles Prism highlighting errors gracefully', async () => {
      const Prism = (await import('prismjs')).default;
      Prism.highlight = vi.fn().mockImplementation(() => {
        throw new Error('Highlighting error');
      });

      const artifactMessage: MessageType = {
        ...baseMessage,
        metadata: {
          isArtifact: true,
          artifactName: 'error.js',
          rawContent: 'const error = true;',
          isCodeFile: true,
        },
      };

      const { container } = render(<Message message={artifactMessage} />);

      const viewButton = screen.getByRole('button', { name: /Show content/i });
      fireEvent.click(viewButton);

      // Should still render the code without highlighting
      const codeBlock = container.querySelector('pre code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toBe('const error = true;');
    });

    it('shows regular messages without artifact UI', () => {
      const regularMessage: MessageType = {
        ...baseMessage,
        content: 'This is a regular message',
      };

      const { container } = render(<Message message={regularMessage} />);

      expect(container.querySelector(`.${styles.artifactContainer}`)).not.toBeInTheDocument();
      expect(container.querySelector(`.${styles.groupedArtifactContainer}`)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    });
  });
});