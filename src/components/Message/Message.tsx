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
import styles from './Message.module.css';
import type { Message as MessageType } from '../../types';

// Configure marked with syntax highlighting
marked.use(markedHighlight({
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
  }
}));

interface MessageProps {
  message: MessageType;
  agentName?: string;
}

export function Message({ message, agentName = 'Agent' }: MessageProps) {
  const isUser = message.sender === 'user';
  const senderName = isUser ? 'You' : agentName;
  const isArtifact = message.metadata?.isArtifact;
  
  const renderContent = () => {
    if (isUser) {
      return <div className={styles.textContent}>{message.content}</div>;
    }
    
    // Parse markdown for assistant messages
    const html = marked.parse(message.content, { 
      gfm: true,
      breaks: true,
    }) as string;
    
    // Debug removed - syntax highlighting should work now
    
    return (
      <div 
        className={`${styles.markdownContent} ${isArtifact ? styles.artifactContent : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };
  
  return (
    <div className={`${styles.messageWrapper} ${isUser ? styles.user : styles.assistant} ${isArtifact ? styles.artifact : ''} chat-fade-in`}>
      <div className={styles.messageContainer}>
        <div className={styles.senderName}>{senderName}</div>
        <div className={styles.messageBubble}>
          <div className={styles.message}>
            {renderContent()}
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
          <span className={styles.time}>
            {formatTime(message.timestamp)}
          </span>
          {message.status === 'error' && (
            <span className={styles.error}>Failed to send</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}