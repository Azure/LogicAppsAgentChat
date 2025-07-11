import React, { useState, useCallback } from 'react';
import type { AuthRequiredPart } from '../../client/types';
import { openPopupWindow } from '../../utils/popup-window';

export interface AuthenticationRequiredProps {
  authParts: AuthRequiredPart[];
  onAllAuthenticated: () => void;
  onCancel?: () => void;
}

interface AuthPartState extends AuthRequiredPart {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error?: string;
}

export const AuthenticationRequired: React.FC<AuthenticationRequiredProps> = ({
  authParts,
  onAllAuthenticated,
  onCancel,
}) => {
  const [authStates, setAuthStates] = useState<AuthPartState[]>(() =>
    authParts.map((part) => ({
      ...part,
      isAuthenticated: false,
      isAuthenticating: false,
    }))
  );

  const handleAuthenticate = useCallback(
    async (index: number) => {
      const authPart = authStates[index];
      if (!authPart || authPart.isAuthenticated || authPart.isAuthenticating) {
        return;
      }

      // Update state to show authenticating
      setAuthStates((prev) => {
        const newStates = [...prev];
        newStates[index] = { ...newStates[index], isAuthenticating: true, error: undefined };
        return newStates;
      });

      try {
        // Open popup for authentication
        const result = await openPopupWindow(authPart.consentLink, `auth-${index}`, {
          width: 800,
          height: 600,
        });

        if (result.closed && !result.error) {
          // Authentication successful
          setAuthStates((prev) => {
            const newStates = [...prev];
            newStates[index] = {
              ...newStates[index],
              isAuthenticated: true,
              isAuthenticating: false,
            };

            // Check if all parts are authenticated
            const allAuthenticated = newStates.every((state) => state.isAuthenticated);
            if (allAuthenticated) {
              // Small delay to show success state before calling callback
              setTimeout(() => {
                onAllAuthenticated();
              }, 500);
            }

            return newStates;
          });
        } else {
          throw result.error || new Error('Authentication was cancelled');
        }
      } catch (error) {
        // Authentication failed
        setAuthStates((prev) => {
          const newStates = [...prev];
          newStates[index] = {
            ...newStates[index],
            isAuthenticating: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
          };
          return newStates;
        });
      }
    },
    [authStates, onAllAuthenticated]
  );

  const allAuthenticated = authStates.every((state) => state.isAuthenticated);
  const authenticatedCount = authStates.filter((state) => state.isAuthenticated).length;

  return (
    <div className="a2a-auth-required">
      <div className="a2a-auth-header">
        <svg className="a2a-auth-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3>Authentication Required</h3>
      </div>

      <p className="a2a-auth-description">
        This action requires authentication with{' '}
        {authParts.length === 1 ? 'an external service' : 'external services'}. Please sign in to
        continue.
      </p>

      {authParts.length > 1 && (
        <div className="a2a-auth-progress">
          <div className="a2a-auth-progress-bar">
            <div
              className="a2a-auth-progress-fill"
              style={{ width: `${(authenticatedCount / authParts.length) * 100}%` }}
            />
          </div>
          <span className="a2a-auth-progress-text">
            {authenticatedCount} of {authParts.length} authenticated
          </span>
        </div>
      )}

      <div className="a2a-auth-services">
        {authStates.map((authState, index) => (
          <div key={index} className="a2a-auth-service">
            <div className="a2a-auth-service-info">
              {authState.serviceIcon ? (
                <img
                  src={authState.serviceIcon}
                  alt={authState.serviceName}
                  className="a2a-auth-service-icon"
                />
              ) : (
                <div className="a2a-auth-service-icon-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M9 9h6M9 15h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <div className="a2a-auth-service-details">
                <h4>{authState.serviceName}</h4>
                {authState.description && (
                  <p className="a2a-auth-service-description">{authState.description}</p>
                )}
                {authState.error && <p className="a2a-auth-service-error">{authState.error}</p>}
              </div>
            </div>

            <button
              className={`a2a-auth-service-button ${
                authState.isAuthenticated
                  ? 'a2a-auth-service-button-success'
                  : authState.isAuthenticating
                    ? 'a2a-auth-service-button-loading'
                    : ''
              }`}
              onClick={() => handleAuthenticate(index)}
              disabled={authState.isAuthenticated || authState.isAuthenticating}
            >
              {authState.isAuthenticated ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.5 4.5L6 12l-3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Authenticated
                </>
              ) : authState.isAuthenticating ? (
                <>
                  <span className="a2a-auth-spinner" />
                  Authenticating...
                </>
              ) : (
                <>Sign In</>
              )}
            </button>
          </div>
        ))}
      </div>

      {allAuthenticated && (
        <div className="a2a-auth-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
            <path
              d="M6 10l2.5 2.5L14 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>All services authenticated successfully!</span>
        </div>
      )}

      {onCancel && !allAuthenticated && (
        <button className="a2a-auth-cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
};
