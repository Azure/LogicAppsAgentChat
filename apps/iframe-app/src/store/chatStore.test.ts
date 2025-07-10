import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStore } from './chatStore';
import type { Message, Attachment } from '../types';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useChatStore());
    act(() => {
      result.current.setMessages([]);
      result.current.setConnected(false);
      result.current.setTyping(false);
      // Clear pending uploads
      const currentUploads = result.current.pendingUploads;
      currentUploads.forEach((_, id) => {
        result.current.removePendingUpload(id);
      });
    });
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useChatStore());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.pendingUploads).toBeInstanceOf(Map);
      expect(result.current.pendingUploads.size).toBe(0);
    });
  });

  describe('message actions', () => {
    it('adds a message', () => {
      const { result } = renderHook(() => useChatStore());

      const message: Message = {
        id: '1',
        sender: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(message);
    });

    it('adds multiple messages', () => {
      const { result } = renderHook(() => useChatStore());

      const message1: Message = {
        id: '1',
        sender: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const message2: Message = {
        id: '2',
        sender: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message1);
        result.current.addMessage(message2);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual(message1);
      expect(result.current.messages[1]).toEqual(message2);
    });

    it('updates a message', () => {
      const { result } = renderHook(() => useChatStore());

      const message: Message = {
        id: '1',
        sender: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('1', { content: 'Hello, updated!' });
      });

      expect(result.current.messages[0].content).toBe('Hello, updated!');
      expect(result.current.messages[0].id).toBe('1');
      expect(result.current.messages[0].sender).toBe('user');
    });

    it('does not update non-existent message', () => {
      const { result } = renderHook(() => useChatStore());

      const message: Message = {
        id: '1',
        sender: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('2', { content: 'Should not update' });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Hello');
    });

    it('deletes a message', () => {
      const { result } = renderHook(() => useChatStore());

      const message1: Message = {
        id: '1',
        sender: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const message2: Message = {
        id: '2',
        sender: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message1);
        result.current.addMessage(message2);
      });

      act(() => {
        result.current.deleteMessage('1');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(message2);
    });

    it('does not crash when deleting non-existent message', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.deleteMessage('non-existent');
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('sets messages array', () => {
      const { result } = renderHook(() => useChatStore());

      const messages: Message[] = [
        {
          id: '1',
          sender: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          sender: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setMessages(messages);
      });

      expect(result.current.messages).toEqual(messages);
    });

    it('clears all messages', () => {
      const { result } = renderHook(() => useChatStore());

      const messages: Message[] = [
        {
          id: '1',
          sender: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          sender: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setMessages(messages);
      });

      expect(result.current.messages).toHaveLength(2);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('connection state', () => {
    it('sets connected state to true', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('sets connected state to false', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.setConnected(false);
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('typing state', () => {
    it('sets typing state to true', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setTyping(true);
      });

      expect(result.current.isTyping).toBe(true);
    });

    it('sets typing state to false', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setTyping(true);
      });

      expect(result.current.isTyping).toBe(true);

      act(() => {
        result.current.setTyping(false);
      });

      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('pending uploads', () => {
    it('adds a pending upload', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      expect(result.current.pendingUploads.size).toBe(1);
      expect(result.current.pendingUploads.get('upload1')).toEqual(attachment);
    });

    it('adds multiple pending uploads', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment1: Attachment = {
        id: 'upload1',
        name: 'test1.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test1',
        status: 'uploading',
      };

      const attachment2: Attachment = {
        id: 'upload2',
        name: 'test2.jpg',
        type: 'image/jpeg',
        size: 2048,
        url: 'blob:test2',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment1);
        result.current.addPendingUpload(attachment2);
      });

      expect(result.current.pendingUploads.size).toBe(2);
      expect(result.current.pendingUploads.get('upload1')).toEqual(attachment1);
      expect(result.current.pendingUploads.get('upload2')).toEqual(attachment2);
    });

    it('updates a pending upload', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      act(() => {
        result.current.updatePendingUpload('upload1', {
          url: 'https://uploaded.url',
        });
      });

      const updated = result.current.pendingUploads.get('upload1');
      expect(updated).toEqual({
        ...attachment,
        url: 'https://uploaded.url',
      });
    });

    it('does not update non-existent upload', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      act(() => {
        result.current.updatePendingUpload('upload2', {});
      });

      expect(result.current.pendingUploads.size).toBe(1);
      expect(result.current.pendingUploads.get('upload1')).toEqual(attachment);
      expect(result.current.pendingUploads.get('upload2')).toBeUndefined();
    });

    it('removes a pending upload', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment1: Attachment = {
        id: 'upload1',
        name: 'test1.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test1',
        status: 'uploading',
      };

      const attachment2: Attachment = {
        id: 'upload2',
        name: 'test2.jpg',
        type: 'image/jpeg',
        size: 2048,
        url: 'blob:test2',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment1);
        result.current.addPendingUpload(attachment2);
      });

      expect(result.current.pendingUploads.size).toBe(2);

      act(() => {
        result.current.removePendingUpload('upload1');
      });

      expect(result.current.pendingUploads.size).toBe(1);
      expect(result.current.pendingUploads.get('upload1')).toBeUndefined();
      expect(result.current.pendingUploads.get('upload2')).toEqual(attachment2);
    });

    it('does not crash when removing non-existent upload', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.removePendingUpload('non-existent');
      });

      expect(result.current.pendingUploads.size).toBe(0);
    });

    it('maintains Map immutability when adding uploads', () => {
      const { result } = renderHook(() => useChatStore());

      const originalMap = result.current.pendingUploads;

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      expect(result.current.pendingUploads).not.toBe(originalMap);
    });

    it('maintains Map immutability when updating uploads', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      const mapAfterAdd = result.current.pendingUploads;

      act(() => {
        result.current.updatePendingUpload('upload1', { status: 'uploading' });
      });

      expect(result.current.pendingUploads).not.toBe(mapAfterAdd);
    });

    it('maintains Map immutability when removing uploads', () => {
      const { result } = renderHook(() => useChatStore());

      const attachment: Attachment = {
        id: 'upload1',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'blob:test',
        status: 'uploading',
      };

      act(() => {
        result.current.addPendingUpload(attachment);
      });

      const mapAfterAdd = result.current.pendingUploads;

      act(() => {
        result.current.removePendingUpload('upload1');
      });

      expect(result.current.pendingUploads).not.toBe(mapAfterAdd);
    });
  });

  describe('complex scenarios', () => {
    it('handles message with attachments', () => {
      const { result } = renderHook(() => useChatStore());

      const attachments: Attachment[] = [
        {
          id: 'file1',
          name: 'document.pdf',
          type: 'application/pdf',
          size: 1024,
          url: 'https://example.com/file1',
          status: 'uploaded',
        },
        {
          id: 'file2',
          name: 'image.jpg',
          type: 'image/jpeg',
          size: 2048,
          url: 'https://example.com/file2',
          status: 'uploaded',
        },
      ];

      const message: Message = {
        id: '1',
        sender: 'user',
        content: 'Here are my files',
        timestamp: new Date(),
        attachments,
      };

      act(() => {
        result.current.addMessage(message);
      });

      expect(result.current.messages[0].attachments).toEqual(attachments);
    });

    it('handles multiple state updates in sequence', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setConnected(true);
        result.current.setTyping(true);
        result.current.addMessage({
          id: '1',
          sender: 'user',
          content: 'Hello',
          timestamp: new Date(),
        });
        result.current.addPendingUpload({
          id: 'upload1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          url: 'blob:test',
          status: 'uploading',
        });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isTyping).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.pendingUploads.size).toBe(1);
    });

    it('preserves message order when updating', () => {
      const { result } = renderHook(() => useChatStore());

      const messages: Message[] = [
        { id: '1', sender: 'user', content: 'First', timestamp: new Date() },
        { id: '2', sender: 'assistant', content: 'Second', timestamp: new Date() },
        { id: '3', sender: 'user', content: 'Third', timestamp: new Date() },
      ];

      act(() => {
        result.current.setMessages(messages);
      });

      act(() => {
        result.current.updateMessage('2', { content: 'Updated Second' });
      });

      expect(result.current.messages[0].content).toBe('First');
      expect(result.current.messages[1].content).toBe('Updated Second');
      expect(result.current.messages[2].content).toBe('Third');
    });

    it('handles partial message updates', () => {
      const { result } = renderHook(() => useChatStore());

      const message: Message = {
        id: '1',
        sender: 'assistant',
        content: 'Original content',
        timestamp: new Date(),
        metadata: { key: 'value' },
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('1', {
          content: 'Updated content',
          metadata: { key: 'new value', extra: 'data' },
        });
      });

      const updated = result.current.messages[0];
      expect(updated.content).toBe('Updated content');
      expect(updated.metadata).toEqual({ key: 'new value', extra: 'data' });
      expect(updated.sender).toBe('assistant'); // Unchanged
      expect(updated.timestamp).toEqual(message.timestamp); // Unchanged
    });
  });

  describe('zustand store behavior', () => {
    it('shares state between multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useChatStore());
      const { result: result2 } = renderHook(() => useChatStore());

      act(() => {
        result1.current.addMessage({
          id: '1',
          sender: 'user',
          content: 'Hello from hook 1',
          timestamp: new Date(),
        });
      });

      expect(result2.current.messages).toHaveLength(1);
      expect(result2.current.messages[0].content).toBe('Hello from hook 1');
    });

    it('updates all subscribers when state changes', () => {
      const { result: result1 } = renderHook(() => useChatStore());
      const { result: result2 } = renderHook(() => useChatStore());

      act(() => {
        result1.current.setConnected(true);
        result1.current.setTyping(true);
      });

      expect(result2.current.isConnected).toBe(true);
      expect(result2.current.isTyping).toBe(true);
    });
  });
});
