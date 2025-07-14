import React, { useState, useCallback, useMemo, memo } from 'react';
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
} from '@fluentui/react-components';
import { AddRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';
import { SessionMetadata } from '../utils/sessionManager';

const useStyles = makeStyles({
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
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
});

interface SessionListProps {
  sessions: SessionMetadata[];
  activeSessionId: string | null;
  onSessionClick: (sessionId: string) => void;
  onNewSession: () => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

// Memoized session item component to prevent unnecessary re-renders
interface SessionItemProps {
  session: SessionMetadata;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  safeSessions: SessionMetadata[];
  onSessionClick: (sessionId: string) => void;
  onStartEdit: (sessionId: string, currentName: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  formatDate: (timestamp: number) => string;
}

const SessionItem = memo(
  ({
    session,
    isActive,
    isEditing,
    editName,
    safeSessions,
    onSessionClick,
    onStartEdit,
    onDeleteSession,
    onEditNameChange,
    onSaveEdit,
    onKeyDown,
    formatDate,
  }: SessionItemProps) => {
    const styles = useStyles();

    const handleClick = useCallback(() => {
      onSessionClick(session.id);
    }, [onSessionClick, session.id]);

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

    return (
      <div className={styles.sessionItemWrapper}>
        <Card
          className={mergeClasses(styles.sessionItem, isActive && styles.sessionItemActive)}
          onClick={handleClick}
          appearance="subtle"
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
                  <Text className={styles.sessionName}>{session.name || 'Untitled Chat'}</Text>
                  {!isEditing && (
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
                        icon={<DeleteRegular />}
                        size="small"
                        onClick={handleDelete}
                        title="Delete"
                      />
                    </div>
                  )}
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

    return (
      <div className={styles.sessionList}>
        <div className={styles.sessions}>
          {safeSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Body1 className={styles.emptyStateText}>No chats yet</Body1>
              <Button appearance="primary" onClick={onNewSession}>
                Start a new chat
              </Button>
            </div>
          ) : (
            safeSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isEditing={editingSessionId === session.id}
                editName={editName}
                safeSessions={safeSessions}
                onSessionClick={onSessionClick}
                onStartEdit={handleStartEdit}
                onDeleteSession={onDeleteSession}
                onEditNameChange={handleEditNameChange}
                onSaveEdit={handleSaveEdit}
                onKeyDown={handleKeyDown}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
        <div className={styles.footer}>
          <Button
            appearance="primary"
            icon={<AddRegular fontSize={16} />}
            onClick={onNewSession}
            size="medium"
            title="New Chat"
            style={{ width: '100%' }}
          >
            New Chat
          </Button>
        </div>
      </div>
    );
  }
);
