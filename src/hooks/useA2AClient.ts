/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { A2AClient, type A2AStreamEventData } from "../a2aclient/A2AClient";
import type {
  Message as A2AMessage,
  Part,
  AgentCard,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Task,
} from "../a2aclient/types";
import type { Message } from "../types";
import {
  createMessage,
  formatPart,
  createArtifactMessage,
  createGroupedArtifactMessage,
  type ArtifactData,
} from "../utils/messageUtils";
import { useChatStore } from "../store/chatStore";

interface UseA2AClientProps {
  agentCard?: string | AgentCard;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: Message) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onUpdateMessage?: (id: string, updates: Partial<Message>) => void;
}

interface A2AClientState {
  isConnected: boolean;
  supportsSSE: boolean;
  agentName: string;
  currentTaskId?: string;
  currentContextId?: string;
}

export function useA2AClient({
  agentCard,
  onConnectionChange,
  onMessage,
  onTypingChange,
  onUpdateMessage,
}: UseA2AClientProps) {
  const clientRef = useRef<A2AClient | null>(null);
  const streamActiveRef = useRef<boolean>(false);
  const artifactMessageIds = useRef<Map<string, string>>(new Map());
  const [state, setState] = useState<A2AClientState>({
    isConnected: false,
    supportsSSE: false,
    agentName: "Agent",
  });

  useEffect(() => {
    if (!agentCard) {
      clientRef.current = null;
      setState((prev) => ({ ...prev, isConnected: false }));
      return;
    }

    const client = new A2AClient(agentCard);
    clientRef.current = client;

    // Initialize connection
    client
      .getAgentCard()
      .then(async (card) => {
        const supportsStreaming = await client.supportsStreaming();

        setState((prev) => ({
          ...prev,
          isConnected: true,
          supportsSSE: supportsStreaming,
          agentName: card.name || "Agent",
        }));

        onConnectionChange?.(true);
      })
      .catch((error) => {
        console.error("Failed to connect to A2A agent:", error);
        setState((prev) => ({ ...prev, isConnected: false }));
        onConnectionChange?.(false);
      });

    return () => {
      clientRef.current = null;
    };
  }, [agentCard, onConnectionChange]);

  const handleStreamEvent = useCallback(
    (event: A2AStreamEventData): void => {
      // Check if event has the correct structure
      if (!event || typeof event !== 'object') {
        console.error("Invalid event structure:", event);
        return;
      }
      
      // Type guards and processing for different event types
      if (event.kind === "status-update" || event.kind === "status_update") {
        // This is a TaskStatusUpdateEvent
        const update = event as TaskStatusUpdateEvent;
        const content = update.status?.message
          ? update.status.message.parts.map(formatPart).join("\n")
          : "";

        if (content.trim()) {
          // Create regular message for status updates
          const message = createMessage(content, "assistant");
          onMessage?.(message);
        }

        // Update task and context IDs
        if (update.taskId) {
          setState((prev) => ({ ...prev, currentTaskId: update.taskId }));
        }
        if (update.contextId) {
          setState((prev) => ({ ...prev, currentContextId: update.contextId }));
        }

        // Handle final status
        if (update.final) {
          setState((prev) => ({
            ...prev,
            currentTaskId:
              update.status?.state === "input-required"
                ? prev.currentTaskId
                : undefined,
          }));
          streamActiveRef.current = false;
          onTypingChange?.(false);
        }
      } else if (event.kind === "artifact-update" || event.kind === "artifact_update") {
        // This is a TaskArtifactUpdateEvent
        const update = event as TaskArtifactUpdateEvent;
        
        if (update.artifact && update.artifact.parts) {
          const artifactId = update.artifact.artifactId || "default";
          // Artifact parts have different structure - they directly contain {text: string, kind: string}
          // Handle both lowercase 'text' and uppercase 'Text' properties
          const content = update.artifact.parts.map((part: any) => {
            return part.text || part.Text || '';
          }).join("");

          const existingMessageId = artifactMessageIds.current.get(artifactId);
          
          if (existingMessageId) {
            // Update existing message
            if (update.append && content) {
              // Append content to existing message
              const currentMessages = useChatStore.getState().messages;
              const currentMessage = currentMessages.find(msg => msg.id === existingMessageId);
              if (currentMessage) {
                onUpdateMessage?.(existingMessageId, {
                  content: currentMessage.content + content
                });
              }
            } else if (!update.append) {
              // Replace content (new artifact or reset)
              onUpdateMessage?.(existingMessageId, {
                content: content
              });
            }
          } else {
            // Create new artifact message for first chunk
            const message = createMessage(content, "assistant");
            artifactMessageIds.current.set(artifactId, message.id);
            onMessage?.(message);
          }
        }
      } else if (event.kind === "message" && event.role === "agent") {
        const msg = event as A2AMessage;
        const content = msg.parts.map(formatPart).join("\n");

        const assistantMessage = createMessage(content, "assistant");
        onMessage?.(assistantMessage);

        // Update IDs
        if (msg.taskId) {
          setState((prev) => ({ ...prev, currentTaskId: msg.taskId }));
        }
        if (msg.contextId) {
          setState((prev) => ({ ...prev, currentContextId: msg.contextId }));
        }
      } else if (event.kind === "task") {
        const task = event as Task;
        if (task.id) {
          setState((prev) => ({ ...prev, currentTaskId: task.id }));
        }
        if (task.contextId) {
          setState((prev) => ({ ...prev, currentContextId: task.contextId }));
        }
      }
    },
    [onMessage, onTypingChange, onUpdateMessage],
  );

  const sendMessage = useCallback(
    async (content: string, messageId: string): Promise<void> => {
      if (!clientRef.current || !state.isConnected) {
        throw new Error("A2A client not connected");
      }

      const a2aMessage: A2AMessage = {
        kind: "message",
        messageId,
        role: "user",
        parts: [{ kind: "text", text: content }] as Part[],
      };

      // Only add context ID for non-streaming mode
      // For non-streaming, we should NOT include task ID to avoid the "terminal state" error
      if (!state.supportsSSE) {
        // Only include context ID, never task ID for non-streaming
        if (state.currentContextId) {
          a2aMessage.contextId = state.currentContextId;
        }
      } else {
        // For streaming mode, include both if available
        if (state.currentTaskId) {
          a2aMessage.taskId = state.currentTaskId;
        }
        if (state.currentContextId) {
          a2aMessage.contextId = state.currentContextId;
        }
      }

      if (state.supportsSSE) {
        // Use streaming for real-time responses
        const stream = clientRef.current.sendMessageStream({
          message: a2aMessage,
          configuration: {
            acceptedOutputModes: ["text"],
          },
        });

        streamActiveRef.current = true;
        onTypingChange?.(true);
        
        // Clear artifact message tracking for new stream
        artifactMessageIds.current.clear();

        try {
          for await (const event of stream) {
            handleStreamEvent(event);
          }
        } catch (error) {
          console.error("Error in stream processing:", error);
          throw error;
        } finally {
          streamActiveRef.current = false;
          onTypingChange?.(false);
        }
      } else {
        // Use simple request/response
        onTypingChange?.(true); // Show typing indicator for non-streaming requests

        try {
          const response = await clientRef.current.sendMessage({
            message: a2aMessage,
            configuration: {
              acceptedOutputModes: ["text"],
            },
          });

          if ("result" in response && response.result) {
            // Handle different response types
            if (response.result.kind === "message") {
              const agentMessage = response.result as A2AMessage;
              const content = agentMessage.parts.map(formatPart).join("\n");
              if (content.trim()) {
                const assistantMessage = createMessage(content, "assistant");
                onMessage?.(assistantMessage);
              }
            } else if (response.result.kind === "task") {
              const taskResult = response.result as any; // Type assertion needed due to union type

              // Process all messages from history (except the user's message)
              const processedMessageIds = new Set<string>();

              if (taskResult.history && Array.isArray(taskResult.history)) {
                // Skip the first message (user's message) and process all agent messages
                for (let i = 1; i < taskResult.history.length; i++) {
                  const historyMsg = taskResult.history[i];
                  if (
                    historyMsg.role === "agent" &&
                    historyMsg.parts &&
                    historyMsg.messageId &&
                    !processedMessageIds.has(historyMsg.messageId)
                  ) {
                    const content = historyMsg.parts.map(formatPart).join("\n");
                    if (content.trim()) {
                      const assistantMessage = createMessage(
                        content,
                        "assistant",
                      );
                      onMessage?.(assistantMessage);
                      processedMessageIds.add(historyMsg.messageId);
                    }
                  }
                }
              }

              // Update IDs from task result
              if (taskResult.id) {
                setState((prev) => ({ ...prev, currentTaskId: taskResult.id }));
              }
              if (taskResult.contextId) {
                setState((prev) => ({
                  ...prev,
                  currentContextId: taskResult.contextId,
                }));
              }
            }

            // Process artifacts if present in the response
            if (
              "artifacts" in response.result &&
              Array.isArray(response.result.artifacts)
            ) {
              const artifacts = response.result.artifacts;
              const artifactData: ArtifactData[] = [];

              for (const artifact of artifacts) {
                if (artifact.parts) {
                  const content = artifact.parts.map(formatPart).join("\n");
                  if (content.trim()) {
                    artifactData.push({
                      name: artifact.name || "Artifact",
                      content: content,
                    });
                  }
                }
              }

              if (artifactData.length > 0) {
                if (artifactData.length === 1) {
                  onMessage?.(
                    createArtifactMessage(
                      artifactData[0].name,
                      artifactData[0].content,
                    ),
                  );
                } else {
                  onMessage?.(createGroupedArtifactMessage(artifactData));
                }
              }
            }
          }
        } catch (error) {
          console.error("Error sending message:", error);
          throw error;
        } finally {
          onTypingChange?.(false);
        }
      }
    },
    [
      state.isConnected,
      state.supportsSSE,
      state.currentTaskId,
      state.currentContextId,
      onMessage,
      onTypingChange,
      handleStreamEvent,
    ],
  );

  return {
    sendMessage,
    isConnected: state.isConnected,
    isTyping: streamActiveRef.current,
    supportsSSE: state.supportsSSE,
    agentName: state.agentName,
    currentTaskId: state.currentTaskId,
    currentContextId: state.currentContextId,
    isStreamActive: streamActiveRef.current,
  };
}