import type { AuthRequiredHandler, AuthRequiredPart, AuthRequiredEvent } from './types';

/**
 * Handles authentication flow during streaming
 */
export class AuthHandler {
  constructor(private onAuthRequired?: AuthRequiredHandler) {}

  /**
   * Process auth-required status from streaming response
   */
  async handleAuthRequired(result: any, currentTaskId: string): Promise<void> {
    if (!this.onAuthRequired) return;

    // Skip if not auth-required status
    if (
      result.kind !== 'auth-required' &&
      !(result.kind === 'status-update' && result.status?.state === 'auth-required')
    ) {
      return;
    }

    const authParts = this.extractAuthParts(result);
    if (authParts.length === 0) return;

    const authEvent: AuthRequiredEvent = {
      taskId: result.taskId || currentTaskId,
      contextId: result.contextId || '',
      authParts,
      messageType: 'InTaskAuthRequired',
    };

    try {
      await Promise.resolve(this.onAuthRequired(authEvent));
    } catch (error) {
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract auth parts from status message
   */
  private extractAuthParts(result: any): AuthRequiredPart[] {
    const authMessage = result.status?.message;
    if (!authMessage?.parts) return [];

    const authParts: AuthRequiredPart[] = [];

    for (const part of authMessage.parts) {
      if (part.kind === 'Data' || part.kind === 'data') {
        const authData = part.data;
        if (authData?.messageType === 'InTaskAuthRequired' && authData?.consentLink) {
          authParts.push(this.createAuthPart(authData));
        }
      }
    }

    return authParts;
  }

  /**
   * Create auth part from auth data
   */
  private createAuthPart(authData: any): AuthRequiredPart {
    const consentLink = authData.consentLink;

    return {
      consentLink: consentLink.link || consentLink,
      status: consentLink.status || authData.status || 'Unauthenticated',
      serviceName:
        consentLink.apiDetails?.apiDisplayName || authData.serviceName || 'External Service',
      serviceIcon: consentLink.apiDetails?.apiIconUri || authData.serviceIcon,
      description: authData.description,
    };
  }

  /**
   * Create authentication completed message
   */
  static createAuthCompletedMessage(contextId: string, taskId: string) {
    return {
      message: {
        role: 'user' as const,
        content: [
          {
            type: 'structured' as const,
            schema: {},
            data: {
              messageType: 'AuthenticationCompleted',
            },
          },
        ],
      },
      context: {
        contextId,
        taskId,
        acceptedOutputModes: ['text'],
      },
    };
  }
}
