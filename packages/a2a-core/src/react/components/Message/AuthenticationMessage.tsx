import React, { useState, useCallback } from 'react';
import {
  Button,
  Text,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ShieldCheckmarkRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import type { AuthRequiredPart, AuthenticationStatus } from '../../types';
import { openPopupWindow } from '../../../utils/popup-window';

const useStyles = makeStyles({
  container: {
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    boxShadow: tokens.shadow2,
  },
  containerCompleted: {
    backgroundColor: 'rgba(16, 124, 16, 0.05)', // Very subtle green tint
    ...shorthands.border('1px', 'solid', tokens.colorPaletteGreenBorder2),
  },
  containerFailed: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedBorder1),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalS,
  },
  icon: {
    color: tokens.colorBrandForeground1,
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  description: {
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground2,
  },
  services: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  service: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  serviceInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  serviceIcon: {
    width: '24px',
    height: '24px',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
  serviceDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  successBadge: {
    marginTop: tokens.spacingVerticalS,
    color: tokens.colorPaletteGreenForeground1,
  },
});

interface AuthenticationMessageProps {
  authParts: AuthRequiredPart[];
  status: AuthenticationStatus;
  // Called when all auth parts have been successfully authenticated
  onAuthenticate?: (updatedParts: AuthRequiredPart[]) => void;
}

interface AuthPartState extends AuthRequiredPart {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error?: string;
}

export const AuthenticationMessage: React.FC<AuthenticationMessageProps> = ({
  authParts,
  status,
  onAuthenticate,
}) => {
  const styles = useStyles();
  const [authStates, setAuthStates] = useState<AuthPartState[]>(() =>
    authParts.map((part) => ({
      ...part,
      isAuthenticated: status === 'completed',
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
            if (allAuthenticated && onAuthenticate) {
              // Notify parent that all auth is complete
              onAuthenticate(newStates);
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
    [authStates, onAuthenticate]
  );

  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckmarkCircleRegular className={styles.successIcon} />;
      case 'failed':
        return <ErrorCircleRegular className={styles.errorIcon} />;
      default:
        return <ShieldCheckmarkRegular className={styles.icon} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'completed':
        return 'Authentication Completed';
      case 'failed':
        return 'Authentication Failed';
      default:
        return 'Authentication Required';
    }
  };

  const getTitleStyles = () => {
    switch (status) {
      case 'completed':
        return { color: tokens.colorPaletteGreenForeground1 };
      case 'failed':
        return { color: tokens.colorPaletteRedForeground1 };
      default:
        return {};
    }
  };

  const getContainerStyles = () => {
    switch (status) {
      case 'completed':
        return mergeClasses(styles.container, styles.containerCompleted);
      case 'failed':
        return mergeClasses(styles.container, styles.containerFailed);
      default:
        return styles.container;
    }
  };

  return (
    <div className={getContainerStyles()}>
      <div className={styles.header}>
        {getIcon()}
        <Text weight="semibold" size={400} style={getTitleStyles()}>
          {getTitle()}
        </Text>
      </div>

      {status === 'pending' && (
        <Text className={styles.description}>
          This action requires authentication with{' '}
          {authParts.length === 1 ? 'an external service' : 'external services'}. Please sign in to
          continue.
        </Text>
      )}

      <div className={styles.services}>
        {authStates.map((authState, index) => (
          <div key={index} className={styles.service}>
            <div className={styles.serviceInfo}>
              {authState.serviceIcon ? (
                <img
                  src={authState.serviceIcon}
                  alt={authState.serviceName}
                  className={styles.serviceIcon}
                />
              ) : (
                <ShieldCheckmarkRegular />
              )}
              <div className={styles.serviceDetails}>
                <Text weight="semibold">{authState.serviceName || 'External Service'}</Text>
                {authState.description && (
                  <Text size={200} className={styles.description}>
                    {authState.description}
                  </Text>
                )}
              </div>
            </div>

            {status === 'pending' && (
              <Button
                appearance={authState.isAuthenticated ? 'subtle' : 'primary'}
                size="small"
                disabled={authState.isAuthenticated || authState.isAuthenticating}
                onClick={() => handleAuthenticate(index)}
                icon={authState.isAuthenticated ? <CheckmarkCircleRegular /> : undefined}
              >
                {authState.isAuthenticated
                  ? 'Authenticated'
                  : authState.isAuthenticating
                    ? 'Authenticating...'
                    : 'Sign In'}
              </Button>
            )}

            {status === 'completed' && (
              <Badge
                appearance="tint"
                icon={
                  <CheckmarkCircleRegular style={{ color: tokens.colorPaletteGreenForeground1 }} />
                }
                style={{ color: tokens.colorPaletteGreenForeground1 }}
              >
                Authenticated
              </Badge>
            )}
          </div>
        ))}
      </div>

      {status === 'completed' && (
        <Badge
          appearance="tint"
          size="large"
          className={styles.successBadge}
          icon={<CheckmarkCircleRegular />}
        >
          All services authenticated successfully
        </Badge>
      )}
    </div>
  );
};
