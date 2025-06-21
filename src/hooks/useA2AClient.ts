import { useEffect, useRef, useState, useCallback } from 'react';
import { A2AClient, type A2AStreamEventData } from '../a2aclient/A2AClient';
import type { Message as A2AMessage, Part } from '../a2aclient/types';
import type { Message } from '../types';
import { createMessage, formatPart, createArtifactMessage } from '../utils/messageUtils';

interface UseA2AClientProps {
  agentUrl?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: Message) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

interface A2AClientState {
  isConnected: boolean;
  supportsSSE: boolean;
  agentName: string;
  currentTaskId?: string;
  currentContextId?: string;
}

export function useA2AClient({
  agentUrl,
  onConnectionChange,
  onMessage,
  onTypingChange
}: UseA2AClientProps) {
  const clientRef = useRef<A2AClient | null>(null);
  const streamActiveRef = useRef<boolean>(false);
  const [state, setState] = useState<A2AClientState>({
    isConnected: false,
    supportsSSE: false,
    agentName: 'Agent'
  });

  useEffect(() => {
    if (!agentUrl) {
      clientRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
      return;
    }

    const client = new A2AClient(agentUrl, { debug: true });
    clientRef.current = client;

    // Initialize connection
    client.getAgentCard()
      .then(async (card) => {
        const supportsStreaming = await client.supportsStreaming();
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          supportsSSE: supportsStreaming,
          agentName: card.name || 'Agent'
        }));
        
        onConnectionChange?.(true);
      })
      .catch((error) => {
        console.error('Failed to connect to A2A agent:', error);
        setState(prev => ({ ...prev, isConnected: false }));
        onConnectionChange?.(false);
      });

    return () => {
      clientRef.current = null;
    };
  }, [agentUrl, onConnectionChange]);

  const handleStreamEvent = useCallback((
    event: A2AStreamEventData,
    artifactMessages: Message[]
  ): void => {
    if (event.kind === 'status-update') {
      const update = event;

      if (update.status?.message) {
        const content = update.status.message.parts.map(formatPart).join('\n');

        if (content.trim() || update.final) {
          const assistantMessage = createMessage(content, 'assistant');
          onMessage?.(assistantMessage);
        }
      }

      // Update task and context IDs
      if (update.taskId) {
        setState(prev => ({ ...prev, currentTaskId: update.taskId }));
      }
      if (update.contextId) {
        setState(prev => ({ ...prev, currentContextId: update.contextId }));
      }

      // Clear task ID if final and not input-required
      if (update.final && update.status?.state !== 'input-required') {
        setState(prev => ({ ...prev, currentTaskId: undefined }));
        streamActiveRef.current = false;
        onTypingChange?.(false);
      }
    } else if (event.kind === 'artifact-update') {
      const update = event;
      if (update.artifact && update.artifact.parts) {
        const artifactName = update.artifact.name || 'Artifact';
        const content = update.artifact.parts.map(formatPart).join('\n');

        if (content.trim()) {
          artifactMessages.push(createArtifactMessage(artifactName, content));
        }
      }
    } else if (event.kind === 'message' && event.role === 'agent') {
      const msg = event as A2AMessage;
      const content = msg.parts.map(formatPart).join('\n');

      const assistantMessage = createMessage(content, 'assistant');
      onMessage?.(assistantMessage);

      // Update IDs
      if (msg.taskId) {
        setState(prev => ({ ...prev, currentTaskId: msg.taskId }));
      }
      if (msg.contextId) {
        setState(prev => ({ ...prev, currentContextId: msg.contextId }));
      }
    } else if (event.kind === 'task') {
      const task = event;
      if (task.id) {
        setState(prev => ({ ...prev, currentTaskId: task.id }));
      }
      if (task.contextId) {
        setState(prev => ({ ...prev, currentContextId: task.contextId }));
      }
    }
  }, [onMessage, onTypingChange]);

  const sendMessage = useCallback(async (
    content: string,
    messageId: string
  ): Promise<void> => {
    if (!clientRef.current || !state.isConnected) {
      throw new Error('A2A client not connected');
    }

    const a2aMessage: A2AMessage = {
      kind: 'message',
      messageId,
      role: 'user',
      parts: [{ kind: 'text', text: content }] as Part[]
    };

    // Add task and context IDs if available
    if (state.currentTaskId) {
      a2aMessage.taskId = state.currentTaskId;
    }
    if (state.currentContextId) {
      a2aMessage.contextId = state.currentContextId;
    }

    if (state.supportsSSE) {
      // Use streaming for real-time responses
      const stream = clientRef.current.sendMessageStream({
        message: a2aMessage,
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      const artifactMessages: Message[] = [];
      streamActiveRef.current = true;
      onTypingChange?.(true);

      try {
        for await (const event of stream) {
          handleStreamEvent(event, artifactMessages);
        }

        // Add any artifact messages that were collected
        for (const artifactMsg of artifactMessages) {
          onMessage?.(artifactMsg);
        }
      } catch (error) {
        console.error('Error in stream processing:', error);
        throw error;
      } finally {
        streamActiveRef.current = false;
        onTypingChange?.(false);
      }
    } else {
      // Use simple request/response
      const response = await clientRef.current.sendMessage({
        message: a2aMessage,
        configuration: {
          acceptedOutputModes: ['text']
        }
      });

      if ('result' in response && response.result) {
        let agentMessage: A2AMessage | undefined;

        if (response.result.kind === 'message') {
          agentMessage = response.result;
        }

        if (agentMessage && agentMessage.role === 'agent') {
          const content = agentMessage.parts.map(formatPart).join('\n');
          const assistantMessage = createMessage(content, 'assistant');
          onMessage?.(assistantMessage);

          // Update IDs
          if (agentMessage.taskId) {
            setState(prev => ({ ...prev, currentTaskId: agentMessage.taskId }));
          }
          if (agentMessage.contextId) {
            setState(prev => ({ ...prev, currentContextId: agentMessage.contextId }));
          }
        }
      }
    }
  }, [state, handleStreamEvent, onMessage, onTypingChange]);

  return {
    ...state,
    sendMessage,
    isStreamActive: streamActiveRef.current
  };
}