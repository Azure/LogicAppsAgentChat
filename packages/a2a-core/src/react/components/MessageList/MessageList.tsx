import React, { useEffect, useRef } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Message } from '../Message';
import { TypingIndicator } from '../TypingIndicator';
import { useChatStore } from '../../store/chatStore';

const useStyles = makeStyles({
  messageList: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    height: '100%',
  },
  welcomeMessage: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.6',
  },
});

interface MessageListProps {
  welcomeMessage?: string;
  agentName?: string;
  userName?: string;
  onAuthCompleted?: () => void;
}

export function MessageList({
  welcomeMessage,
  agentName = 'Agent',
  userName = 'You',
  onAuthCompleted,
}: MessageListProps) {
  const styles = useStyles();
  const { messages, isTyping } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);
  const lastMessageContent = useRef<string>('');

  // Check if user has scrolled up
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If user is within 100px of bottom, enable auto-scroll
      isAutoScrolling.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to bottom when messages update (including streaming)
  useEffect(() => {
    if (scrollRef.current && isAutoScrolling.current) {
      // Get the last message content if any
      const currentLastContent = messages.length > 0 ? messages[messages.length - 1].content : '';

      // Check if content has changed (either new message or streaming update)
      const contentChanged = currentLastContent !== lastMessageContent.current;
      lastMessageContent.current = currentLastContent;

      if (contentChanged || isTyping) {
        // Use requestAnimationFrame for smoother scrolling during streaming
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className={styles.messageList}>
      {messages.length === 0 && welcomeMessage && (
        <div className={styles.welcomeMessage}>{welcomeMessage}</div>
      )}

      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          agentName={agentName}
          userName={userName}
          onAuthCompleted={onAuthCompleted}
        />
      ))}

      {isTyping && <TypingIndicator agentName={agentName} />}
    </div>
  );
}
