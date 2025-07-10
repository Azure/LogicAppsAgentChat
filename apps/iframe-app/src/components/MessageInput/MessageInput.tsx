import { useState, useRef, useCallback, memo } from 'react';
import { FileUpload } from '../FileUpload';
import { useChatStore } from '../../store/chatStore';
import styles from './MessageInput.module.css';
import type { Attachment } from '../../types';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

// Memoize the component to prevent unnecessary re-renders from parent
export const MessageInput = memo(function MessageInput({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  allowFileUpload = true,
  maxFileSize,
  allowedFileTypes,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isConnected = useChatStore((state) => state.isConnected);

  const isDisabled = disabled || !isConnected;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (message.trim() || pendingAttachments.length > 0) {
        const attachments: Attachment[] = pendingAttachments.map((file) => ({
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading' as const,
        }));

        onSendMessage(message.trim(), attachments);
        setMessage('');
        setPendingAttachments([]);

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = '';
        }
      }
    },
    [message, pendingAttachments, onSendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    },
    [handleSubmit]
  );

  // Use RAF to batch DOM measurements and updates
  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Store current scroll position
      const scrollTop = textarea.scrollTop;

      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';

      // Set new height
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;

      // Restore scroll position
      textarea.scrollTop = scrollTop;
    });
  }, []);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      setMessage(textarea.value);
      adjustTextareaHeight();
    },
    [adjustTextareaHeight]
  );

  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles = Array.from(files);
    setPendingAttachments((prev) => [...prev, ...newFiles]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <form onSubmit={handleSubmit} className={styles.inputContainer}>
      {pendingAttachments.length > 0 && (
        <div className={styles.attachmentPreview}>
          {pendingAttachments.map((file, index) => (
            <div key={index} className={styles.attachmentItem}>
              <span className={styles.attachmentName}>{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className={styles.removeButton}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.inputWrapper}>
        {allowFileUpload && (
          <FileUpload
            onFileSelect={handleFileSelect}
            maxFileSize={maxFileSize}
            allowedFileTypes={allowedFileTypes}
            disabled={isDisabled}
          />
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={styles.textarea}
          rows={1}
        />

        <button
          type="submit"
          disabled={isDisabled || (!message.trim() && pendingAttachments.length === 0)}
          className={styles.sendButton}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 10L17.5 10M17.5 10L12.5 5M17.5 10L12.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {!isConnected && <div className={styles.connectionStatus}>Connecting...</div>}
    </form>
  );
});

function generateId(): string {
  // Generate a UUID v4 format GUID similar to C# Guid.NewGuid()
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, a, or b

  const hex = '0123456789abcdef';
  let guid = '';

  // Generate random bytes
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Set version (4) and variant bits
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with proper formatting
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) {
      guid += '-';
    }
    guid += hex[randomBytes[i] >> 4] + hex[randomBytes[i] & 0x0f];
  }

  return guid;
}
