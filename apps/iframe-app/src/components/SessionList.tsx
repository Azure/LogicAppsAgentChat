import React, { useState, useCallback, memo } from 'react';
import {
  Button,
  Card,
  Text,
  Caption1,
  Body1,
  Input,
  makeStyles,
  shorthands,
  tokens,
  mergeClasses,
  Tooltip,
  Spinner,
} from '@fluentui/react-components';
import { AddRegular, EditRegular, ArchiveRegular, InfoRegular } from '@fluentui/react-icons';
import { SessionMetadata } from '../utils/sessionManager';
import type { ChatTheme } from '@microsoft/a2achat-core/react';
import type { SyncStatus } from '../services/types';

const useStyles = makeStyles({
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
  header: {
    height: '60px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  logo: {
    height: '32px',
    width: 'auto',
    objectFit: 'contain' as const,
    maxWidth: '120px',
  },
  logoSmall: {
    height: '24px',
    maxWidth: '100px',
  },
  logoLarge: {
    height: '40px',
    maxWidth: '150px',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    paddingTop: `calc(${tokens.spacingVerticalM} + 8px)`,
    paddingBottom: `calc(${tokens.spacingVerticalM} + 8px)`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  buttonWrapper: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  sessions: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  sessionItem: {
    marginBottom: tokens.spacingVerticalS,
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    transition: 'all 0.2s ease',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1Hover),
    },
  },
  sessionItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    },
  },
  sessionItemArchived: {
    opacity: 0.6,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  sessionItemNotRunning: {
    ...shorthands.border('1px', 'solid', tokens.colorPaletteYellowBorder1),
  },
  sessionContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    flex: 1,
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  lastMessage: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionTime: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    fontSize: tokens.fontSizeBase100,
    ...shorthands.padding('2px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorPaletteYellowBackground1,
    color: tokens.colorPaletteYellowForeground1,
  },
  sessionActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  sessionActionsHidden: {
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  sessionItemWrapper: {
    ':hover .session-actions': {
      opacity: 1,
    },
  },
  editInput: {
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  emptyStateText: {
    color: tokens.colorNeutralForeground3,
  },
  syncIndicator: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    marginLeft: 'auto',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
  },
});

interface SessionListProps {
  sessions: SessionMetadata[];
  activeSessionId: string | null;
  onSessionClick: (sessionId: string) => void | Promise<void>;
  onNewSession: () => void | Promise<void>;
  onRenameSession: (sessionId: string, newName: string) => void | Promise<void>;
  onDeleteSession: (sessionId: string) => void | Promise<void>;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  themeColors?: ChatTheme['colors'];
  syncStatus?: SyncStatus;
  isInitialLoading?: boolean;
}

// Memoized session item component to prevent unnecessary re-renders
interface SessionItemProps {
  session: SessionMetadata;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSessionClick: (sessionId: string) => void;
  onStartEdit: (sessionId: string, currentName: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  formatDate: (timestamp: number) => string;
  themeColors?: ChatTheme['colors'];
}

const SessionItem = memo(
  ({
    session,
    isActive,
    isEditing,
    editName,
    onSessionClick,
    onStartEdit,
    onDeleteSession,
    onEditNameChange,
    onSaveEdit,
    onKeyDown,
    formatDate,
    themeColors,
  }: SessionItemProps) => {
    const styles = useStyles();

    const handleClick = useCallback(() => {
      onSessionClick(session.id);
    }, [onSessionClick, session.id]);

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartEdit(session.id, session.name || 'Untitled Chat');
      },
      [onStartEdit, session.id, session.name]
    );

