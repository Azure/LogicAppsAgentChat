/**
 * SyncStatus Component - Displays server sync status and controls
 */

import React from 'react';
import type { SyncStatus as SyncStatusType } from '../services/types';
import styles from './SyncStatus.module.css';

interface SyncStatusProps {
  syncStatus: SyncStatusType;
  onTriggerSync?: () => void;
  isEnabled: boolean;
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  syncStatus,
  onTriggerSync,
  isEnabled,
  className,
}) => {
  if (!isEnabled) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return '🔄';
      case 'idle':
        return '✓';
      case 'error':
        return '⚠️';
      case 'offline':
        return '🔌';
      default:
        return '•';
    }
  };

  const getStatusText = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'Syncing...';
      case 'idle':
        return syncStatus.lastSyncTime
          ? `Synced ${formatTimeAgo(syncStatus.lastSyncTime)}`
          : 'Synced';
      case 'error':
        return 'Sync error';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={`${styles.syncStatus} ${className || ''}`}>
      <div className={styles.statusIndicator}>
        <span
          className={`${styles.statusIcon} ${styles[syncStatus.status]}`}
          title={getStatusText()}
        >
          {getStatusIcon()}
        </span>
        <span className={styles.statusText}>{getStatusText()}</span>
      </div>

      {syncStatus.pendingChanges > 0 && (
        <div className={styles.pendingChanges}>{syncStatus.pendingChanges} pending</div>
      )}

      {onTriggerSync && syncStatus.status !== 'syncing' && syncStatus.status !== 'offline' && (
        <button
          className={styles.syncButton}
          onClick={onTriggerSync}
          title="Sync now"
          aria-label="Sync now"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      )}

      {syncStatus.error && <div className={styles.errorTooltip}>{syncStatus.error.message}</div>}
    </div>
  );
};

export default SyncStatus;
