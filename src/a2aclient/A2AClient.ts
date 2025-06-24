import {
  AgentCard,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  JSONRPCErrorResponse,
  Message,
  Task,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  MessageSendParams,
  SendMessageResponse,
  SendStreamingMessageResponse,
  SendStreamingMessageSuccessResponse,
  TaskQueryParams,
  GetTaskResponse,
  TaskIdParams,
  CancelTaskResponse,
  TaskPushNotificationConfig,
  SetTaskPushNotificationConfigResponse,
  GetTaskPushNotificationConfigResponse,
  A2AError
} from './types';

// Helper type for the data yielded by streaming methods
export type A2AStreamEventData = Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

// Configuration options for the client
export interface A2AClientConfig {
  // Enable debug logging
  debug?: boolean;
}

/**
 * A2AClient that supports both SSE and simple request/response modes
 * When SSE is not supported, methods like sendMessageStream will throw an error
 */
export class A2AClient {
  private agentCardPromise: Promise<AgentCard>;
  private requestIdCounter: number = 1;
  private serviceEndpointUrl?: string;
  private supportsSSE: boolean = false;
  private config: A2AClientConfig & { debug: boolean };

  /**
   * Constructs an A2AClient instance.
   * @param agentCard The agent card URL or AgentCard object
   * @param config Optional configuration
   */
  constructor(agentCard: string | AgentCard, config: A2AClientConfig = {}) {
    this.config = {
      debug: config.debug || false
    };
    
    // If agent card is an object, use it directly; if it's a string, fetch it
    if (typeof agentCard === 'object') {
      this.agentCardPromise = this._initializeWithAgentCard(agentCard);
    } else {
      this.agentCardPromise = this._fetchAgentCard(agentCard);
    }
  }