    const handleStartEdit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartEdit(session.id, session.name || 'Untitled Chat');
      },
      [onStartEdit, session.id, session.name]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this chat?')) {
          onDeleteSession(session.id);
        }
      },
      [onDeleteSession, session.id]
    );

    const handleEditChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onEditNameChange(e.target.value);
      },
      [onEditNameChange]
    );

    const handleEditClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    // Apply theme colors to active session
    const activeStyle =
      isActive && themeColors
        ? {
            backgroundColor: themeColors.primary + '15',
            borderColor: themeColors.primary,
          }
        : {};

    const isArchived = session.isArchived || false;
    const isNotRunning = session.status && session.status !== 'Running';

    return (
      <div className={styles.sessionItemWrapper}>
        <Card
          className={mergeClasses(
            styles.sessionItem,
            isActive && styles.sessionItemActive,
            isArchived && styles.sessionItemArchived,
            isNotRunning && styles.sessionItemNotRunning
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          appearance="subtle"
          style={activeStyle}
        >
          <div className={styles.sessionContent}>
            {isEditing ? (
              <Input
                value={editName}
                onChange={handleEditChange}
                onKeyDown={onKeyDown}
                onBlur={onSaveEdit}
                onClick={handleEditClick}
                autoFocus
                className={styles.editInput}
                size="small"
              />
            ) : (
              <>
                <div className={styles.sessionHeader}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacingHorizontalXS,
                    }}
                  >
                    <Tooltip content="Double-click to rename" relationship="label">
                      <Text className={styles.sessionName}>{session.name || 'Untitled Chat'}</Text>
                    </Tooltip>
                    {isNotRunning && (
                      <Tooltip content={`Status: ${session.status}`} relationship="label">
                        <div className={styles.statusBadge}>
                          <InfoRegular fontSize={12} />
                          {session.status}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                  <div
                    className={mergeClasses(
                      styles.sessionActions,
                      styles.sessionActionsHidden,
                      'session-actions'
                    )}
                  >
                    <Button
                      appearance="subtle"
                      icon={<EditRegular />}
                      size="small"
                      onClick={handleStartEdit}
                      title="Rename"
                    />
                    <Button
                      appearance="subtle"
                      icon={<ArchiveRegular />}
                      size="small"
                      onClick={handleDelete}
                      title="Archive"
                    />
                  </div>
                </div>
                {session.lastMessage && (
                  <Caption1 className={styles.lastMessage}>{session.lastMessage}</Caption1>
                )}
                <Caption1 className={styles.sessionTime}>
                  {formatDate(session.updatedAt || Date.now())}
                </Caption1>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }
);

export const SessionList = memo(
  ({
    sessions,
    activeSessionId,
    onSessionClick,
    onNewSession,
    onRenameSession,
    onDeleteSession,
    logoUrl,
    logoSize = 'medium',
    themeColors,
    syncStatus,
    isInitialLoading = false,
  }: SessionListProps) => {
    const styles = useStyles();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleStartEdit = useCallback((sessionId: string, currentName: string) => {
      setEditingSessionId(sessionId);
      setEditName(currentName);
    }, []);

    const handleSaveEdit = useCallback(() => {
      if (editingSessionId && editName.trim()) {
        onRenameSession(editingSessionId, editName.trim());
        setEditingSessionId(null);
        setEditName('');
      }
    }, [editingSessionId, editName, onRenameSession]);

    const handleCancelEdit = useCallback(() => {
      setEditingSessionId(null);
      setEditName('');
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSaveEdit();
        } else if (e.key === 'Escape') {
          handleCancelEdit();
        }
      },
      [handleSaveEdit, handleCancelEdit]
    );

    const handleEditNameChange = useCallback((name: string) => {
      setEditName(name);
    }, []);

    // Memoize the format date function to avoid recreating it
    const formatDate = useCallback((timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    }, []);

    // Ensure sessions is an array
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    // Debug logging
    console.log(
      '[SessionList] Rendering with sessions:',
      safeSessions.length,
      safeSessions.map((s) => ({
        id: s.id,
        name: s.name,
      }))
    );

    // Apply theme colors if provided
    const themeStyle = themeColors
      ? ({
          '--theme-primary': themeColors.primary,
          '--theme-primary-hover': themeColors.primary + 'dd',
        } as React.CSSProperties)
      : {};

    return (
      <div className={styles.sessionList} style={themeStyle}>
        <div className={styles.header}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Company Logo"
              className={mergeClasses(
                styles.logo,
                logoSize === 'small' && styles.logoSmall,
                logoSize === 'large' && styles.logoLarge
              )}
            />
          )}
          <h3 className={styles.title}>Chats</h3>
          {syncStatus && syncStatus.status === 'syncing' && (
            <div className={styles.syncIndicator}>
              <Spinner size="tiny" />
              <span>Syncing</span>
            </div>
          )}
        </div>
        <div className={styles.sessions}>
          {isInitialLoading ? (
            <div className={styles.emptyState}>
              <Spinner size="medium" />
              <Caption1 className={styles.emptyStateText} style={{ marginTop: '12px' }}>
                Loading conversations...
              </Caption1>
            </div>
          ) : safeSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Body1 className={styles.emptyStateText}>No chats yet</Body1>
            </div>
          ) : (
            safeSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isEditing={editingSessionId === session.id}
                editName={editName}
                onSessionClick={onSessionClick}
                onStartEdit={handleStartEdit}
                onDeleteSession={onDeleteSession}
                onEditNameChange={handleEditNameChange}
                onSaveEdit={handleSaveEdit}
                onKeyDown={handleKeyDown}
                formatDate={formatDate}
                themeColors={themeColors}
              />
            ))
          )}
        </div>
        <div className={styles.footer}>
          <div className={styles.buttonWrapper}>
            <Button
              appearance="primary"
              icon={<AddRegular fontSize={16} />}
              onClick={onNewSession}
              size="medium"
              title="New Chat"
              style={{
                width: '100%',
                minHeight: '40px',
                height: '40px',
                ...(themeColors && {
                  backgroundColor: themeColors.primary,
                  color: themeColors.primaryText || '#fff',
                  border: 'none',
                }),
              }}
              onMouseEnter={(e) => {
                if (themeColors) {
                  e.currentTarget.style.backgroundColor = themeColors.primary + 'dd';
                }
              }}
              onMouseLeave={(e) => {
                if (themeColors) {
                  e.currentTarget.style.backgroundColor = themeColors.primary;
                }
              }}
            >
              New Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
