/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { A2AClient, type A2AStreamEventData } from "../a2aclient/A2AClient";
import type {
  Message as A2AMessage,
  Part,
  AgentCard,
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

    const client = new A2AClient(agentCard, {
      debug: true,
    });
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
    (event: A2AStreamEventData, collectedArtifacts: ArtifactData[]): void => {
      console.log("handleStreamEvent called with event kind:", event?.kind);
      console.log("Full event:", JSON.stringify(event));
      
      // Check if event has the correct structure
      if (!event || typeof event !== 'object') {
        console.error("Invalid event structure:", event);
        return;
      }
      
      // Handle both kebab-case and underscore naming conventions
      const eventKind = event.kind?.replace(/_/g, '-');
      
      if (eventKind === "status-update" || event.kind === "status_update") {
        const update = event;
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
      } else if (eventKind === "artifact-update" || event.kind === "artifact_update") {
        const update = event;
        console.log("Artifact update event:", update);
        
        if (update.artifact && update.artifact.parts) {
          const artifactId = update.artifact.artifactId || "default";
          const artifactName = update.artifact.name || "Assistant";
          // Artifact parts have different structure - they directly contain {text: string, kind: string}
          const content = update.artifact.parts.map((part: any) => part.text || '').join("");

          console.log("Processing artifact:", { artifactId, content, append: update.append });

          const existingMessageId = artifactMessageIds.current.get(artifactId);
          
          if (existingMessageId) {
            // Update existing message
            if (update.append && content) {
              // Append content to existing message
              const currentMessages = useChatStore.getState().messages;
              const currentMessage = currentMessages.find(msg => msg.id === existingMessageId);
              if (currentMessage) {
                console.log("Appending to message:", existingMessageId, "content:", content);
                onUpdateMessage?.(existingMessageId, {
                  content: currentMessage.content + content
                });
              }
            } else if (!update.append) {
              // Replace content (new artifact or reset)
              console.log("Replacing message content:", existingMessageId, "content:", content);
              onUpdateMessage?.(existingMessageId, {
                content: content
              });
            }
          } else {
            // Create new artifact message for first chunk
            console.log("Creating new message for artifact:", artifactId, "content:", content);
            const message = createMessage(content, "assistant");
            artifactMessageIds.current.set(artifactId, message.id);
            onMessage?.(message);
          }
        }
      } else if ((eventKind === "message" || event.kind === "message") && event.role === "agent") {
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
      } else if (eventKind === "task" || event.kind === "task") {
        const task = event;
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

        const collectedArtifacts: ArtifactData[] = [];
        streamActiveRef.current = true;
        onTypingChange?.(true);
        
        // Clear artifact message tracking for new stream
        artifactMessageIds.current.clear();

        try {
          console.log("Starting to process stream...");
          for await (const event of stream) {
            console.log("Received stream event:", event);
            handleStreamEvent(event, collectedArtifacts);
          }
          console.log("Stream processing completed");
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
            let agentMessage: A2AMessage | undefined;

            // Handle different response types
            if (response.result.kind === "message") {
              agentMessage = response.result;
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
                    historyMsg.messageId
                  ) {
                    processedMessageIds.add(historyMsg.messageId);
                    const content = historyMsg.parts.map(formatPart).join("\n");
                    if (content.trim()) {
                      const assistantMessage = createMessage(
                        content,
                        "assistant",
                      );
                      onMessage?.(assistantMessage);
                    }
                  }
                }
              }

              // Process the status message only if it wasn't already in history
              if (
                taskResult.status?.message &&
                taskResult.status.message.messageId &&
                !processedMessageIds.has(taskResult.status.message.messageId)
              ) {
                agentMessage = taskResult.status.message;
              }

              // If task is completed, clear the task ID to avoid reusing it
              if (taskResult.status?.state === "completed") {
                setState((prev) => ({
                  ...prev,
                  currentTaskId: undefined,
                  currentContextId: taskResult.contextId,
                }));
              } else {
                if (taskResult.id) {
                  setState((prev) => ({
                    ...prev,
                    currentTaskId: taskResult.id,
                  }));
                }
                if (taskResult.contextId) {
                  setState((prev) => ({
                    ...prev,
                    currentContextId: taskResult.contextId,
                  }));
                }
              }
            }

            // Process the agent message
            if (agentMessage && agentMessage.role === "agent") {
              const content = agentMessage.parts.map(formatPart).join("\n");
              const assistantMessage = createMessage(content, "assistant");
              onMessage?.(assistantMessage);

              // Update IDs from the message as well
              if (agentMessage.taskId) {
                setState((prev) => ({
                  ...prev,
                  currentTaskId: agentMessage.taskId,
                }));
              }
              if (agentMessage.contextId) {
                setState((prev) => ({
                  ...prev,
                  currentContextId: agentMessage.contextId,
                }));
              }
            }

            // Process artifacts if present in task response
            if (
              response.result.kind === "task" &&
              response.result.artifacts &&
              response.result.artifacts.length > 0
            ) {
              const artifacts = response.result.artifacts;
              const collectedArtifacts: ArtifactData[] = artifacts.map(
                (artifact: any) => ({
                  name: artifact.name || artifact.artifactId || "Artifact",
                  content: artifact.parts
                    ? artifact.parts
                        .map((part: any) =>
                          part.kind === "text" ? part.text : "",
                        )
                        .join("\n")
                    : "",
                }),
              );

              if (collectedArtifacts.length === 1) {
                // Single artifact - use regular artifact message
                const artifact = collectedArtifacts[0];
                onMessage?.(
                  createArtifactMessage(artifact.name, artifact.content),
                );
              } else if (collectedArtifacts.length > 1) {
                // Multiple artifacts - use grouped message
                onMessage?.(createGroupedArtifactMessage(collectedArtifacts));
              }
            }
          }
        } catch (error) {
          console.error("Error in non-streaming message processing:", error);
          throw error;
        } finally {
          onTypingChange?.(false); // Hide typing indicator after processing response
        }
      }
    },
    [state, handleStreamEvent, onMessage, onTypingChange],
  );

  return {
    ...state,
    sendMessage,
    isStreamActive: streamActiveRef.current,
  };
}