  private log(...args: unknown[]) {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[A2AClient]', ...args);
    }
  }

  /**
   * Initializes the client with an agent card object
   */
  private async _initializeWithAgentCard(agentCard: AgentCard): Promise<AgentCard> {
    this.log('Using provided agent card object');
    
    if (!agentCard.url) {
      throw new Error("Agent Card does not contain a valid 'url' for the service endpoint.");
    }
    
    this.serviceEndpointUrl = agentCard.url;
    this.supportsSSE = agentCard.capabilities?.streaming || false;
    this.log(`Agent capabilities: SSE=${this.supportsSSE}`);
    
    return agentCard;
  }

  /**
   * Fetches the Agent Card from a URL
   */
  private async _fetchAgentCard(agentCardUrl: string): Promise<AgentCard> {
    this.log(`Fetching agent card from: ${agentCardUrl}`);
    try {
      const response = await fetch(agentCardUrl, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Agent Card from ${agentCardUrl}: ${response.status} ${response.statusText}`);
      }
      const agentCard: AgentCard = await response.json();
      if (!agentCard.url) {
        throw new Error("Fetched Agent Card does not contain a valid 'url' for the service endpoint.");
      }
      this.serviceEndpointUrl = agentCard.url;
      this.supportsSSE = agentCard.capabilities?.streaming || false;
      this.log(`Agent capabilities: SSE=${this.supportsSSE}`);
      return agentCard;
    } catch (error) {
      console.error("Error fetching or parsing Agent Card:", error);
      throw error;
    }
  }

  /**
   * Retrieves the Agent Card
   */
  public async getAgentCard(): Promise<AgentCard> {
    return this.agentCardPromise;
  }

  /**
   * Gets the RPC service endpoint URL
   */
  private async _getServiceEndpoint(): Promise<string> {
    if (this.serviceEndpointUrl) {
      return this.serviceEndpointUrl;
    }
    await this.agentCardPromise;
    if (!this.serviceEndpointUrl) {
      throw new Error("Agent Card URL for RPC endpoint is not available.");
    }
    return this.serviceEndpointUrl;
  }

  /**
   * Helper method to make a generic JSON-RPC POST request
   */
  private async _postRpcRequest<TParams, TResponse extends JSONRPCResponse>(
    method: string,
    params: TParams,
    acceptSSE: boolean = false
  ): Promise<TResponse> {
    const endpoint = await this._getServiceEndpoint();
    const requestId = this.requestIdCounter++;
    const rpcRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      method,
      params: params as { [key: string]: unknown; },
      id: requestId,
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": acceptSSE ? "text/event-stream" : "application/json"
    };

    const httpResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(rpcRequest),
    });

    if (!httpResponse.ok) {
      let errorBodyText = '(empty or non-JSON response)';
      try {
        errorBodyText = await httpResponse.text();
        const errorJson = JSON.parse(errorBodyText);
        // If it's a JSON-RPC error response, let it be processed normally
        if (errorJson.jsonrpc && errorJson.error) {
          const rpcResponse = errorJson;
          if (rpcResponse.id !== requestId) {
            console.error(`RPC response ID mismatch for method ${method}. Expected ${requestId}, got ${rpcResponse.id}`);
          }
          return rpcResponse as TResponse;
        } else if (!errorJson.jsonrpc && errorJson.error) {
          throw new Error(`RPC error for ${method}: ${errorJson.error.message} (Code: ${errorJson.error.code}, HTTP Status: ${httpResponse.status})`);
        } else {
          throw new Error(`HTTP error for ${method}! Status: ${httpResponse.status} ${httpResponse.statusText}. Response: ${errorBodyText}`);
        }
      } catch (e) {
        if (e instanceof Error && (e.message.startsWith('RPC error for') || e.message.startsWith('HTTP error for'))) throw e;
        throw new Error(`HTTP error for ${method}! Status: ${httpResponse.status} ${httpResponse.statusText}. Response: ${errorBodyText}`);
      }
    }

    // For SSE responses, return the response object directly
    if (acceptSSE && httpResponse.headers.get("Content-Type")?.startsWith("text/event-stream")) {
      return httpResponse as unknown as TResponse;
    }

    const rpcResponse = await httpResponse.json();
    if (rpcResponse.id !== requestId) {
      console.error(`RPC response ID mismatch for method ${method}. Expected ${requestId}, got ${rpcResponse.id}`);
    }

    return rpcResponse as TResponse;
  }

  /**
   * Sends a message to the agent (simple request/response)
   */
  public async sendMessage(params: MessageSendParams): Promise<SendMessageResponse> {
    return this._postRpcRequest<MessageSendParams, SendMessageResponse>("message/send", params);
  }

  /**
   * Sends a message and returns an async generator for updates
   * Only works if the agent supports SSE
   * @throws Error if agent doesn't support streaming
   */
  public async *sendMessageStream(params: MessageSendParams): AsyncGenerator<A2AStreamEventData, void, undefined> {
    await this.agentCardPromise; // Ensure we know capabilities

    if (!this.supportsSSE) {
      throw new Error("Agent does not support streaming (SSE). Use sendMessage() for request/response mode.");
    }

    yield* this._sendMessageStreamSSE(params);
  }

  /**
   * SSE-based streaming implementation
   */
  private async *_sendMessageStreamSSE(params: MessageSendParams): AsyncGenerator<A2AStreamEventData, void, undefined> {
    this.log('Using SSE streaming');
    const endpoint = await this._getServiceEndpoint();
    const clientRequestId = this.requestIdCounter++;
    const rpcRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      method: "message/stream",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: params as { [key: string]: any; },
      id: clientRequestId,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(rpcRequest),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error) {
          throw new Error(`HTTP error establishing stream: ${response.status}. RPC Error: ${errorJson.error.message}`);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.startsWith('HTTP error establishing stream')) throw e;
        throw new Error(`HTTP error establishing stream: ${response.status}. Response: ${errorBody || '(empty)'}`);
      }
    }

    if (!response.headers?.get("Content-Type")?.startsWith("text/event-stream")) {
      throw new Error("Invalid response Content-Type for SSE stream.");
    }

    yield* this._parseA2ASseStream<A2AStreamEventData>(response, clientRequestId);
  }

  /**
   * Sets or updates push notification configuration
   */
  public async setTaskPushNotificationConfig(params: TaskPushNotificationConfig): Promise<SetTaskPushNotificationConfigResponse> {
    const agentCard = await this.agentCardPromise;
    if (!agentCard.capabilities?.pushNotifications) {
      throw new Error("Agent does not support push notifications.");
    }
    return this._postRpcRequest<TaskPushNotificationConfig, SetTaskPushNotificationConfigResponse>(
      "tasks/pushNotificationConfig/set",
      params
    );
  }

  /**
   * Gets push notification configuration
   */
  public async getTaskPushNotificationConfig(params: TaskIdParams): Promise<GetTaskPushNotificationConfigResponse> {
    return this._postRpcRequest<TaskIdParams, GetTaskPushNotificationConfigResponse>(
      "tasks/pushNotificationConfig/get",
      params
    );
  }

  /**
   * Retrieves a task by its ID
   */
  public async getTask(params: TaskQueryParams): Promise<GetTaskResponse> {
    return this._postRpcRequest<TaskQueryParams, GetTaskResponse>("tasks/get", params);
  }

  /**
   * Cancels a task by its ID
   */
  public async cancelTask(params: TaskIdParams): Promise<CancelTaskResponse> {
    return this._postRpcRequest<TaskIdParams, CancelTaskResponse>("tasks/cancel", params);
  }

  /**
   * Resubscribes to a task's event stream
   * Only works if the agent supports SSE
   * @throws Error if agent doesn't support streaming
   */
  public async *resubscribeTask(params: TaskIdParams): AsyncGenerator<A2AStreamEventData, void, undefined> {
    await this.agentCardPromise;

    if (!this.supportsSSE) {
      throw new Error("Agent does not support streaming (SSE). Task resubscription requires SSE support.");
    }

    yield* this._resubscribeTaskSSE(params);
  }

  /**
   * SSE-based resubscription
   */
  private async *_resubscribeTaskSSE(params: TaskIdParams): AsyncGenerator<A2AStreamEventData, void, undefined> {
    const endpoint = await this._getServiceEndpoint();
    const clientRequestId = this.requestIdCounter++;
    const rpcRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      method: "tasks/resubscribe",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: params as { [key: string]: any; },
      id: clientRequestId,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(rpcRequest),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error) {
          throw new Error(`HTTP error establishing stream for resubscribe: ${response.status}. RPC Error: ${errorJson.error.message}`);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.startsWith('HTTP error establishing stream')) throw e;
        throw new Error(`HTTP error establishing stream for resubscribe: ${response.status}. Response: ${errorBody || '(empty)'}`);
      }
    }

    if (!response.headers?.get("Content-Type")?.startsWith("text/event-stream")) {
      throw new Error("Invalid response Content-Type for SSE stream on resubscribe.");
    }

    yield* this._parseA2ASseStream<A2AStreamEventData>(response, clientRequestId);
  }

  /**
   * Parses SSE stream
   */
  private async *_parseA2ASseStream<TStreamItem>(
    response: Response,
    originalRequestId: number | string | null
  ): AsyncGenerator<TStreamItem, void, undefined> {
    if (!response.body) {
      throw new Error("SSE response body is undefined.");
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let eventDataBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (eventDataBuffer.trim()) {
            const result = this._processSseEventData<TStreamItem>(eventDataBuffer, originalRequestId);
            yield result;
          }
          break;
        }

        buffer += value;
        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, lineEndIndex).trim();
          buffer = buffer.substring(lineEndIndex + 1);

          if (line === "") {
            if (eventDataBuffer) {
              const result = this._processSseEventData<TStreamItem>(eventDataBuffer, originalRequestId);
              yield result;
              eventDataBuffer = "";
            }
          } else if (line.startsWith("data:")) {
            eventDataBuffer += line.substring(5).trimStart() + "\n";
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error reading or parsing SSE stream:", error.message);
      } else {
        console.error("Error reading or parsing SSE stream:", error);
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Processes SSE event data
   */
  private _processSseEventData<TStreamItem>(
    jsonData: string,
    originalRequestId: number | string | null
  ): TStreamItem {
    if (!jsonData.trim()) {
      throw new Error("Attempted to process empty SSE event data.");
    }
    try {
      const sseJsonRpcResponse = JSON.parse(jsonData.replace(/\n$/, ''));
      const a2aStreamResponse: SendStreamingMessageResponse = sseJsonRpcResponse as SendStreamingMessageResponse;

      if (a2aStreamResponse.id !== originalRequestId) {
        console.warn(`SSE Event's JSON-RPC response ID mismatch. Client request ID: ${originalRequestId}, event response ID: ${a2aStreamResponse.id}.`);
      }

      if (this.isErrorResponse(a2aStreamResponse)) {
        const err = a2aStreamResponse.error as (JSONRPCError | A2AError);
        throw new Error(`SSE event contained an error: ${err.message} (Code: ${err.code})`);
      }

      if (!('result' in a2aStreamResponse) || typeof (a2aStreamResponse as SendStreamingMessageSuccessResponse).result === 'undefined') {
        throw new Error(`SSE event JSON-RPC response is missing 'result' field.`);
      }

      const successResponse = a2aStreamResponse as SendStreamingMessageSuccessResponse;
      return successResponse.result as TStreamItem;
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.startsWith("SSE event contained an error") || e.message.startsWith("SSE event JSON-RPC response is missing 'result' field")) {
          throw e;
        }
        console.error("Failed to parse SSE event data:", jsonData, e);
        throw new Error(`Failed to parse SSE event data: ${e.message}`);
      } else {
        console.error("Failed to parse SSE event data:", jsonData, e);
        throw new Error("Failed to parse SSE event data: Unknown error");
      }
    }
  }

  /**
   * Check if response is an error
   */
  private isErrorResponse(response: JSONRPCResponse): response is JSONRPCErrorResponse {
    return "error" in response;
  }

  /**
   * Check if the agent supports SSE streaming
   */
  public async supportsStreaming(): Promise<boolean> {
    await this.agentCardPromise;
    return this.supportsSSE;
  }
}