import React, { useCallback } from 'react';
import { useChatHistory } from '../../hooks/useChatHistory';
import type { A2AClient } from '../../../client/a2a-client';
import type { Context } from '../../../types';
import styles from './ConversationList.module.css';

export interface ConversationListProps {
  client: A2AClient | null;
  onNewConversation?: () => void;
  className?: string;
}

export function ConversationList({ client, onNewConversation, className }: ConversationListProps) {
  const {
    currentContextId,
    activeContexts,
    archivedContexts,
    isLoadingContexts,
    createNewContext,
    switchContext,
    archiveContext,
    renameContext,
    getContextDisplayName,
  } = useChatHistory(client);

  // Debug logging
  console.log('[ConversationList] activeContexts:', activeContexts);
  console.log('[ConversationList] archivedContexts:', archivedContexts);
  console.log('[ConversationList] isLoadingContexts:', isLoadingContexts);

  const [showArchived, setShowArchived] = React.useState(false);
  const [editingContextId, setEditingContextId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleNewConversation = useCallback(() => {
    createNewContext();
    onNewConversation?.();
  }, [createNewContext, onNewConversation]);

  const handleContextClick = useCallback(
    (contextId: string) => {
      switchContext(contextId);
    },
    [switchContext]
  );

  const handleArchive = useCallback(
    async (e: React.MouseEvent, contextId: string) => {
      e.stopPropagation();
      await archiveContext(contextId);
    },
    [archiveContext]
  );

  const handleStartEdit = useCallback(
    (e: React.MouseEvent, context: Context) => {
      e.stopPropagation();
      setEditingContextId(context.id);
      setEditingName(context.name || getContextDisplayName(context));
    },
    [getContextDisplayName]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingContextId(null);
    setEditingName('');
  }, []);

  const handleSaveEdit = useCallback(
    async (contextId: string) => {
      if (editingName.trim()) {
        try {
          await renameContext(contextId, editingName.trim());
          handleCancelEdit();
        } catch (error) {
          // The optimistic update has already been reverted by the store
          console.error('Failed to rename conversation:', error);
          // Optionally, you could show a toast notification here
          // For now, we'll just revert the UI state
          handleCancelEdit();
        }
      } else {
        handleCancelEdit();
      }
    },
    [editingName, renameContext, handleCancelEdit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, contextId: string) => {
      if (e.key === 'Enter') {
        handleSaveEdit(contextId);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const renderContext = (context: Context) => {
    const isActive = context.id === currentContextId;
    const isEditing = context.id === editingContextId;
    const displayName = getContextDisplayName(context);

    return (
      <div
        key={context.id}
        className={`${styles.conversationItem} ${isActive ? styles.active : ''}`}
        onClick={() => handleContextClick(context.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleContextClick(context.id)}
      >
        {isEditing ? (
          <input
            type="text"
            className={styles.editInput}
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, context.id)}
            onBlur={() => handleSaveEdit(context.id)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <>
            <span className={styles.conversationName}>{displayName}</span>
            <div className={styles.conversationActions}>
              <button
                className={styles.actionButton}
                onClick={(e) => handleStartEdit(e, context)}
                title="Rename conversation"
                aria-label="Rename conversation"
              >
                ✏️
              </button>
              {!context.isArchived && (
                <button
                  className={styles.actionButton}
                  onClick={(e) => handleArchive(e, context.id)}
                  title="Archive conversation"
                  aria-label="Archive conversation"
                >
                  📁
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoadingContexts) {
    return (
      <div className={`${styles.conversationList} ${className || ''}`}>
        <div className={styles.header}>
          <h3>Conversations</h3>
        </div>
        <div className={styles.loading}>Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.conversationList} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Conversations</h3>
        <button
          className={styles.newButton}
          onClick={handleNewConversation}
          title="New conversation"
          aria-label="New conversation"
        >
          +
        </button>
      </div>

      <div className={styles.conversations}>
        {activeContexts.length === 0 && !showArchived && (
          <div className={styles.emptyState}>No conversations yet. Start a new one!</div>
        )}

        {activeContexts.map(renderContext)}

        {archivedContexts.length > 0 && (
          <>
            <button
              className={styles.toggleArchived}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? '▼' : '▶'} Archived ({archivedContexts.length})
            </button>

            {showArchived && (
              <div className={styles.archivedSection}>{archivedContexts.map(renderContext)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
