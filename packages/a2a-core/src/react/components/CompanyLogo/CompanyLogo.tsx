import React from 'react';
import type { ChatTheme } from '../../types';
import styles from './CompanyLogo.module.css';

interface CompanyLogoProps {
  branding?: ChatTheme['branding'];
  className?: string;
}

export function CompanyLogo({ branding, className }: CompanyLogoProps) {
  if (!branding?.logoUrl) {
    return null;
  }

  const sizeClasses = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const sizeClass = sizeClasses[branding.logoSize || 'medium'];

  // Fallback styles if CSS modules aren't loaded
  const hasStyles = styles.logoContainer && styles.logo;

  const containerStyle: React.CSSProperties = hasStyles
    ? {}
    : {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height:
          branding.logoSize === 'small' ? '24px' : branding.logoSize === 'large' ? '48px' : '32px',
      };

  const imgStyle: React.CSSProperties = hasStyles
    ? {}
    : {
        display: 'block',
        height: '100%',
        width: 'auto',
        maxWidth:
          branding.logoSize === 'small'
            ? '120px'
            : branding.logoSize === 'large'
              ? '240px'
              : '160px',
        objectFit: 'contain' as const,
      };

  return (
    <div
      className={hasStyles ? `${styles.logoContainer} ${sizeClass} ${className || ''}` : className}
      style={containerStyle}
    >
      <img
        src={branding.logoUrl}
        alt="Company Logo"
        className={hasStyles ? styles.logo : undefined}
        style={imgStyle}
      />
    </div>
  );
}
