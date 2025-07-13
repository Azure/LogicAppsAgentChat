import React, { memo, useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  Button,
  Text,
  Caption1,
  tokens,
  makeStyles,
  shorthands,
  mergeClasses,
  Tooltip,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  ArrowDownloadRegular,
  EyeRegular,
  EyeOffRegular,
  FolderRegular,
  DocumentMultipleRegular,
} from '@fluentui/react-icons';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
// Import all Prism language components
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
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

const useStyles = makeStyles({
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: tokens.spacingVerticalL,
    animationName: 'fadeIn',
    animationDuration: tokens.durationSlow,
    animationFillMode: 'both',
    '@keyframes fadeIn': {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageContainer: {
    maxWidth: '70%',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  senderName: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  messageBubble: {
    position: 'relative',
  },
  userBubble: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
  assistantBubble: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    boxShadow: tokens.shadow2,
  },
  messageTail: {
    position: 'absolute',
    top: '16px',
    left: '-6px',
    width: '0px',
    height: '0px',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('8px', '8px', '8px', '0px'),
    ...shorthands.borderColor(
      'transparent',
      tokens.colorNeutralBackground1,
      'transparent',
      'transparent'
    ),
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-8px',
      left: '-1px',
      width: '0px',
      height: '0px',
      ...shorthands.borderStyle('solid'),
      ...shorthands.borderWidth('8px', '8px', '8px', '0px'),
      ...shorthands.borderColor(
        'transparent',
        tokens.colorNeutralStroke1,
        'transparent',
        'transparent'
      ),
    },
  },
  metadata: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
  },
  time: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase100,
  },
  textContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  markdownContent: {
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    '& p': {
      marginTop: tokens.spacingVerticalS,
      marginBottom: tokens.spacingVerticalS,
      fontSize: tokens.fontSizeBase300,
      lineHeight: tokens.lineHeightBase300,
    },
    '& ul, & ol': {
      paddingLeft: tokens.spacingHorizontalXL,
      marginTop: tokens.spacingVerticalS,
      marginBottom: tokens.spacingVerticalS,
    },
    '& code': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.padding('2px', '4px'),
      ...shorthands.borderRadius(tokens.borderRadiusSmall),
      fontSize: '0.9em',
      fontFamily: 'monospace',
    },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
      overflowX: 'auto',
      marginTop: tokens.spacingVerticalM,
      marginBottom: tokens.spacingVerticalM,
    },
    '& pre code': {
      backgroundColor: 'transparent',
      ...shorthands.padding(0),
      fontSize: tokens.fontSizeBase300,
    },
    '& blockquote': {
      ...shorthands.borderLeft('4px', 'solid', tokens.colorNeutralStroke1),
      ...shorthands.padding(0, 0, 0, tokens.spacingHorizontalL),
      marginLeft: 0,
      marginRight: 0,
      color: tokens.colorNeutralForeground3,
    },
  },
  artifactCard: {
    marginTop: tokens.spacingVerticalM,
  },
  artifactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artifactInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  artifactActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  artifactContent: {
    marginTop: tokens.spacingVerticalM,
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase300,
  },
  groupedArtifactContainer: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM),
  },
  groupedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalM,
  },
  artifactList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  artifactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  attachments: {
    marginTop: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  attachment: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

interface MessageProps {
  message: MessageType;
  agentName?: string;
  userName?: string;
}

function MessageComponent({ message, agentName = 'Agent', userName = 'You' }: MessageProps) {
  const styles = useStyles();
  const isUser = message.sender === 'user';
  const senderName = isUser ? userName : agentName;
  const isArtifact = message.metadata?.isArtifact;
  const isGroupedArtifact = message.metadata?.isGroupedArtifact;
  const artifactName = message.metadata?.artifactName;
  const [showContent, setShowContent] = useState(!isArtifact && !isGroupedArtifact);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState<number | null>(null);

  const handleDownload = (index?: number) => {
    if (isArtifact && artifactName) {
      const mimeType = getMimeType(artifactName);
      let contentToDownload = message.metadata?.rawContent;

      if (!contentToDownload) {
        const codeBlockMatch = message.content.match(/```[\w]*\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
          contentToDownload = codeBlockMatch[1];
        } else {
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

  const renderContent = () => {
    if (isUser) {
      return <div className={styles.textContent}>{message.content}</div>;
    }

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
      return (
        <pre className={styles.codeBlock}>
          <code>{message.metadata.rawContent}</code>
        </pre>
      );
    }

    const html = useMemo(
      () =>
        marked.parse(message.content, {
          gfm: true,
          breaks: true,
        }) as string,
      [message.content]
    );

    return <div className={styles.markdownContent} dangerouslySetInnerHTML={{ __html: html }} />;
  };

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
      className={mergeClasses(
        styles.messageWrapper,
        isUser ? styles.userMessage : styles.assistantMessage
      )}
    >
      <div className={styles.messageContainer}>
        <Text className={styles.senderName}>{senderName}</Text>
        <div className={styles.messageBubble}>
          <div className={isUser ? styles.userBubble : styles.assistantBubble}>
            {isGroupedArtifact && message.metadata?.artifacts ? (
              <div className={styles.groupedArtifactContainer}>
                <div className={styles.groupedHeader}>
                  <div className={styles.artifactInfo}>
                    <FolderRegular />
                    <Text weight="semibold">
                      {message.metadata.artifacts.length} files generated
                    </Text>
                  </div>
                  <Button
                    appearance="primary"
                    icon={<ArrowDownloadRegular />}
                    onClick={handleDownloadAll}
                  >
                    Download All
                  </Button>
                </div>
                <div className={styles.artifactList}>
                  {message.metadata.artifacts.map(
                    (
                      artifact: { name: string; rawContent: string; isCodeFile?: boolean },
                      index: number
                    ) => (
                      <div key={index} className={styles.artifactItem}>
                        <div className={styles.artifactInfo}>
                          <DocumentRegular />
                          <Text>{artifact.name}</Text>
                        </div>
                        <div className={styles.artifactActions}>
                          <Tooltip content={`Download ${artifact.name}`} relationship="label">
                            <Button
                              appearance="subtle"
                              icon={<ArrowDownloadRegular />}
                              onClick={() => handleDownload(index)}
                            />
                          </Tooltip>
                          <Tooltip
                            content={
                              selectedArtifactIndex === index ? 'Hide content' : 'View content'
                            }
                            relationship="label"
                          >
                            <Button
                              appearance="subtle"
                              icon={
                                selectedArtifactIndex === index ? <EyeOffRegular /> : <EyeRegular />
                              }
                              onClick={() =>
                                setSelectedArtifactIndex(
                                  selectedArtifactIndex === index ? null : index
                                )
                              }
                            />
                          </Tooltip>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {selectedArtifactIndex !== null &&
                  message.metadata.artifacts[selectedArtifactIndex] && (
                    <div className={styles.artifactContent}>
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
              <Card className={styles.artifactCard}>
                <CardHeader
                  image={<DocumentRegular />}
                  header={<Text weight="semibold">{artifactName}</Text>}
                  action={
                    <div className={styles.artifactActions}>
                      <Button
                        appearance="primary"
                        size="small"
                        icon={<ArrowDownloadRegular />}
                        onClick={() => handleDownload()}
                      >
                        Download
                      </Button>
                      <Button
                        appearance="secondary"
                        size="small"
                        icon={showContent ? <EyeOffRegular /> : <EyeRegular />}
                        onClick={toggleContent}
                      >
                        {showContent ? 'Hide' : 'View'}
                      </Button>
                    </div>
                  }
                />
                {showContent && <div className={styles.artifactContent}>{renderContent()}</div>}
              </Card>
            ) : (
              renderContent()
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className={styles.attachments}>
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.attachment}>
                    <DocumentMultipleRegular fontSize={16} />
                    <Caption1>{attachment.name}</Caption1>
                    <Caption1>({formatFileSize(attachment.size)})</Caption1>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isUser && <div className={styles.messageTail} />}
        </div>
        <div className={styles.metadata}>
          <Caption1 className={styles.time}>{formatTime(message.timestamp)}</Caption1>
          {message.status === 'error' && (
            <Caption1 className={styles.error}>Failed to send</Caption1>
          )}
        </div>
      </div>
    </div>
  );
}

export const Message = memo(MessageComponent);

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
