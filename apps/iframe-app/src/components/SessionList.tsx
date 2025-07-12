import React, { useState, useCallback, useMemo, memo } from 'react';
import { SessionMetadata } from '../utils/sessionManager';
import styles from './SessionList.module.css';

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

    const className = useMemo(
      () => `${styles.sessionItem} ${isActive ? styles.active : ''}`,
      [isActive]
    );

    return (
      <div className={className} onClick={handleClick}>
        <div className={styles.sessionContent}>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={handleEditChange}
              onKeyDown={onKeyDown}
              onBlur={onSaveEdit}
              onClick={handleEditClick}
              autoFocus
              className={styles.editInput}
            />
          ) : (
            <>
              <div className={styles.sessionName}>{session.name || 'Untitled Chat'}</div>
              {session.lastMessage && (
                <div className={styles.lastMessage}>{session.lastMessage}</div>
              )}
              <div className={styles.sessionTime}>
                {formatDate(session.updatedAt || Date.now())}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className={styles.sessionActions}>
            <button className={styles.actionBtn} onClick={handleStartEdit} title="Rename">
              ✏️
            </button>
            {safeSessions.length > 1 && (
              <button className={styles.actionBtn} onClick={handleDelete} title="Delete">
                🗑️
              </button>
            )}
          </div>
        )}
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
        <div className={styles.header}>
          <h3>Chats</h3>
          <button className={styles.newSessionBtn} onClick={onNewSession} title="New Chat">
            +
          </button>
        </div>

        <div className={styles.sessions}>
          {safeSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No chats yet</p>
              <button onClick={onNewSession}>Start a new chat</button>
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
      </div>
    );
  }
);
