import React, { useState, useRef } from 'react';
import { FileUpload } from '../FileUpload';
import { useChatStore } from '../../store/chatStore';
import { generateMessageId } from '../../utils/messageUtils';
import type { Attachment } from '../../types';

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
  allowFileUpload = true,
  maxFileSize,
  allowedFileTypes,
}: MessageInputProps) {
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
    <form onSubmit={handleSubmit} className="inputContainer">
      {pendingAttachments.length > 0 && (
        <div className="attachmentPreview">
          {pendingAttachments.map((file, index) => (
            <div key={index} className="attachmentItem">
              <span className="attachmentName">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="removeButton"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="inputWrapper">
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
          className="textarea"
          rows={1}
        />

        <button
          type="submit"
          disabled={isDisabled || (!message.trim() && pendingAttachments.length === 0)}
          className="sendButton"
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

      {!isConnected && <div className="connectionStatus">Connecting...</div>}
    </form>
  );
}
