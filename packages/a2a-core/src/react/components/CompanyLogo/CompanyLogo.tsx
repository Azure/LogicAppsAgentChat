import React from 'react';
import type { ChatTheme } from '../../types';

interface CompanyLogoProps {
  branding?: ChatTheme['branding'];
  className?: string;
}

export function CompanyLogo({ branding, className }: CompanyLogoProps) {
  if (!branding?.logoUrl) {
    return null;
  }

  const sizeClasses = {
    small: 'small',
    medium: 'medium',
    large: 'large',
  };

  const sizeClass = sizeClasses[branding.logoSize || 'medium'];

  return (
    <div className={`logoContainer ${sizeClass} ${className || ''}`}>
      <img src={branding.logoUrl} alt="Company Logo" className="logo" />
    </div>
  );
}
