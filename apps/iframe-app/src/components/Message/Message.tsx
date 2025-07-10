import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
// Core languages and dependencies
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
// C family
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
// JavaScript family
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
// Other languages
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-scss';
// Skip PHP for now as it has complex dependencies
import { useState, memo, useMemo } from 'react';
import styles from './Message.module.css';
import type { Message as MessageType } from '../../types';
import { downloadFile, getMimeType } from '../../utils/downloadUtils';

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'language-',
    highlight(code, lang) {
      if (lang && Prism.languages[lang]) {
        try {
          return Prism.highlight(code, Prism.languages[lang], lang);
        } catch (err) {
          console.error('Prism highlight error:', err);
          return code;
        }
      }
      return code;
    },
  })
);

interface MessageProps {
  message: MessageType;
  agentName?: string;
}

export const Message = memo(function Message({ message, agentName = 'Agent' }: MessageProps) {
  const isUser = message.sender === 'user';
  const senderName = isUser ? (window.LOGGED_IN_USER_NAME ?? 'You') : agentName;
  const isArtifact = message.metadata?.isArtifact;
  const isGroupedArtifact = message.metadata?.isGroupedArtifact;
  const artifactName = message.metadata?.artifactName;
  const isStreaming = message.metadata?.isStreaming;
  const [showContent, setShowContent] = useState(!isArtifact && !isGroupedArtifact);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState<number | null>(null);

  const handleDownload = (index?: number) => {
    if (isArtifact && artifactName) {
      const mimeType = getMimeType(artifactName);
      // If we have raw content, use it. Otherwise, extract from the formatted content
      let contentToDownload = message.metadata?.rawContent;

      if (!contentToDownload) {
        // Try to extract content from markdown code block
        const codeBlockMatch = message.content.match(/```[\w]*\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
          contentToDownload = codeBlockMatch[1];
        } else {
          // Remove the filename header if present
          contentToDownload = message.content.replace(/^\*\*.*?\*\*\n\n/, '');
        }
      }

      downloadFile(contentToDownload, artifactName, mimeType);
    } else if (isGroupedArtifact && typeof index === 'number') {
      const artifact = message.metadata?.artifacts?.[index];
      if (artifact) {
        const mimeType = getMimeType(artifact.name);
        downloadFile(artifact.rawContent, artifact.name, mimeType);
      }
    }
  };

  const handleDownloadAll = () => {
    if (isGroupedArtifact && message.metadata?.artifacts) {
      message.metadata.artifacts.forEach(
        (artifact: { name: string; rawContent: string }, index: number) => {
          setTimeout(() => {
            const mimeType = getMimeType(artifact.name);
            downloadFile(artifact.rawContent, artifact.name, mimeType);
          }, index * 100); // Small delay between downloads
        }
      );
    }
  };

  const toggleContent = () => {
    setShowContent(!showContent);
  };

  const renderContent = useMemo(() => {
    if (isUser) {
      return <div className={styles.textContent}>{message.content}</div>;
    }

    // For artifacts with raw content, render it directly in a pre tag
    if (isArtifact && message.metadata?.rawContent) {
      const language = getLanguageFromFilename(artifactName || '');
      if (message.metadata?.isCodeFile && language && Prism.languages[language]) {
        try {
          const highlighted = Prism.highlight(
            message.metadata.rawContent,
            Prism.languages[language],
            language
          );
          return (
            <pre className={styles.codeBlock}>
              <code
                className={`language-${language}`}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          );
        } catch (err) {
          console.error('Prism highlight error:', err);
        }
      }
      // Fallback for non-highlighted code or non-code files
      return (
        <pre className={styles.codeBlock}>
          <code>{message.metadata.rawContent}</code>
        </pre>
      );
    }

    // Parse markdown for assistant messages
    const html = marked.parse(message.content, {
      gfm: true,
      breaks: true,
    }) as string;

    return (
      <div
        className={`${styles.markdownContent} ${isArtifact ? styles.artifactContent : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }, [message.content, isUser, isArtifact, artifactName, message.metadata]);

  // Helper function to get language from filename
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      ps1: 'powershell',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      md: 'markdown',
    };
    return languageMap[ext || ''] || '';
  };

  return (
    <div
      className={`${styles.messageWrapper} ${isUser ? styles.user : styles.assistant} ${isArtifact ? styles.artifact : ''} ${isStreaming ? styles.streaming : ''} ${!isStreaming && !isUser ? 'chat-fade-in' : ''}`}
    >
      <div className={styles.messageContainer}>
        <div className={styles.senderName}>{senderName}</div>
        <div className={styles.messageBubble}>
          <div className={`${styles.message} ${isStreaming ? styles.streaming : ''}`}>
            {isGroupedArtifact && message.metadata?.artifacts ? (
              <div className={styles.groupedArtifactContainer}>
                <div className={styles.groupedHeader}>
                  <div className={styles.groupedInfo}>
                    <svg
                      className={styles.folderIcon}
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H12L10 5H5C3.89543 5 3 5.89543 3 7Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={styles.groupedTitle}>
                      {message.metadata.artifacts.length} files generated
                    </span>
                  </div>
                  <button
                    className={styles.primaryButton}
                    onClick={handleDownloadAll}
                    title="Download all files"
                    aria-label="Download all files"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 12L3 7L4.4 5.6L7 8.2V0H9V8.2L11.6 5.6L13 7L8 12Z"
                        fill="currentColor"
                      />
                      <path d="M0 14V16H16V14H0Z" fill="currentColor" />
                    </svg>
                    Download All
                  </button>
                </div>
                <div className={styles.artifactList}>
                  {message.metadata.artifacts.map(
                    (
                      artifact: { name: string; rawContent: string; isCodeFile?: boolean },
                      index: number
                    ) => (
                      <div key={index} className={styles.artifactItem}>
                        <div className={styles.artifactItemInfo}>
                          <svg
                            className={styles.fileIcon}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 2C4 1.44772 4.44772 1 5 1H11.5858C11.851 1 12.1054 1.10536 12.2929 1.29289L16.7071 5.70711C16.8946 5.89464 17 6.149 17 6.41421V18C17 18.5523 16.5523 19 16 19H5C4.44772 19 4 18.5523 4 18V2Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M11 1V6C11 6.55228 11.4477 7 12 7H17"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                          <span className={styles.artifactItemName}>{artifact.name}</span>
                        </div>
                        <div className={styles.artifactItemActions}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleDownload(index)}
                            title={`Download ${artifact.name}`}
                            aria-label={`Download ${artifact.name}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M8 12L3 7L4.4 5.6L7 8.2V0H9V8.2L11.6 5.6L13 7L8 12Z"
                                fill="currentColor"
                              />
                              <path d="M0 14V16H16V14H0Z" fill="currentColor" />
                            </svg>
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() =>
                              setSelectedArtifactIndex(
                                selectedArtifactIndex === index ? null : index
                              )
                            }
                            title={
                              selectedArtifactIndex === index ? 'Hide content' : 'View content'
                            }
                            aria-label={
                              selectedArtifactIndex === index ? 'Hide content' : 'View content'
                            }
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              {selectedArtifactIndex === index ? (
                                <path
                                  d="M13.98 8.5C13.82 8.82 13.66 9.11 13.47 9.4C12.55 10.84 10.56 12.5 8 12.5C5.44 12.5 3.45 10.84 2.53 9.4C2.34 9.11 2.18 8.82 2.02 8.5C1.98 8.41 1.94 8.32 1.9 8.22C1.89 8.19 1.88 8.16 1.87 8.13C1.86 8.09 1.86 8.06 1.86 8.02C1.86 8.01 1.86 8.01 1.86 8C1.86 7.99 1.86 7.99 1.86 7.98C1.86 7.94 1.86 7.91 1.87 7.87C1.88 7.84 1.89 7.81 1.9 7.78C1.94 7.68 1.98 7.59 2.02 7.5C2.18 7.18 2.34 6.89 2.53 6.6C3.45 5.16 5.44 3.5 8 3.5C10.56 3.5 12.55 5.16 13.47 6.6C13.66 6.89 13.82 7.18 13.98 7.5C14.02 7.59 14.06 7.68 14.1 7.78C14.11 7.81 14.12 7.84 14.13 7.87C14.14 7.91 14.14 7.94 14.14 7.98C14.14 7.99 14.14 7.99 14.14 8C14.14 8.01 14.14 8.01 14.14 8.02C14.14 8.06 14.14 8.09 14.13 8.13C14.12 8.16 14.11 8.19 14.1 8.22C14.06 8.32 14.02 8.41 13.98 8.5ZM8 10.5C9.38 10.5 10.5 9.38 10.5 8C10.5 6.62 9.38 5.5 8 5.5C6.62 5.5 5.5 6.62 5.5 8C5.5 9.38 6.62 10.5 8 10.5Z"
                                  fill="currentColor"
                                />
                              ) : (
                                <>
                                  <path
                                    d="M2.21 2.21C2.52 1.9 3.02 1.9 3.33 2.21L13.79 12.67C14.1 12.98 14.1 13.48 13.79 13.79C13.48 14.1 12.98 14.1 12.67 13.79L2.21 3.33C1.9 3.02 1.9 2.52 2.21 2.21Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M6.22 6.22C6.7 5.74 7.33 5.5 8 5.5C9.38 5.5 10.5 6.62 10.5 8C10.5 8.67 10.26 9.3 9.78 9.78L8.69 8.69C8.88 8.5 9 8.26 9 8C9 7.45 8.55 7 8 7C7.74 7 7.5 7.12 7.31 7.31L6.22 6.22Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M12.07 11.01L10.55 9.49C10.83 8.98 11 8.49 11 8C11 6.34 9.66 5 8 5C7.51 5 7.02 5.17 6.51 5.45L4.98 3.92C5.91 3.51 6.93 3.5 8 3.5C10.56 3.5 12.55 5.16 13.47 6.6C13.66 6.89 13.82 7.18 13.98 7.5C14.02 7.59 14.06 7.68 14.1 7.78C14.11 7.81 14.12 7.84 14.13 7.87C14.14 7.91 14.14 7.94 14.14 7.98C14.14 7.99 14.14 7.99 14.14 8C14.14 8.01 14.14 8.01 14.14 8.02C14.14 8.06 14.14 8.09 14.13 8.13C14.12 8.16 14.11 8.19 14.1 8.22C14.06 8.32 14.02 8.41 13.98 8.5C13.82 8.82 13.66 9.11 13.47 9.4C13.03 10.09 12.55 10.67 12.07 11.01Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M5 8C5 7.61 5.1 7.24 5.28 6.92L3.93 5.57C3.45 6.23 2.97 6.81 2.53 6.6C2.34 6.89 2.18 7.18 2.02 7.5C1.98 7.59 1.94 7.68 1.9 7.78C1.89 7.81 1.88 7.84 1.87 7.87C1.86 7.91 1.86 7.94 1.86 7.98C1.86 7.99 1.86 7.99 1.86 8C1.86 8.01 1.86 8.01 1.86 8.02C1.86 8.06 1.86 8.09 1.87 8.13C1.88 8.16 1.89 8.19 1.9 8.22C1.94 8.32 1.98 8.41 2.02 8.5C2.18 8.82 2.34 9.11 2.53 9.4C3.45 10.84 5.44 12.5 8 12.5C9.07 12.5 10.09 12.01 11.02 11.58L9.08 9.64C8.76 9.9 8.39 10 8 10C6.62 10 5.5 8.88 5.5 7.5C5.5 7.11 5.6 6.74 5.86 6.42L5 8Z"
                                    fill="currentColor"
                                  />
                                </>
                              )}
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {selectedArtifactIndex !== null &&
                  message.metadata.artifacts[selectedArtifactIndex] && (
                    <div className={styles.artifactContentWrapper}>
                      {(() => {
                        const artifact = message.metadata.artifacts[selectedArtifactIndex];
                        const language = getLanguageFromFilename(artifact.name);
                        if (artifact.isCodeFile && language && Prism.languages[language]) {
                          try {
                            const highlighted = Prism.highlight(
                              artifact.rawContent,
                              Prism.languages[language],
                              language
                            );
                            return (
                              <pre className={styles.codeBlock}>
                                <code
                                  className={`language-${language}`}
                                  dangerouslySetInnerHTML={{ __html: highlighted }}
                                />
                              </pre>
                            );
                          } catch (err) {
                            console.error('Prism highlight error:', err);
                          }
                        }
                        return (
                          <pre className={styles.codeBlock}>
                            <code>{artifact.rawContent}</code>
                          </pre>
                        );
                      })()}
                    </div>
                  )}
              </div>
            ) : isArtifact && artifactName ? (
              <div className={styles.artifactContainer}>
                <div className={styles.artifactHeader}>
                  <div className={styles.artifactInfo}>
                    <svg
                      className={styles.fileIcon}
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 2C4 1.44772 4.44772 1 5 1H11.5858C11.851 1 12.1054 1.10536 12.2929 1.29289L16.7071 5.70711C16.8946 5.89464 17 6.149 17 6.41421V18C17 18.5523 16.5523 19 16 19H5C4.44772 19 4 18.5523 4 18V2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M11 1V6C11 6.55228 11.4477 7 12 7H17"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className={styles.artifactName}>{artifactName}</span>
                  </div>
                  <div className={styles.artifactActions}>
                    <button
                      className={styles.primaryButton}
                      onClick={() => handleDownload()}
                      title={`Download ${artifactName}`}
                      aria-label={`Download ${artifactName}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 12L3 7L4.4 5.6L7 8.2V0H9V8.2L11.6 5.6L13 7L8 12Z"
                          fill="currentColor"
                        />
                        <path d="M0 14V16H16V14H0Z" fill="currentColor" />
                      </svg>
                      Download
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={toggleContent}
                      title={showContent ? 'Hide content' : 'Show content'}
                      aria-label={showContent ? 'Hide content' : 'Show content'}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {showContent ? (
                          <path
                            d="M13.98 8.5C13.82 8.82 13.66 9.11 13.47 9.4C12.55 10.84 10.56 12.5 8 12.5C5.44 12.5 3.45 10.84 2.53 9.4C2.34 9.11 2.18 8.82 2.02 8.5C1.98 8.41 1.94 8.32 1.9 8.22C1.89 8.19 1.88 8.16 1.87 8.13C1.86 8.09 1.86 8.06 1.86 8.02C1.86 8.01 1.86 8.01 1.86 8C1.86 7.99 1.86 7.99 1.86 7.98C1.86 7.94 1.86 7.91 1.87 7.87C1.88 7.84 1.89 7.81 1.9 7.78C1.94 7.68 1.98 7.59 2.02 7.5C2.18 7.18 2.34 6.89 2.53 6.6C3.45 5.16 5.44 3.5 8 3.5C10.56 3.5 12.55 5.16 13.47 6.6C13.66 6.89 13.82 7.18 13.98 7.5C14.02 7.59 14.06 7.68 14.1 7.78C14.11 7.81 14.12 7.84 14.13 7.87C14.14 7.91 14.14 7.94 14.14 7.98C14.14 7.99 14.14 7.99 14.14 8C14.14 8.01 14.14 8.01 14.14 8.02C14.14 8.06 14.14 8.09 14.13 8.13C14.12 8.16 14.11 8.19 14.1 8.22C14.06 8.32 14.02 8.41 13.98 8.5ZM8 10.5C9.38 10.5 10.5 9.38 10.5 8C10.5 6.62 9.38 5.5 8 5.5C6.62 5.5 5.5 6.62 5.5 8C5.5 9.38 6.62 10.5 8 10.5Z"
                            fill="currentColor"
                          />
                        ) : (
                          <>
                            <path
                              d="M2.21 2.21C2.52 1.9 3.02 1.9 3.33 2.21L13.79 12.67C14.1 12.98 14.1 13.48 13.79 13.79C13.48 14.1 12.98 14.1 12.67 13.79L2.21 3.33C1.9 3.02 1.9 2.52 2.21 2.21Z"
                              fill="currentColor"
                            />
                            <path
                              d="M6.22 6.22C6.7 5.74 7.33 5.5 8 5.5C9.38 5.5 10.5 6.62 10.5 8C10.5 8.67 10.26 9.3 9.78 9.78L8.69 8.69C8.88 8.5 9 8.26 9 8C9 7.45 8.55 7 8 7C7.74 7 7.5 7.12 7.31 7.31L6.22 6.22Z"
                              fill="currentColor"
                            />
                            <path
                              d="M12.07 11.01L10.55 9.49C10.83 8.98 11 8.49 11 8C11 6.34 9.66 5 8 5C7.51 5 7.02 5.17 6.51 5.45L4.98 3.92C5.91 3.51 6.93 3.5 8 3.5C10.56 3.5 12.55 5.16 13.47 6.6C13.66 6.89 13.82 7.18 13.98 7.5C14.02 7.59 14.06 7.68 14.1 7.78C14.11 7.81 14.12 7.84 14.13 7.87C14.14 7.91 14.14 7.94 14.14 7.98C14.14 7.99 14.14 7.99 14.14 8C14.14 8.01 14.14 8.01 14.14 8.02C14.14 8.06 14.14 8.09 14.13 8.13C14.12 8.16 14.11 8.19 14.1 8.22C14.06 8.32 14.02 8.41 13.98 8.5C13.82 8.82 13.66 9.11 13.47 9.4C13.03 10.09 12.55 10.67 12.07 11.01Z"
                              fill="currentColor"
                            />
                            <path
                              d="M5 8C5 7.61 5.1 7.24 5.28 6.92L3.93 5.57C3.45 6.23 2.97 6.81 2.53 6.6C2.34 6.89 2.18 7.18 2.02 7.5C1.98 7.59 1.94 7.68 1.9 7.78C1.89 7.81 1.88 7.84 1.87 7.87C1.86 7.91 1.86 7.94 1.86 7.98C1.86 7.99 1.86 7.99 1.86 8C1.86 8.01 1.86 8.01 1.86 8.02C1.86 8.06 1.86 8.09 1.87 8.13C1.88 8.16 1.89 8.19 1.9 8.22C1.94 8.32 1.98 8.41 2.02 8.5C2.18 8.82 2.34 9.11 2.53 9.4C3.45 10.84 5.44 12.5 8 12.5C9.07 12.5 10.09 12.01 11.02 11.58L9.08 9.64C8.76 9.9 8.39 10 8 10C6.62 10 5.5 8.88 5.5 7.5C5.5 7.11 5.6 6.74 5.86 6.42L5 8Z"
                              fill="currentColor"
                            />
                          </>
                        )}
                      </svg>
                      {showContent ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
                {showContent && (
                  <div className={styles.artifactContentWrapper}>{renderContent}</div>
                )}
              </div>
            ) : (
              renderContent
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className={styles.attachments}>
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.attachment}>
                    <span className={styles.attachmentName}>{attachment.name}</span>
                    <span className={styles.attachmentSize}>
                      ({formatFileSize(attachment.size)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isUser && <div className={styles.messageTail} />}
        </div>
        <div className={styles.metadata}>
          <span className={styles.time}>{formatTime(message.timestamp)}</span>
          {message.status === 'error' && <span className={styles.error}>Failed to send</span>}
        </div>
      </div>
    </div>
  );
});

function formatTime(date: Date | string): string {
  // Handle both Date objects and date strings (from localStorage)
  const dateObject = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(dateObject.getTime())) {
    return 'Invalid time';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObject);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
