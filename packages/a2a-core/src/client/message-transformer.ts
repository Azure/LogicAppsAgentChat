import type { MessageSendRequest, Part } from '../types';

/**
 * Handles all message format transformations between SDK and A2A protocol
 */
export class MessageTransformer {
  /**
   * Transform SDK message format to A2A protocol format
   */
  static toA2AMessage(request: MessageSendRequest) {
    const messageId = crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random()}`;

    return {
      kind: 'message',
      messageId,
      role: request.message.role,
      parts: request.message.content.map(this.transformPart),
      // Include contextId and taskId if available
      ...(request.context?.contextId ? { contextId: request.context.contextId } : {}),
      ...(request.context?.['contextId'] ? { contextId: request.context['contextId'] } : {}),
      ...(request.context?.taskId ? { taskId: request.context.taskId } : {}),
      ...(request.context?.['taskId'] ? { taskId: request.context['taskId'] } : {}),
    };
  }

  /**
   * Transform a single message part
   */
  private static transformPart(part: Part) {
    switch (part.type) {
      case 'text':
        return { kind: 'text', text: part.content };
      case 'file':
        return {
          kind: 'file',
          mimeType: part.mimeType,
          data: part.data,
          filename: part.filename,
        };
      case 'structured':
        return {
          kind: 'data',
          data: (part as any).data,
        };
      default:
        return {
          kind: 'data',
          data: (part as any).data,
        };
    }
  }

  /**
   * Create JSON-RPC request wrapper
   */
  static createJsonRpcRequest(method: string, params: any) {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };
  }

  /**
   * Extract result from JSON-RPC response
   */
  static extractJsonRpcResult<T>(response: any): T {
    if (response.error) {
      throw new Error(
        `JSON-RPC error: ${response.error.message || JSON.stringify(response.error)}`
      );
    }
    return response.result || response;
  }

  /**
   * Transform A2A message parts to SDK format
   */
  static fromA2AMessageParts(parts: any[]): Part[] {
    return parts
      .filter((p: any) => p.kind === 'text' || p.kind === 'Text')
      .map((p: any) => ({
        type: 'text' as const,
        content: p.text || '',
      }));
  }
}
