import React, { useState, useRef } from 'react';
import {
  Button,
  Textarea,
  Caption1,
  tokens,
  makeStyles,
  shorthands,
  Badge,
} from '@fluentui/react-components';
import { SendRegular, AttachRegular, DismissRegular } from '@fluentui/react-icons';
import { useChatStore } from '../../store/chatStore';
import { generateMessageId } from '../../utils/messageUtils';
import type { Attachment } from '../../types';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  attachmentPreview: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  attachmentItem: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
  },
  removeButton: {
    minWidth: 'auto',
    padding: '2px',
    height: 'auto',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  textarea: {
    flex: 1,
    minHeight: '40px',
    maxHeight: '120px',
    resize: 'none',
  },
  sendButton: {
    minWidth: '40px',
    height: '40px',
  },
  connectionStatus: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    textAlign: 'center',
  },
});

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export function MessageInput({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  allowFileUpload = false,
  maxFileSize: _maxFileSize, // Not used with Fluent UI file input
  allowedFileTypes,
}: MessageInputProps) {
  const styles = useStyles();
  const [message, setMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isConnected } = useChatStore();

  const isDisabled = disabled || !isConnected;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (message.trim() || pendingAttachments.length > 0) {
      const attachments: Attachment[] = pendingAttachments.map((file) => ({
        id: generateMessageId(),
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
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setMessage(textarea.value);

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    setPendingAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {pendingAttachments.length > 0 && (
        <div className={styles.attachmentPreview}>
          {pendingAttachments.map((file, index) => (
            <Badge key={index} className={styles.attachmentItem} appearance="tint" size="large">
              <span>{file.name}</span>
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                size="small"
                className={styles.removeButton}
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
              />
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.inputWrapper}>
        {allowFileUpload && (
          <label htmlFor="file-upload">
            <Button
              appearance="subtle"
              icon={<AttachRegular />}
              disabled={isDisabled}
              onClick={() => document.getElementById('file-upload')?.click()}
              aria-label="Attach files"
            />
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
              accept={allowedFileTypes?.join(',')}
            />
          </label>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={styles.textarea}
          resize="none"
          appearance="outline"
        />

        <Button
          appearance="primary"
          icon={<SendRegular />}
          disabled={isDisabled || (!message.trim() && pendingAttachments.length === 0)}
          className={styles.sendButton}
          type="submit"
          aria-label="Send message"
        />
      </div>

      {!isConnected && <Caption1 className={styles.connectionStatus}>Connecting...</Caption1>}
    </form>
  );
}
