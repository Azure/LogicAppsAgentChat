import { useEffect, useRef, memo } from 'react';
import { Message } from '../Message';
import { TypingIndicator } from '../TypingIndicator';
import { useChatStore } from '../../store/chatStore';
import styles from './MessageList.module.css';

interface MessageListProps {
  welcomeMessage?: string;
  agentName?: string;
}

export const MessageList = memo(function MessageList({
  welcomeMessage,
  agentName = 'Agent',
}: MessageListProps) {
  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
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
        <Message key={message.id} message={message} agentName={agentName} />
      ))}

      {isTyping && <TypingIndicator agentName={agentName} />}
    </div>
  );
});
