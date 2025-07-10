import { useEffect, useRef } from 'react';
import { Message } from '../Message';
import { TypingIndicator } from '../TypingIndicator';
import { useChatStore } from '../../store/chatStore';
import styles from './MessageList.module.css';

interface MessageListProps {
  welcomeMessage?: string;
  agentName?: string;
}

export function MessageList({ welcomeMessage, agentName = 'Agent' }: MessageListProps) {
  const { messages, isTyping } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className={`${styles.messageList} chat-scrollbar`}>
      {messages.length === 0 && welcomeMessage && (
        <div className={styles.welcomeMessage}>{welcomeMessage}</div>
      )}

      {messages.map((message) => (
        <Message
          key={`${message.id}-${message.content.length}`}
          message={message}
          agentName={agentName}
        />
      ))}

      {isTyping && <TypingIndicator agentName={agentName} />}
    </div>
  );
}
