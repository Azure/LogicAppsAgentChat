import styles from './TypingIndicator.module.css';

interface TypingIndicatorProps {
  agentName?: string;
}

export function TypingIndicator({ agentName = 'Agent' }: TypingIndicatorProps) {
  return (
    <div className={styles.typingIndicator}>
      <div className={styles.typingContainer}>
        <div className={styles.senderName}>{agentName}</div>
        <div className={styles.typingBubble}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    </div>
  );
}